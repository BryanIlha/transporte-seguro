import { Link, createFileRoute } from "@tanstack/react-router";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  FileText,
  ImagePlus,
  Info,
  Loader2,
  LogOut,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import logo from "@/assets/01transportes-logo.svg";
import { applyCrlvFields } from "@/lib/crlv-vehicle-fields";
import {
  availabilityLabel,
  operationModeLabel,
  type Availability,
  type CatalogPlateLookup,
  type CatalogVehicle,
  type CatalogVehicleDocument,
  type CatalogVehicleImage,
  type OperationMode,
} from "@/lib/catalog";
import {
  getCrlvDocumentFingerprint,
  normalizeCrlvPlate,
  type CrlvParseResult,
} from "@/lib/crlv-parser";
import {
  createVehicle,
  deleteDocument,
  deleteImage,
  deleteVehicle as deleteVehicleApi,
  getAdminSession,
  listAdminVehicles,
  login,
  logout,
  lookupVehiclePlate,
  type AdminSession,
  updateVehicle,
  uploadCrlv as uploadCrlvApi,
  uploadImage,
} from "@/lib/catalog-api";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Administrar catálogo — 01 Transportes" }],
  }),
});

type CatalogVehicleWithImages = CatalogVehicle & {
  catalog_vehicle_images: CatalogVehicleImage[];
  catalog_vehicle_documents?: CatalogVehicleDocument[];
};

type VehicleForm = {
  id: string | null;
  title: string;
  slug: string;
  category: string;
  operationMode: OperationMode;
  availability: Availability;
  brand: string;
  model: string;
  plate: string;
  renavam: string;
  chassi: string;
  manufacturedYear: string;
  passengerCapacity: string;
  mileageKm: string;
  airConditioned: boolean;
  location: string;
  price: string;
  description: string;
  features: string;
  isFeatured: boolean;
  sortOrder: string;
  isPublished: boolean;
  publishedAt: string | null;
};

const emptyVehicleForm = (): VehicleForm => ({
  id: null,
  title: "",
  slug: "",
  category: "",
  operationMode: "RENT",
  availability: "ON_REQUEST",
  brand: "",
  model: "",
  plate: "",
  renavam: "",
  chassi: "",
  manufacturedYear: "",
  passengerCapacity: "",
  mileageKm: "",
  airConditioned: true,
  location: "",
  price: "",
  description: "",
  features: "",
  isFeatured: false,
  sortOrder: "0",
  isPublished: false,
  publishedAt: null,
});

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function formFromVehicle(vehicle: CatalogVehicle): VehicleForm {
  return {
    id: vehicle.id,
    title: vehicle.title,
    slug: vehicle.slug,
    category: vehicle.category,
    operationMode: vehicle.operation_mode,
    availability: vehicle.availability,
    brand: vehicle.brand ?? "",
    model: vehicle.model ?? "",
    plate: vehicle.plate ?? "",
    renavam: vehicle.renavam ?? "",
    chassi: vehicle.chassi ?? "",
    manufacturedYear: vehicle.manufactured_year?.toString() ?? "",
    passengerCapacity: vehicle.passenger_capacity?.toString() ?? "",
    mileageKm: vehicle.mileage_km?.toString() ?? "",
    airConditioned: vehicle.air_conditioned,
    location: vehicle.location ?? "",
    price: vehicle.price_cents !== null ? (vehicle.price_cents / 100).toFixed(2) : "",
    description: vehicle.description,
    features: vehicle.features.join("\n"),
    isFeatured: vehicle.is_featured,
    sortOrder: vehicle.sort_order.toString(),
    isPublished: Boolean(vehicle.published_at),
    publishedAt: vehicle.published_at,
  };
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseOptionalInteger(
  value: string,
  label: string,
  { min, max }: { min?: number; max?: number } = {},
) {
  const trimmed = value.trim();
  if (!trimmed) return { value: null as number | null };

  if (!/^\d+$/.test(trimmed)) {
    return { error: `${label} deve ser um número inteiro.` };
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed)) {
    return { error: `${label} está fora do limite permitido.` };
  }
  if (min !== undefined && parsed < min) {
    return { error: `${label} deve ser maior ou igual a ${min}.` };
  }
  if (max !== undefined && parsed > max) {
    return { error: `${label} deve ser menor ou igual a ${max}.` };
  }

  return { value: parsed };
}

function parseOptionalPrice(value: string) {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return { value: null as number | null };

  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) {
    return { error: "Preço deve ser um valor em reais, com até duas casas decimais." };
  }

  const parsed = Number(trimmed);
  const cents = Math.round(parsed * 100);
  if (!Number.isSafeInteger(cents)) {
    return { error: "Preço está fora do limite permitido." };
  }

  return { value: cents };
}

function imageSelectionKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function validateImageFiles(files: File[]) {
  const invalidType = files.find((file) => !ALLOWED_IMAGE_TYPES.has(file.type));
  if (invalidType) {
    return `${invalidType.name} não é uma imagem aceita. Use JPEG, PNG ou WebP.`;
  }

  const oversized = files.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
  if (oversized) {
    return `${oversized.name} ultrapassa o limite de 10 MB.`;
  }

  return "";
}

function fileExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : "jpg";
}

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

type CrlvImportStatus = "EMPTY" | "PROCESSANDO" | "PRONTO" | "REVISAR" | "ERRO";

type CrlvImportState = {
  file: File | null;
  result: CrlvParseResult | null;
  hash: string | null;
  status: CrlvImportStatus;
  error: string;
};

const emptyCrlvImport = (): CrlvImportState => ({
  file: null,
  result: null,
  hash: null,
  status: "EMPTY",
  error: "",
});

function sha256File(file: File) {
  return file
    .arrayBuffer()
    .then((bytes) => crypto.subtle.digest("SHA-256", bytes))
    .then((digest) =>
      Array.from(new Uint8Array(digest))
        .map((value) => value.toString(16).padStart(2, "0"))
        .join(""),
    );
}

function validateCrlvFile(file: File) {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "O CRLV precisa ser um arquivo PDF.";
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return "O CRLV ultrapassa o limite de 10 MB.";
  }
  return "";
}

function currentCrlvDocument(vehicle: CatalogVehicleWithImages | undefined) {
  return (
    vehicle?.catalog_vehicle_documents?.find(
      (document) => document.tipo_documento === "CRLV" && document.documento_atual,
    ) ?? null
  );
}

function AdminPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [vehicles, setVehicles] = useState<CatalogVehicleWithImages[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [form, setForm] = useState<VehicleForm>(emptyVehicleForm);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [crlvImport, setCrlvImport] = useState<CrlvImportState>(emptyCrlvImport);
  const [plateLookup, setPlateLookup] = useState<CatalogPlateLookup | null>(null);
  const [plateLookupError, setPlateLookupError] = useState("");
  const [isLookingUpPlate, setIsLookingUpPlate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editorError, setEditorError] = useState("");

  const currentImages = useMemo(
    () =>
      [...(vehicles.find((vehicle) => vehicle.id === form.id)?.catalog_vehicle_images ?? [])].sort(
        (first, second) => first.sort_order - second.sort_order,
      ),
    [form.id, vehicles],
  );

  const currentVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === form.id),
    [form.id, vehicles],
  );
  const currentCrlv = useMemo(() => currentCrlvDocument(currentVehicle), [currentVehicle]);

  async function checkAdminAccess(nextSession: AdminSession | null) {
    if (!nextSession) {
      setSession(null);
      setIsAdmin(false);
      return false;
    }

    setSession(nextSession);
    setIsAdmin(true);
    return true;
  }

  async function loadVehicles() {
    setIsLoadingVehicles(true);
    try {
      const catalogVehicles = await listAdminVehicles();
      const urls = Object.fromEntries(
        catalogVehicles.flatMap((vehicle) =>
          (vehicle.catalog_vehicle_images ?? []).map((image) => [image.path, image.path]),
        ),
      );
      setVehicles(catalogVehicles);
      setImageUrls(urls);
    } catch {
      setEditorError("Não foi possível carregar os veículos.");
    } finally {
      setIsLoadingVehicles(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      let currentSession: AdminSession | null = null;
      try {
        currentSession = await getAdminSession();
      } catch {
        currentSession = null;
      }

      if (!cancelled) {
        await checkAdminAccess(currentSession);
        setIsCheckingAccess(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isAdmin) void loadVehicles();
  }, [isAdmin]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    try {
      const nextSession = await login(email, password);
      await checkAdminAccess(nextSession);
    } catch {
      setLoginError("E-mail ou senha inválidos.");
    }
  }

  async function handleSignOut() {
    await logout().catch(() => undefined);
    setSession(null);
    setIsAdmin(false);
    setVehicles([]);
    setForm(emptyVehicleForm());
    setCrlvImport(emptyCrlvImport());
  }

  function startNewVehicle() {
    setForm(emptyVehicleForm());
    setNewFiles([]);
    setCrlvImport(emptyCrlvImport());
    setPlateLookup(null);
    setPlateLookupError("");
    setEditorError("");
    setMessage("");
  }

  function selectVehicle(vehicle: CatalogVehicleWithImages) {
    setForm(formFromVehicle(vehicle));
    setNewFiles([]);
    setCrlvImport(emptyCrlvImport());
    setPlateLookup(vehicle.plate_lookup ?? null);
    setPlateLookupError("");
    setEditorError("");
    setMessage("");
  }

  function updateTitle(title: string) {
    setForm((current) => ({
      ...current,
      title,
      slug: current.id ? current.slug : slugify(title),
    }));
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.currentTarget.files ?? []);
    const nextFiles = [...newFiles, ...selectedFiles].filter(
      (file, index, files) =>
        files.findIndex((candidate) => imageSelectionKey(candidate) === imageSelectionKey(file)) ===
        index,
    );
    const validationError = validateImageFiles(nextFiles);

    event.currentTarget.value = "";

    if (validationError) {
      setEditorError(validationError);
      return;
    }

    setEditorError("");
    setMessage("");
    setNewFiles(nextFiles);
  }

  async function handleCrlvSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (!file) return;

    const validationError = validateCrlvFile(file);
    if (validationError) {
      setCrlvImport({ file, result: null, hash: null, status: "ERRO", error: validationError });
      return;
    }

    setEditorError("");
    setMessage("");
    setCrlvImport({ file, result: null, hash: null, status: "PROCESSANDO", error: "" });

    try {
      const [{ extractCrlvPdf }, hash] = await Promise.all([
        import("@/lib/crlv-pdf"),
        sha256File(file),
      ]);
      const result = await extractCrlvPdf(file);
      const status = result.data.status_extracao === "ok" ? "PRONTO" : "REVISAR";
      setCrlvImport({ file, result, hash, status, error: result.data.erro_extracao ?? "" });
      setForm((current) => applyCrlvFields(current, result.data));
      setPlateLookupError("");
    } catch (error) {
      setCrlvImport({
        file,
        result: null,
        hash: null,
        status: "ERRO",
        error: error instanceof Error ? error.message : "Não foi possível ler o CRLV.",
      });
    }
  }

  async function lookupPlate(plateValue: string, vehicleId = form.id ?? undefined) {
    const normalized = normalizeCrlvPlate(plateValue);
    if (!/^[A-Z]{3}(?:\d[A-Z]\d{2}|\d{4})$/.test(normalized)) {
      setPlateLookup(null);
      setPlateLookupError(normalized ? "Informe uma placa brasileira válida." : "");
      return;
    }

    setIsLookingUpPlate(true);
    setPlateLookupError("");
    try {
      const result = await lookupVehiclePlate(normalized, { vehicleId });
      setPlateLookup(result);
      const snapshot = result.snapshot;
      if (snapshot) {
        const year = snapshot.year?.match(/(?:19|20)\d{2}/)?.[0] ?? "";
        setForm((current) => ({
          ...current,
          brand: current.brand || snapshot.brand || "",
          model: current.model || snapshot.makeModel || snapshot.model || "",
          manufacturedYear: current.manufacturedYear || year,
        }));
      }
    } catch (error) {
      setPlateLookup(null);
      setPlateLookupError(
        error instanceof Error ? error.message : "Não foi possível consultar a placa.",
      );
    } finally {
      setIsLookingUpPlate(false);
    }
  }

  async function uploadFiles(vehicleId: string, files: File[], nextSortOrder: number) {
    for (const [index, file] of files.entries()) {
      await uploadImage(vehicleId, file, nextSortOrder + index, form.title);
    }
  }

  async function uploadCrlv(vehicleId: string, importState: CrlvImportState) {
    if (!importState.file || !importState.result || !importState.hash) return;
    const confirmedData = {
      ...importState.result.data,
      placa: normalizeCrlvPlate(form.plate),
      renavam: form.renavam.trim() || null,
      chassi: form.chassi.trim().toUpperCase() || null,
    };
    const fingerprint = getCrlvDocumentFingerprint(confirmedData);
    await uploadCrlvApi(
      vehicleId,
      importState.file,
      importState.result,
      importState.hash,
      {
        plate: normalizeCrlvPlate(form.plate),
        renavam: form.renavam.trim(),
        chassi: form.chassi.trim().toUpperCase(),
        model: form.model,
        manufacturedYear: form.manufacturedYear,
        passengerCapacity: form.passengerCapacity,
      },
      importState.status,
      fingerprint,
    );
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    const slug = slugify(form.slug);
    const category = form.category.trim();

    if (!title || !slug || !category) {
      setEditorError("Preencha título, URL curta e categoria.");
      return;
    }

    const plate = normalizeCrlvPlate(form.plate);
    const renavam = form.renavam.trim();
    const chassi = form.chassi.trim().toUpperCase();
    if (crlvImport.file && (!plate || !renavam || !chassi)) {
      setEditorError("Confira placa, RENAVAM e chassi extraídos do CRLV antes de salvar.");
      return;
    }

    const manufacturedYear = parseOptionalInteger(form.manufacturedYear, "Ano", {
      min: 1950,
      max: 2100,
    });
    const passengerCapacity = parseOptionalInteger(form.passengerCapacity, "Capacidade", {
      min: 1,
    });
    const mileageKm = parseOptionalInteger(form.mileageKm, "Quilometragem", { min: 0 });
    const sortOrder = parseOptionalInteger(form.sortOrder, "Ordem", { min: 0 });
    const priceCents = parseOptionalPrice(form.price);
    const validationError = [
      manufacturedYear,
      passengerCapacity,
      mileageKm,
      sortOrder,
      priceCents,
    ].find((result) => result.error)?.error;

    if (validationError) {
      setEditorError(validationError);
      return;
    }

    const imageValidationError = validateImageFiles(newFiles);
    if (imageValidationError) {
      setEditorError(imageValidationError);
      return;
    }

    setIsSaving(true);
    setEditorError("");
    setMessage("");

    const publishedAt = form.isPublished ? (form.publishedAt ?? new Date().toISOString()) : null;
    const payload = {
      title,
      slug,
      category,
      operationMode: form.operationMode,
      availability: form.availability,
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      plate: plate || null,
      renavam: renavam || null,
      chassi: chassi || null,
      manufacturedYear: manufacturedYear.value ?? null,
      passengerCapacity: passengerCapacity.value ?? null,
      mileageKm: mileageKm.value ?? null,
      airConditioned: form.airConditioned,
      location: form.location.trim() || null,
      priceCents: priceCents.value ?? null,
      description: form.description.trim(),
      features: form.features
        .split("\n")
        .map((feature) => feature.trim())
        .filter(Boolean),
      isFeatured: form.isFeatured,
      sortOrder: sortOrder.value ?? 0,
      publishedAt: publishedAt,
    };

    let createdVehicleId: string | null = null;
    try {
      let vehicleId = form.id;

      if (vehicleId) {
        await updateVehicle(vehicleId, payload);
      } else {
        const created = await createVehicle(payload);
        vehicleId = created.id;
        createdVehicleId = vehicleId;
      }

      let crlvUploadError: unknown = null;
      if (crlvImport.file && vehicleId) {
        try {
          await uploadCrlv(vehicleId, crlvImport);
        } catch (error) {
          crlvUploadError = error;
          if (!form.id) throw error;
        }
      }

      let uploadError: unknown = null;
      try {
        await uploadFiles(vehicleId, newFiles, currentImages.length);
      } catch (error) {
        uploadError = error;
      }

      setForm((current) => ({ ...current, id: vehicleId, slug, publishedAt }));
      setNewFiles(uploadError ? newFiles : []);
      if (!crlvUploadError) setCrlvImport(emptyCrlvImport());
      await loadVehicles();

      if (crlvUploadError) {
        setMessage("");
        setEditorError(
          `Veículo ${form.id ? "atualizado" : "cadastrado"}, mas o CRLV não pôde ser salvo. Confira o arquivo e tente novamente.`,
        );
      } else if (uploadError) {
        setMessage("");
        setEditorError(
          `Veículo ${form.id ? "atualizado" : "cadastrado"}, mas não foi possível enviar as fotos. Tente salvar novamente.`,
        );
      } else {
        setMessage(form.id ? "Veículo atualizado." : "Veículo cadastrado.");
      }
    } catch (error) {
      if (createdVehicleId) {
        await deleteVehicleApi(createdVehicleId, slug).catch(() => undefined);
      }
      setEditorError(error instanceof Error ? error.message : "Não foi possível salvar o veículo.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeImage(image: CatalogVehicleImage) {
    if (!window.confirm("Remover esta foto do veículo?")) return;

    setEditorError("");
    try {
      await deleteImage(image.id);
    } catch {
      setEditorError("Não foi possível remover a foto.");
      return;
    }

    await loadVehicles();
  }

  async function deleteVehicle() {
    if (!form.id) return;
    if (!window.confirm("Excluir este veículo e todas as suas fotos?")) return;

    setEditorError("");
    try {
      await deleteVehicleApi(form.id, form.slug);
    } catch {
      setEditorError("Não foi possível excluir o veículo.");
      return;
    }

    startNewVehicle();
    await loadVehicles();
  }

  if (isCheckingAccess) {
    return <AdminStatus message="Verificando acesso…" />;
  }

  if (!session || !isAdmin) {
    return (
      <LoginScreen
        email={email}
        password={password}
        error={loginError}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="container-page flex min-h-16 items-center justify-between gap-4 py-3">
          <Link to="/" className="flex items-center gap-3" aria-label="Voltar para o site">
            <img src={logo} alt="01 Transportes" className="h-8 w-auto" width={899} height={126} />
            <span className="hidden border-l border-border pl-3 text-sm font-medium text-muted-foreground sm:inline">
              Administrar catálogo
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground md:inline">
              {session.user.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="container-page py-8 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-primary md:text-4xl">
              Veículos
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Organize o catálogo público com dados conferidos e fotos prontas para publicação.
            </p>
          </div>
          <button
            type="button"
            onClick={startNewVehicle}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Novo veículo
          </button>
        </div>

        <div className="mt-8 grid items-start gap-8 xl:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)]">
          <section className="border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-bold">Catálogo cadastrado</h2>
              <span className="text-sm text-muted-foreground">
                {isLoadingVehicles ? "Carregando…" : `${vehicles.length} veículo(s)`}
              </span>
            </div>

            {vehicles.length === 0 && !isLoadingVehicles ? (
              <div className="px-5 py-10 text-sm text-muted-foreground">
                Nenhum veículo cadastrado ainda. Use “Novo veículo” para começar.
              </div>
            ) : (
              <div>
                {vehicles.map((vehicle) => {
                  const image = [...(vehicle.catalog_vehicle_images ?? [])].sort(
                    (first, second) => first.sort_order - second.sort_order,
                  )[0];
                  const isSelected = vehicle.id === form.id;
                  const vehicleCrlv = currentCrlvDocument(vehicle);

                  return (
                    <button
                      type="button"
                      key={vehicle.id}
                      onClick={() => selectVehicle(vehicle)}
                      className={`flex w-full items-center gap-4 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-surface ${
                        isSelected ? "bg-surface" : "bg-card"
                      }`}
                    >
                      <div className="h-14 w-20 shrink-0 overflow-hidden border border-border bg-muted">
                        {imageUrls[image?.path ?? ""] ? (
                          <img
                            src={imageUrls[image?.path ?? ""]}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            Sem foto
                          </div>
                        )}
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{vehicle.title}</span>
                        <span className="mt-1 block truncate text-sm text-muted-foreground">
                          {vehicle.plate || "Sem placa"} · {vehicle.category}
                        </span>
                      </span>
                      {vehicleCrlv &&
                        (vehicleCrlv.status_extracao === "APLICADO" ? (
                          <BadgeCheck
                            className="h-4 w-4 shrink-0 text-whatsapp"
                            aria-label="CRLV conferido"
                          />
                        ) : (
                          <Info
                            className="h-4 w-4 shrink-0 text-primary"
                            aria-label="CRLV requer revisão"
                          />
                        ))}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="border border-border bg-card">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 md:px-6">
              <div>
                <h2 className="text-lg font-bold text-primary">
                  {form.id ? "Editar veículo" : "Novo veículo"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {form.id
                    ? "Atualize os dados do catálogo sem perder o histórico do documento."
                    : "O CRLV é opcional; quando anexado, ajuda a preencher e conferir a identificação."}
                </p>
              </div>
              {form.id && currentCrlv && (
                <span
                  className={`hidden items-center gap-1.5 text-xs font-semibold sm:inline-flex ${
                    currentCrlv.status_extracao === "APLICADO" ? "text-whatsapp" : "text-primary"
                  }`}
                >
                  {currentCrlv.status_extracao === "APLICADO" ? (
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Info className="h-4 w-4" aria-hidden="true" />
                  )}
                  {currentCrlv.status_extracao === "APLICADO"
                    ? "CRLV conferido"
                    : "CRLV requer revisão"}
                </span>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-8 p-5 md:p-6">
              <fieldset className="grid gap-5 md:grid-cols-2">
                <legend className="sr-only">Identificação do anúncio</legend>
                <label className="grid gap-2 md:col-span-2">
                  <span className="text-sm font-medium">Título</span>
                  <input
                    value={form.title}
                    onChange={(event) => updateTitle(event.target.value)}
                    className="h-10 border border-input bg-background px-3 text-sm"
                    placeholder="Ex.: Micro-ônibus escolar 2022"
                    required
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">URL curta</span>
                  <input
                    value={form.slug}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, slug: slugify(event.target.value) }))
                    }
                    className="h-10 border border-input bg-background px-3 text-sm"
                    placeholder="micro-onibus-escolar-2022"
                    required
                  />
                  <span className="text-xs text-muted-foreground">
                    Usada no identificador do cadastro. É preenchida automaticamente pelo título.
                  </span>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Categoria</span>
                  <input
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, category: event.target.value }))
                    }
                    className="h-10 border border-input bg-background px-3 text-sm"
                    placeholder="Transporte escolar"
                    required
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Modalidade</span>
                  <select
                    value={form.operationMode}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        operationMode: event.target.value as OperationMode,
                      }))
                    }
                    className="h-10 border border-input bg-background px-3 text-sm"
                  >
                    {Object.entries(operationModeLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Disponibilidade</span>
                  <select
                    value={form.availability}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        availability: event.target.value as Availability,
                      }))
                    }
                    className="h-10 border border-input bg-background px-3 text-sm"
                  >
                    {Object.entries(availabilityLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>

              <section
                className="border border-border bg-surface/60 p-4 sm:p-5"
                aria-labelledby="crlv-heading"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center bg-primary text-primary-foreground">
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 id="crlv-heading" className="font-bold text-primary">
                        Conferência do CRLV
                      </h3>
                      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                        {form.id
                          ? "Confira o documento atual ou anexe uma nova versão para atualizar os dados do veículo."
                          : "Anexe o CRLV para preencher os dados do veículo. A leitura do PDF funciona sem consulta externa por placa."}
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 border border-border bg-background px-3 py-2 text-sm font-semibold transition-colors hover:bg-card">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {currentCrlv ? "Substituir CRLV" : "Anexar CRLV"}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(event) => void handleCrlvSelection(event)}
                      className="sr-only"
                    />
                  </label>
                </div>

                {currentCrlv && !crlvImport.file && (
                  <div
                    className={`mt-4 flex items-start gap-3 border px-3 py-3 text-sm ${
                      currentCrlv.status_extracao === "APLICADO"
                        ? "border-whatsapp/30 bg-whatsapp/10"
                        : "border-highlight/50 bg-highlight/15"
                    }`}
                  >
                    {currentCrlv.status_extracao === "APLICADO" ? (
                      <BadgeCheck
                        className="mt-0.5 h-4 w-4 shrink-0 text-whatsapp"
                        aria-hidden="true"
                      />
                    ) : (
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {currentCrlv.status_extracao === "APLICADO"
                          ? "CRLV conferido e armazenado"
                          : "CRLV armazenado com revisão pendente"}
                      </p>
                      <p
                        className="mt-1 truncate text-muted-foreground"
                        title={currentCrlv.arquivo_nome}
                      >
                        {currentCrlv.arquivo_nome} · {currentCrlv.paginas} página(s)
                      </p>
                    </div>
                  </div>
                )}

                {crlvImport.status === "PROCESSANDO" && (
                  <div
                    className="mt-4 flex items-center gap-3 border border-border bg-background px-3 py-3 text-sm"
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                    <span>Lendo o PDF e conferindo os campos do CRLV…</span>
                  </div>
                )}

                {crlvImport.file && crlvImport.status !== "PROCESSANDO" && (
                  <div className="mt-4 border border-border bg-background px-3 py-3 text-sm">
                    <div className="flex items-start gap-3">
                      {crlvImport.status === "ERRO" ? (
                        <XCircle
                          className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                          aria-hidden="true"
                        />
                      ) : crlvImport.status === "REVISAR" ? (
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      ) : (
                        <BadgeCheck
                          className="mt-0.5 h-4 w-4 shrink-0 text-whatsapp"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {crlvImport.status === "ERRO"
                            ? "Não foi possível conferir este arquivo"
                            : crlvImport.status === "REVISAR"
                              ? "CRLV lido com pontos para revisar"
                              : "CRLV lido e pronto para salvar"}
                        </p>
                        <p
                          className="mt-1 truncate text-muted-foreground"
                          title={crlvImport.file.name}
                        >
                          {crlvImport.file.name}
                        </p>
                        {crlvImport.error && (
                          <p className="mt-2 text-sm text-primary" role="alert">
                            {crlvImport.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {(crlvImport.file || currentCrlv) && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-sm font-medium">RENAVAM</span>
                      <input
                        value={form.renavam}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            renavam: event.target.value.replace(/\D/g, ""),
                          }))
                        }
                        className="h-11 border border-input bg-background px-3 font-mono text-sm read-only:bg-muted read-only:text-muted-foreground"
                        placeholder="11 dígitos"
                        readOnly={!crlvImport.file}
                        required={Boolean(crlvImport.file)}
                        inputMode="numeric"
                        aria-describedby="crlv-identity-help"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-medium">Chassi</span>
                      <input
                        value={form.chassi}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            chassi: event.target.value.toUpperCase(),
                          }))
                        }
                        className="h-11 border border-input bg-background px-3 font-mono text-sm uppercase read-only:bg-muted read-only:text-muted-foreground"
                        placeholder="17 caracteres"
                        readOnly={!crlvImport.file}
                        required={Boolean(crlvImport.file)}
                        aria-describedby="crlv-identity-help"
                      />
                    </label>
                  </div>
                )}
                <p
                  id="crlv-identity-help"
                  className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
                >
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Os campos podem ser ajustados quando a leitura do PDF pedir revisão. O arquivo
                  original permanece armazenado para auditoria.
                </p>
              </section>

              <fieldset className="grid gap-5 border-t border-border pt-6 md:grid-cols-3">
                <legend className="sr-only">Especificações do veículo</legend>
                <label className="grid gap-2 md:col-span-3">
                  <span className="text-sm font-medium">Placa</span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={form.plate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          plate: normalizeCrlvPlate(event.target.value),
                        }))
                      }
                      className="h-10 min-w-0 flex-1 border border-input bg-background px-3 font-mono text-sm uppercase"
                      placeholder="ABC1D23"
                      aria-describedby="plate-lookup-help"
                    />
                    <button
                      type="button"
                      onClick={() => void lookupPlate(form.plate)}
                      disabled={isLookingUpPlate}
                      className="inline-flex h-10 items-center justify-center gap-2 border border-border px-3 text-sm font-semibold transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLookingUpPlate && (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      )}
                      {isLookingUpPlate ? "Consultando…" : "Consultar placa"}
                    </button>
                  </div>
                  <span id="plate-lookup-help" className="text-xs text-muted-foreground">
                    Consulta externa opcional, acionada apenas pelo botão. Com o CRLV, os dados são
                    lidos do PDF sem precisar da APIPlacas.
                  </span>
                  {plateLookupError && (
                    <span className="text-xs text-destructive" role="alert">
                      {plateLookupError}
                    </span>
                  )}
                  {plateLookup?.snapshot && (
                    <div className="mt-1 border border-border bg-surface/60 px-3 py-3 text-xs">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-semibold">
                        <span>Dados automáticos da placa</span>
                        <span className="text-muted-foreground">
                          {plateLookup.cacheHit ? "cache" : "atualizado"} · {plateLookup.status}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {[
                          plateLookup.snapshot.brand,
                          plateLookup.snapshot.model || plateLookup.snapshot.makeModel,
                          plateLookup.snapshot.year,
                          plateLookup.snapshot.color,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "A consulta não retornou detalhes adicionais."}
                      </p>
                    </div>
                  )}
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Marca</span>
                  <input
                    value={form.brand}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, brand: event.target.value }))
                    }
                    className="h-10 border border-input bg-background px-3 text-sm"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Modelo</span>
                  <input
                    value={form.model}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, model: event.target.value }))
                    }
                    className="h-10 border border-input bg-background px-3 text-sm"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Ano</span>
                  <input
                    type="number"
                    min="1950"
                    value={form.manufacturedYear}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, manufacturedYear: event.target.value }))
                    }
                    className="h-10 border border-input bg-background px-3 text-sm"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Capacidade</span>
                  <input
                    type="number"
                    min="1"
                    value={form.passengerCapacity}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, passengerCapacity: event.target.value }))
                    }
                    className="h-10 border border-input bg-background px-3 text-sm"
                    placeholder="Passageiros"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Quilometragem</span>
                  <input
                    type="number"
                    min="0"
                    value={form.mileageKm}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, mileageKm: event.target.value }))
                    }
                    className="h-10 border border-input bg-background px-3 text-sm"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Preço</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, price: event.target.value }))
                    }
                    className="h-10 border border-input bg-background px-3 text-sm"
                    placeholder="Opcional"
                  />
                </label>
                <label className="grid gap-2 md:col-span-2">
                  <span className="text-sm font-medium">Localização</span>
                  <input
                    value={form.location}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, location: event.target.value }))
                    }
                    className="h-10 border border-input bg-background px-3 text-sm"
                    placeholder="Ex.: Grande São Paulo"
                  />
                </label>
                <label className="flex items-center gap-3 self-end pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.airConditioned}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, airConditioned: event.target.checked }))
                    }
                    className="h-4 w-4"
                  />
                  Ar-condicionado
                </label>
              </fieldset>

              <fieldset className="grid gap-5 border-t border-border pt-6">
                <legend className="sr-only">Descrição e diferenciais</legend>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Descrição</span>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                    className="min-h-28 border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Descreva o veículo, o estado e os diferenciais para quem está consultando."
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Itens e diferenciais</span>
                  <textarea
                    value={form.features}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, features: event.target.value }))
                    }
                    className="min-h-24 border border-input bg-background px-3 py-2 text-sm"
                    placeholder={"Um item por linha\nEx.: Ar-condicionado\nCintos individuais"}
                  />
                </label>
              </fieldset>

              <fieldset className="grid gap-5 border-t border-border pt-6">
                <legend className="sr-only">Fotos do veículo</legend>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Fotos</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      JPEG, PNG ou WebP de até 10 MB. A primeira foto será a capa.
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface">
                    <ImagePlus className="h-4 w-4" />
                    Adicionar fotos
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleFileSelection}
                      className="sr-only"
                    />
                  </label>
                </div>

                {currentImages.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {currentImages.map((image) => (
                      <div key={image.id} className="border border-border">
                        {imageUrls[image.path] ? (
                          <img
                            src={imageUrls[image.path]}
                            alt={image.alt_text ?? form.title}
                            className="aspect-[4/3] w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex aspect-[4/3] items-center justify-center bg-muted text-sm text-muted-foreground">
                            Carregando foto…
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => void removeImage(image)}
                          className="flex w-full items-center justify-center gap-2 border-t border-border px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-surface"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remover foto
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {newFiles.length > 0 && (
                  <div className="border border-dashed border-border px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="font-semibold">
                          {newFiles.length} foto(s) pronta(s) para envio
                        </span>
                        <ul className="mt-2 space-y-1 text-muted-foreground">
                          {newFiles.map((file) => (
                            <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                          ))}
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewFiles([])}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        aria-label="Limpar fotos selecionadas"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </fieldset>

              <fieldset className="grid gap-4 border-t border-border pt-6 md:grid-cols-[1fr_auto]">
                <legend className="sr-only">Publicação do anúncio</legend>
                <div className="flex flex-wrap items-center gap-5 text-sm">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, isPublished: event.target.checked }))
                      }
                      className="h-4 w-4"
                    />
                    Publicar no site
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, isFeatured: event.target.checked }))
                      }
                      className="h-4 w-4"
                    />
                    Destacar no catálogo
                  </label>
                  <label className="flex items-center gap-2">
                    Ordem
                    <input
                      type="number"
                      min="0"
                      value={form.sortOrder}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, sortOrder: event.target.value }))
                      }
                      className="h-9 w-20 border border-input bg-background px-2 text-sm"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  {form.id && (
                    <button
                      type="button"
                      onClick={() => void deleteVehicle()}
                      className="inline-flex items-center gap-2 rounded-md border border-destructive px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Salvando…" : "Salvar veículo"}
                  </button>
                </div>
              </fieldset>

              {(editorError || message) && (
                <p
                  className={`text-sm ${editorError ? "text-destructive" : "text-foreground"}`}
                  role={editorError ? "alert" : "status"}
                  aria-live="polite"
                >
                  {editorError || message}
                </p>
              )}
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

function AdminStatus({ message }: { message: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <div className="w-full max-w-md border border-border bg-card p-6">
        <img src={logo} alt="01 Transportes" className="h-8 w-auto" />
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{message}</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface"
        >
          Voltar para o site
        </Link>
      </div>
    </div>
  );
}

function LoginScreen({
  email,
  password,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  email: string;
  password: string;
  error: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-surface px-5 py-10 text-foreground">
      <main className="w-full max-w-md border border-border bg-card p-6 md:p-8">
        <Link to="/" aria-label="Voltar para o site">
          <img src={logo} alt="01 Transportes" className="h-9 w-auto" width={899} height={126} />
        </Link>
        <h1 className="mt-8 text-2xl font-black text-primary">Entrar no catálogo</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Use a conta autorizada para cadastrar e atualizar os veículos exibidos no site.
        </p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-medium">E-mail</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className="h-11 border border-input bg-background px-3 text-sm"
              required
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="h-11 border border-input bg-background px-3 text-sm"
              required
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Entrar
          </button>
        </form>
      </main>
    </div>
  );
}
