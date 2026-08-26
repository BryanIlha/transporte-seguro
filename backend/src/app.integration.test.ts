import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import argon2 from "argon2";
import { and, eq } from "drizzle-orm";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { buildApp } from "./app.js";
import { assertDatabaseIdentity, createDatabase, type Database } from "./db/client.js";
import { adminUsers, vehicles } from "./db/schema.js";
import { FileStore } from "./storage/file-store.js";

const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("API do catálogo com Postgres", () => {
  let db: Database;
  let client: { end: (options?: { timeout: number }) => Promise<void> };
  let app: ReturnType<typeof buildApp>;
  let adminId = "";
  let root = "";

  beforeAll(async () => {
    const database = createDatabase();
    db = database.db;
    client = database.client;
    await assertDatabaseIdentity(db);
    root = await mkdtemp(join(tmpdir(), "transporte-seguro-api-"));
    app = buildApp({ db, fileStore: new FileStore(root) });
    const passwordHash = await argon2.hash("correct-horse-battery-staple", {
      type: argon2.argon2id,
    });
    const [admin] = await db
      .insert(adminUsers)
      .values({ email: "integration@example.com", passwordHash })
      .returning({ id: adminUsers.id });
    adminId = admin.id;
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (db && adminId) await db.delete(adminUsers).where(eq(adminUsers.id, adminId));
    if (root) await rm(root, { recursive: true, force: true });
    if (client) await client.end({ timeout: 5 });
  });

  it("faz login, publica e exclui um veículo", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/v1/auth/session",
      payload: { email: "integration@example.com", password: "correct-horse-battery-staple" },
    });
    expect(login.statusCode).toBe(200);
    const cookie = String(login.headers["set-cookie"]).split(";")[0];
    const created = await app.inject({
      method: "POST",
      url: "/v1/admin/vehicles",
      cookies: { ts_admin_session: cookie.split("=")[1] },
      payload: {
        title: "Van de integração",
        slug: "van-de-integracao",
        category: "Fretamento",
        operationMode: "RENT",
        availability: "AVAILABLE",
        airConditioned: true,
        description: "Teste",
        features: [],
        isFeatured: false,
        sortOrder: 0,
        publishedAt: new Date().toISOString(),
      },
    });
    expect(created.statusCode).toBe(201);
    const vehicleId = created.json().vehicle.id as string;
    const catalog = await app.inject({ method: "GET", url: "/v1/catalog/vehicles" });
    expect(
      catalog.json().vehicles.some((vehicle: { id: string }) => vehicle.id === vehicleId),
    ).toBe(true);
    const deleted = await app.inject({
      method: "DELETE",
      url: `/v1/admin/vehicles/${vehicleId}`,
      cookies: { ts_admin_session: cookie.split("=")[1] },
      payload: { confirmSlug: "van-de-integracao" },
    });
    expect(deleted.statusCode).toBe(204);
    const [row] = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.slug, "van-de-integracao")));
    expect(row).toBeUndefined();
  });
});
