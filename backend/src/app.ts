import crypto from "node:crypto";
import { basename, extname } from "node:path";
import argon2 from "argon2";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { and, desc, eq, gt, isNotNull, or, sql } from "drizzle-orm";
import { fileTypeFromBuffer } from "file-type";
import {
  loginInputSchema,
  plateLookupInputSchema,
  vehicleInputSchema,
} from "@transporte-seguro/catalog-contracts";
import { assertDatabaseIdentity, type Database } from "./db/client.js";
import {
  adminSessions,
  adminUsers,
  apiPlacasLookups,
  vehicleDocuments,
  vehicleImages,
  vehicles,
  type VehicleDocument,
} from "./db/schema.js";
import {
  isValidPlate,
  normalizePlate,
  queryApiPlacas,
  type ApiPlacasSnapshot,
  type ApiPlacasStatus,
} from "./enrichment/apiplacas.js";
import { FileStore } from "./storage/file-store.js";

const SESSION_COOKIE = "ts_admin_session";
const SESSION_HOURS = 12;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const webOrigin = process.env.WEB_ORIGIN;
const sessionSecret = process.env.SESSION_SECRET;

type AdminRequest = FastifyRequest & { adminId?: string };

function now() {
  return new Date();
}

function iso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

function tokenHash(token: string) {
  return crypto
    .createHmac("sha256", sessionSecret ?? "missing-session-secret")
    .update(token)
    .digest("hex");
}

function normalizeOptional(value: unknown) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeBody(body: unknown) {
  const parsed = vehicleInputSchema.parse(body);
  return {
    ...parsed,
    brand: normalizeOptional(parsed.brand),
    model: normalizeOptional(parsed.model),
    plate: normalizeOptional(parsed.plate)?.toUpperCase() ?? null,
    renavam: normalizeOptional(parsed.renavam),
    chassi: normalizeOptional(parsed.chassi)?.toUpperCase() ?? null,
    location: normalizeOptional(parsed.location),
    manufacturedYear: parsed.manufacturedYear ?? null,
    passengerCapacity: parsed.passengerCapacity ?? null,
    mileageKm: parsed.mileageKm ?? null,
    priceCents: parsed.priceCents ?? null,
    publishedAt: parsed.publishedAt ? new Date(parsed.publishedAt) : null,
  };
}

function numberFromCrlv(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function crlvVehiclePatch(data: Record<string, unknown>) {
  const plate = normalizePlate(data.placa);
  const renavam = normalizeOptional(data.renavam)?.replace(/\D/g, "") || null;
  const chassi = normalizeOptional(data.chassi)?.toUpperCase() ?? null;
  const model = normalizeOptional(data.marca_modelo_versao);
  const manufacturedYear = numberFromCrlv(data.ano_fabricacao);
  const passengerCapacity = numberFromCrlv(data.lotacao_pessoas);
  return {
    ...(plate ? { plate } : {}),
    ...(renavam ? { renavam } : {}),
    ...(chassi ? { chassi } : {}),
    ...(model ? { model } : {}),
    ...(manufacturedYear ? { manufacturedYear } : {}),
    ...(passengerCapacity ? { passengerCapacity } : {}),
  };
}

function serializeImage(image: typeof vehicleImages.$inferSelect, baseUrl = "/api") {
  return {
    id: image.id,
    vehicleId: image.vehicleId,
    url: `${baseUrl}/v1/catalog/images/${image.id}`,
    altText: image.altText,
    sortOrder: image.sortOrder,
    createdAt: image.createdAt.toISOString(),
  };
}

function serializeDocument(document: VehicleDocument) {
  return {
    id: document.id,
    vehicleId: document.vehicleId,
    type: "CRLV" as const,
    filename: document.filename,
    mimeType: "application/pdf" as const,
    sizeBytes: document.sizeBytes,
    sha256: document.sha256,
    fingerprint: document.fingerprint,
    pages: document.pages,
    extractorVersion: document.extractorVersion,
    extractionStatus: document.extractionStatus,
    extractedPlate: document.extractedPlate,
    extractedRenavam: document.extractedRenavam,
    extractedChassi: document.extractedChassi,
    extractedData: document.extractedData,
    confirmedData: document.confirmedData,
    extractionText: document.extractionText,
    extractionLayout: document.extractionLayout,
    extractionError: document.extractionError,
    current: document.current,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export function serializeVehicle(
  vehicle: typeof vehicles.$inferSelect,
  images: Array<typeof vehicleImages.$inferSelect>,
  documents?: Array<typeof vehicleDocuments.$inferSelect>,
  options: { includePlateLookup?: boolean } = {},
) {
  const plateLookup = options.includePlateLookup ? serializePlateLookup(vehicle) : undefined;
  return {
    id: vehicle.id,
    slug: vehicle.slug,
    title: vehicle.title,
    category: vehicle.category,
    operationMode: vehicle.operationMode,
    availability: vehicle.availability,
    brand: vehicle.brand,
    model: vehicle.model,
    manufacturedYear: vehicle.manufacturedYear,
    passengerCapacity: vehicle.passengerCapacity,
    mileageKm: vehicle.mileageKm,
    // Documents are loaded only by authenticated admin routes. Keep the nullable
    // response contract without exposing vehicle identifiers in the public catalog.
    plate: documents ? vehicle.plate : null,
    renavam: documents ? vehicle.renavam : null,
    chassi: documents ? vehicle.chassi : null,
    airConditioned: vehicle.airConditioned,
    location: vehicle.location,
    priceCents: vehicle.priceCents,
    currency: "BRL" as const,
    description: vehicle.description,
    features: Array.isArray(vehicle.features) ? vehicle.features : [],
    isFeatured: vehicle.isFeatured,
    sortOrder: vehicle.sortOrder,
    publishedAt: iso(vehicle.publishedAt),
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
    images: images.sort((a, b) => a.sortOrder - b.sortOrder).map((image) => serializeImage(image)),
    ...(documents ? { documents: documents.map(serializeDocument) } : {}),
    ...(plateLookup ? { plateLookup } : {}),
  };
}

function serializePlateLookup(vehicle: typeof vehicles.$inferSelect) {
  if (!vehicle.apiPlacasStatus && !vehicle.apiPlacasCheckedAt) return null;
  const status = (vehicle.apiPlacasStatus as ApiPlacasStatus | null) ?? "ERROR";
  return {
    status,
    plate: vehicle.plate,
    cacheHit: false,
    providerHttpStatus: null,
    message: null,
    snapshot:
      status === "SUCCESS"
        ? {
            brand: vehicle.apiPlacasBrand,
            model: vehicle.apiPlacasModel,
            makeModel: vehicle.apiPlacasMakeModel,
            year: vehicle.apiPlacasYear,
            modelYear: vehicle.apiPlacasModelYear,
            color: vehicle.apiPlacasColor,
            situation: vehicle.apiPlacasSituation,
            state: vehicle.apiPlacasUf,
            origin: vehicle.apiPlacasOrigin,
            logoUrl: vehicle.apiPlacasLogoUrl,
          }
        : null,
    checkedAt: iso(vehicle.apiPlacasCheckedAt),
    applied: true,
  };
}

async function loadVehicle(db: Database, id: string, includeDocuments = false) {
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
  if (!vehicle) return null;
  const images = await db.select().from(vehicleImages).where(eq(vehicleImages.vehicleId, id));
  const documents = includeDocuments
    ? await db
        .select()
        .from(vehicleDocuments)
        .where(eq(vehicleDocuments.vehicleId, id))
        .orderBy(desc(vehicleDocuments.createdAt))
    : undefined;
  return serializeVehicle(vehicle, images, documents);
}

async function loadVehicleBySlug(db: Database, slug: string) {
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.slug, slug));
  if (!vehicle || !vehicle.publishedAt) return null;
  const images = await db
    .select()
    .from(vehicleImages)
    .where(eq(vehicleImages.vehicleId, vehicle.id));
  return serializeVehicle(vehicle, images);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Operação não concluída.";
}

function fieldValue(fields: Record<string, unknown>, name: string) {
  const field = fields[name] as { value?: unknown } | unknown;
  if (field && typeof field === "object" && "value" in field)
    return String((field as { value: unknown }).value ?? "");
  return String(field ?? "");
}

async function requireAdmin(request: AdminRequest, reply: FastifyReply) {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) return reply.code(401).send({ error: "Não autenticado." });
  const [session] = await request.server.db
    .select({ adminId: adminSessions.adminId })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminId))
    .where(
      and(
        eq(adminSessions.tokenHash, tokenHash(token)),
        gt(adminSessions.expiresAt, now()),
        eq(adminUsers.isActive, true),
      ),
    );
  if (!session) return reply.code(401).send({ error: "Sessão expirada." });
  request.adminId = session.adminId;
}

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
    fileStore: FileStore;
  }
}

export function buildApp(options: { db: Database; fileStore?: FileStore }): FastifyInstance {
  if (!sessionSecret) throw new Error("SESSION_SECRET não configurada.");
  const app = Fastify({ logger: true, bodyLimit: 12 * 1024 * 1024 });
  app.decorate("db", options.db);
  app.decorate("fileStore", options.fileStore ?? new FileStore());

  app.register(cookie);
  app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 20 } });
  app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

  app.addHook("onRequest", async (request, reply) => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
      const origin = request.headers.origin;
      if (webOrigin && origin && origin !== webOrigin) {
        return reply.code(403).send({ error: "Origem não autorizada." });
      }
    }
  });

  app.get("/health", async (_request, reply) => {
    try {
      await assertDatabaseIdentity(app.db);
      await app.fileStore.init();
      return { status: "ok", project: "transporte-seguro" };
    } catch (error) {
      return reply.code(503).send({ status: "error", error: errorMessage(error) });
    }
  });

  app.post(
    "/v1/auth/session",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = loginInputSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: "E-mail ou senha inválidos." });
      const email = parsed.data.email.trim().toLowerCase();
      const [admin] = await app.db.select().from(adminUsers).where(eq(adminUsers.email, email));
      if (
        !admin ||
        !admin.isActive ||
        !(await argon2.verify(admin.passwordHash, parsed.data.password))
      ) {
        return reply.code(401).send({ error: "E-mail ou senha inválidos." });
      }
      const token = crypto.randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
      await app.db
        .insert(adminSessions)
        .values({ adminId: admin.id, tokenHash: tokenHash(token), expiresAt });
      await app.db
        .update(adminUsers)
        .set({ lastLoginAt: now(), updatedAt: now() })
        .where(eq(adminUsers.id, admin.id));
      reply.setCookie(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_HOURS * 60 * 60,
      });
      return { admin: { id: admin.id, email: admin.email } };
    },
  );

  app.delete("/v1/auth/session", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token)
      await app.db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash(token)));
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.code(204).send();
  });

  app.get("/v1/auth/me", { preHandler: requireAdmin }, async (request: AdminRequest, reply) => {
    const [admin] = await app.db
      .select({ id: adminUsers.id, email: adminUsers.email })
      .from(adminUsers)
      .where(eq(adminUsers.id, request.adminId!));
    if (!admin) return reply.code(401).send({ error: "Sessão expirada." });
    return { admin };
  });

  app.get("/v1/catalog/vehicles", async () => {
    const rows = await app.db
      .select()
      .from(vehicles)
      .where(isNotNull(vehicles.publishedAt))
      .orderBy(desc(vehicles.isFeatured), vehicles.sortOrder, desc(vehicles.publishedAt));
    const result = [];
    for (const vehicle of rows) {
      const images = await app.db
        .select()
        .from(vehicleImages)
        .where(eq(vehicleImages.vehicleId, vehicle.id));
      result.push(serializeVehicle(vehicle, images));
    }
    return { vehicles: result };
  });

  app.get("/v1/catalog/vehicles/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const vehicle = await loadVehicleBySlug(app.db, slug);
    if (!vehicle) return reply.code(404).send({ error: "Veículo não encontrado." });
    return { vehicle };
  });

  app.get("/v1/catalog/images/:imageId", async (request, reply) => {
    const { imageId } = request.params as { imageId: string };
    const [image] = await app.db.select().from(vehicleImages).where(eq(vehicleImages.id, imageId));
    if (!image) return reply.code(404).send({ error: "Imagem não encontrada." });
    reply.header("Cache-Control", "public, max-age=3600").type(image.mimeType);
    return reply.send(app.fileStore.readImage(image.vehicleId, image.storageName));
  });

  app.get("/v1/admin/vehicles", { preHandler: requireAdmin }, async () => {
    const rows = await app.db.select().from(vehicles).orderBy(desc(vehicles.updatedAt));
    const result = [];
    for (const vehicle of rows) {
      const images = await app.db
        .select()
        .from(vehicleImages)
        .where(eq(vehicleImages.vehicleId, vehicle.id));
      const documents = await app.db
        .select()
        .from(vehicleDocuments)
        .where(eq(vehicleDocuments.vehicleId, vehicle.id))
        .orderBy(desc(vehicleDocuments.createdAt));
      result.push(serializeVehicle(vehicle, images, documents, { includePlateLookup: true }));
    }
    return { vehicles: result };
  });

  app.post(
    "/v1/admin/vehicles/lookup-plate",
    { preHandler: requireAdmin, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = plateLookupInputSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: "Placa inválida." });
      const plate = normalizePlate(parsed.data.plate);
      if (!plate) return reply.code(400).send({ error: "Informe a placa para consultar." });

      let result: {
        status: ApiPlacasStatus;
        plate: string;
        cacheHit: boolean;
        providerHttpStatus: number | null;
        message: string | null;
        snapshot: ApiPlacasSnapshot | null;
        checkedAt: string;
      };

      const [cached] = parsed.data.refresh
        ? []
        : await app.db.select().from(apiPlacasLookups).where(eq(apiPlacasLookups.plateKey, plate));
      if (cached) {
        result = {
          status: cached.status as ApiPlacasStatus,
          plate: cached.plateKey,
          cacheHit: true,
          providerHttpStatus: cached.providerHttpStatus,
          message: cached.providerMessage,
          snapshot: cached.status === "SUCCESS" ? (cached.snapshot as ApiPlacasSnapshot) : null,
          checkedAt: cached.checkedAt.toISOString(),
        };
      } else {
        try {
          const fresh = await queryApiPlacas(parsed.data.plate);
          result = { ...fresh, cacheHit: false };
          if (["SUCCESS", "INVALID_PLATE", "NOT_FOUND"].includes(fresh.status)) {
            await app.db
              .insert(apiPlacasLookups)
              .values({
                plateKey: fresh.plate,
                plateQueried: parsed.data.plate,
                status: fresh.status,
                providerHttpStatus: fresh.providerHttpStatus,
                providerMessage: fresh.message,
                snapshot: fresh.snapshot ?? {},
                rawPayload: fresh.rawPayload,
                checkedAt: new Date(fresh.checkedAt),
              })
              .onConflictDoUpdate({
                target: apiPlacasLookups.plateKey,
                set: {
                  plateQueried: parsed.data.plate,
                  status: fresh.status,
                  providerHttpStatus: fresh.providerHttpStatus,
                  providerMessage: fresh.message,
                  snapshot: fresh.snapshot ?? {},
                  rawPayload: fresh.rawPayload,
                  checkedAt: new Date(fresh.checkedAt),
                },
              });
          }
        } catch (error) {
          return reply.code(503).send({ error: errorMessage(error) });
        }
      }

      let applied = false;
      if (parsed.data.vehicleId && isValidPlate(plate)) {
        const [vehicle] = await app.db
          .select({ id: vehicles.id, plate: vehicles.plate })
          .from(vehicles)
          .where(eq(vehicles.id, parsed.data.vehicleId));
        if (!vehicle) return reply.code(404).send({ error: "Veículo não encontrado." });
        if (normalizePlate(vehicle.plate) === plate) {
          const snapshot = result.snapshot;
          await app.db
            .update(vehicles)
            .set({
              apiPlacasStatus: result.status,
              apiPlacasBrand: snapshot?.brand ?? null,
              apiPlacasModel: snapshot?.model ?? null,
              apiPlacasMakeModel: snapshot?.makeModel ?? null,
              apiPlacasYear: snapshot?.year ?? null,
              apiPlacasModelYear: snapshot?.modelYear ?? null,
              apiPlacasColor: snapshot?.color ?? null,
              apiPlacasSituation: snapshot?.situation ?? null,
              apiPlacasUf: snapshot?.state ?? null,
              apiPlacasOrigin: snapshot?.origin ?? null,
              apiPlacasLogoUrl: snapshot?.logoUrl ?? null,
              apiPlacasCheckedAt: new Date(result.checkedAt),
              updatedAt: now(),
            })
            .where(eq(vehicles.id, vehicle.id));
          applied = true;
        }
      }

      return {
        lookup: {
          status: result.status,
          plate: result.plate,
          cacheHit: result.cacheHit,
          providerHttpStatus: result.providerHttpStatus,
          message: result.message,
          snapshot: result.snapshot,
          checkedAt: result.checkedAt,
          applied,
        },
      };
    },
  );

  app.post("/v1/admin/vehicles", { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const data = normalizeBody(request.body);
      const [created] = await app.db.insert(vehicles).values(data).returning({ id: vehicles.id });
      return reply.code(201).send({ vehicle: await loadVehicle(app.db, created.id, true) });
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.patch("/v1/admin/vehicles/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const data = normalizeBody(request.body);
      const [updated] = await app.db
        .update(vehicles)
        .set({ ...data, updatedAt: now() })
        .where(eq(vehicles.id, id))
        .returning({ id: vehicles.id });
      if (!updated) return reply.code(404).send({ error: "Veículo não encontrado." });
      return { vehicle: await loadVehicle(app.db, updated.id, true) };
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.delete("/v1/admin/vehicles/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { confirmSlug } = (request.body ?? {}) as { confirmSlug?: string };
    const [vehicle] = await app.db.select().from(vehicles).where(eq(vehicles.id, id));
    if (!vehicle) return reply.code(404).send({ error: "Veículo não encontrado." });
    if (confirmSlug !== vehicle.slug)
      return reply.code(400).send({ error: "Confirmação inválida." });
    const quarantine = await app.fileStore.quarantineVehicle(id);
    try {
      await app.db.delete(vehicles).where(eq(vehicles.id, id));
      await app.fileStore.purgeQuarantine(quarantine);
      return reply.code(204).send();
    } catch (error) {
      return reply.code(500).send({ error: errorMessage(error) });
    }
  });

  app.post(
    "/v1/admin/vehicles/:id/images",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const [vehicle] = await app.db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(eq(vehicles.id, id));
      if (!vehicle) return reply.code(404).send({ error: "Veículo não encontrado." });
      const parts = request.parts();
      let fileBuffer: Buffer | null = null;
      let filename = "image";
      let mime = "";
      const fields: Record<string, unknown> = {};
      for await (const part of parts) {
        if (part.type === "file") {
          filename = part.filename;
          mime = part.mimetype;
          fileBuffer = await part.toBuffer();
        } else fields[part.fieldname] = part.value;
      }
      if (!fileBuffer) return reply.code(400).send({ error: "Imagem não enviada." });
      const detected = await fileTypeFromBuffer(fileBuffer);
      if (!detected || !["image/jpeg", "image/png", "image/webp"].includes(detected.mime))
        return reply.code(400).send({ error: "Formato de imagem inválido." });
      const extension = detected.ext === "jpeg" ? "jpg" : detected.ext;
      const storageName = `${crypto.randomUUID()}.${extension}`;
      await app.fileStore.saveImage(id, storageName, fileBuffer);
      try {
        const [image] = await app.db
          .insert(vehicleImages)
          .values({
            vehicleId: id,
            storageName,
            mimeType: detected.mime,
            sizeBytes: fileBuffer.length,
            altText: fieldValue(fields, "altText") || filename,
            sortOrder: Number(fieldValue(fields, "sortOrder") || 0),
          })
          .returning();
        return reply.code(201).send({ image: serializeImage(image) });
      } catch (error) {
        await app.fileStore.removeImage(id, storageName);
        return reply.code(400).send({ error: errorMessage(error) });
      }
    },
  );

  app.delete("/v1/admin/images/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [image] = await app.db.select().from(vehicleImages).where(eq(vehicleImages.id, id));
    if (!image) return reply.code(404).send({ error: "Imagem não encontrada." });
    await app.db.delete(vehicleImages).where(eq(vehicleImages.id, id));
    await app.fileStore.removeImage(image.vehicleId, image.storageName);
    return reply.code(204).send();
  });

  app.patch("/v1/admin/images/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { sortOrder?: number; altText?: string };
    const [image] = await app.db
      .update(vehicleImages)
      .set({ sortOrder: body.sortOrder, altText: body.altText })
      .where(eq(vehicleImages.id, id))
      .returning();
    if (!image) return reply.code(404).send({ error: "Imagem não encontrada." });
    return { image: serializeImage(image) };
  });

  app.post(
    "/v1/admin/vehicles/:id/documents/crlv",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const [vehicle] = await app.db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(eq(vehicles.id, id));
      if (!vehicle) return reply.code(404).send({ error: "Veículo não encontrado." });
      const parts = request.parts();
      let fileBuffer: Buffer | null = null;
      let filename = "crlv.pdf";
      const fields: Record<string, unknown> = {};
      for await (const part of parts) {
        if (part.type === "file") {
          filename = part.filename;
          fileBuffer = await part.toBuffer();
        } else fields[part.fieldname] = part.value;
      }
      const detectedPdf = fileBuffer ? await fileTypeFromBuffer(fileBuffer) : null;
      if (
        !fileBuffer ||
        fileBuffer.subarray(0, 5).toString() !== "%PDF-" ||
        detectedPdf?.mime !== "application/pdf"
      )
        return reply.code(400).send({ error: "O CRLV precisa ser um PDF válido." });
      const hash = fieldValue(fields, "sha256").toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(hash))
        return reply.code(400).send({ error: "Hash do CRLV inválido." });
      const computedHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      if (computedHash !== hash)
        return reply
          .code(400)
          .send({ error: "O hash do CRLV não corresponde ao arquivo enviado." });
      const fingerprint = normalizeOptional(fieldValue(fields, "fingerprint"));
      const [duplicateHash] = await app.db
        .select({ id: vehicleDocuments.id })
        .from(vehicleDocuments)
        .where(eq(vehicleDocuments.sha256, hash));
      const [duplicateFingerprint] = fingerprint
        ? await app.db
            .select({ id: vehicleDocuments.id })
            .from(vehicleDocuments)
            .where(eq(vehicleDocuments.fingerprint, fingerprint))
        : [];
      if (duplicateHash || duplicateFingerprint)
        return reply.code(409).send({ error: "Este CRLV já foi importado anteriormente." });
      let metadata: Record<string, unknown> = {};
      let confirmedData: Record<string, unknown> = {};
      try {
        metadata = JSON.parse(fieldValue(fields, "metadata") || "{}");
      } catch {
        return reply.code(400).send({ error: "Metadados do CRLV inválidos." });
      }
      try {
        confirmedData = JSON.parse(fieldValue(fields, "confirmedData") || "{}");
      } catch {
        return reply.code(400).send({ error: "Dados confirmados do CRLV inválidos." });
      }
      const documentId = crypto.randomUUID();
      const storageName = `${documentId}.pdf`;
      await app.fileStore.saveDocument(id, storageName, fileBuffer);
      try {
        const [document] = await app.db.transaction(async (transaction) => {
          await transaction
            .update(vehicleDocuments)
            .set({ current: false, updatedAt: now() })
            .where(and(eq(vehicleDocuments.vehicleId, id), eq(vehicleDocuments.type, "CRLV")));
          const patch = crlvVehiclePatch(confirmedData);
          if (Object.keys(patch).length > 0) {
            await transaction
              .update(vehicles)
              .set({ ...patch, updatedAt: now() })
              .where(eq(vehicles.id, id));
          }
          return transaction
            .insert(vehicleDocuments)
            .values({
              id: documentId,
              vehicleId: id,
              filename: basename(filename) || "crlv.pdf",
              storageName,
              sizeBytes: fileBuffer.length,
              sha256: hash,
              fingerprint,
              pages: Number(fieldValue(fields, "pages") || 0),
              extractorVersion: fieldValue(fields, "extractorVersion") || "crlv-ts-v1",
              extractionStatus: fieldValue(fields, "extractionStatus") || "REVISAR",
              extractedPlate: normalizeOptional(metadata.placa),
              extractedRenavam: normalizeOptional(metadata.renavam),
              extractedChassi: normalizeOptional(metadata.chassi),
              extractedData: metadata,
              confirmedData,
              extractionText: fieldValue(fields, "extractionText"),
              extractionLayout: fieldValue(fields, "extractionLayout"),
              extractionError: normalizeOptional(fieldValue(fields, "extractionError")),
              current: true,
            })
            .returning();
        });
        return reply.code(201).send({ document: serializeDocument(document) });
      } catch (error) {
        await app.fileStore.removeDocument(id, storageName).catch(() => undefined);
        return reply.code(400).send({ error: errorMessage(error) });
      }
    },
  );

  app.get(
    "/v1/admin/documents/:id/download",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const [document] = await app.db
        .select()
        .from(vehicleDocuments)
        .where(eq(vehicleDocuments.id, id));
      if (!document) return reply.code(404).send({ error: "Documento não encontrado." });
      reply
        .header(
          "Content-Disposition",
          `attachment; filename="${basename(document.filename).replaceAll('"', "")}"`,
        )
        .type("application/pdf");
      return reply.send(app.fileStore.readDocument(document.vehicleId, document.storageName));
    },
  );

  app.delete("/v1/admin/documents/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [document] = await app.db
      .select()
      .from(vehicleDocuments)
      .where(eq(vehicleDocuments.id, id));
    if (!document) return reply.code(404).send({ error: "Documento não encontrado." });
    await app.db.delete(vehicleDocuments).where(eq(vehicleDocuments.id, id));
    await app.fileStore
      .removeDocument(document.vehicleId, document.storageName)
      .catch(() => undefined);
    return reply.code(204).send();
  });

  return app;
}
