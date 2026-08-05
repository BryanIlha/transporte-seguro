import { Link, createFileRoute } from "@tanstack/react-router";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { ImagePlus, LogOut, Plus, Save, Trash2, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

import logo from "@/assets/01transportes-logo.svg";
import {
  CATALOG_IMAGE_BUCKET,
  availabilityLabel,
  getCatalogImageUrls,
  operationModeLabel,
  type Availability,
  type CatalogVehicle,
  type CatalogVehicleImage,
  type OperationMode,
} from "@/lib/catalog";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Administrar catálogo — 01 Transportes" }],
  }),
});

type CatalogVehicleWithImages = CatalogVehicle & {
  catalog_vehicle_images: CatalogVehicleImage[];
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

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
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

  async function checkAdminAccess(nextSession: Session | null) {
    if (!supabase || !nextSession) {
      setSession(null);
      setIsAdmin(false);
      return false;
    }

    const { data, error } = await supabase
      .from("catalog_admins")
      .select("user_id")
      .eq("user_id", nextSession.user.id)
      .maybeSingle();

    if (error) {
      setLoginError("Não foi possível verificar seu acesso. Tente novamente.");
      setIsAdmin(false);
      return false;
    }

    setSession(nextSession);
    setIsAdmin(Boolean(data));
    return Boolean(data);
  }

  async function loadVehicles() {
    if (!supabase) return;

    setIsLoadingVehicles(true);
    const { data, error } = await supabase
      .from("catalog_vehicles")
      .select("*, catalog_vehicle_images(*)")
      .order("updated_at", { ascending: false });

    if (error) {
      setEditorError("Não foi possível carregar os veículos.");
      setIsLoadingVehicles(false);
      return;
    }

    const catalogVehicles = (data ?? []) as CatalogVehicleWithImages[];
    const urls = await getCatalogImageUrls(
      catalogVehicles.flatMap((vehicle) =>
        (vehicle.catalog_vehicle_images ?? []).map((image) => image.path),
      ),
    );

    setVehicles(catalogVehicles);
    setImageUrls(urls);
    setIsLoadingVehicles(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      if (!supabase) {
        if (!cancelled) setIsCheckingAccess(false);
        return;
      }

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

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
    if (!supabase) return;

    setLoginError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      setLoginError("E-mail ou senha inválidos.");
      return;
    }

    const hasAccess = await checkAdminAccess(data.session);
    if (!hasAccess) {
      setLoginError("Esta conta não tem acesso ao catálogo.");
      await supabase.auth.signOut();
      setSession(null);
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
    setVehicles([]);
    setForm(emptyVehicleForm());
  }

  function startNewVehicle() {
    setForm(emptyVehicleForm());
    setNewFiles([]);
    setEditorError("");
    setMessage("");
  }

  function selectVehicle(vehicle: CatalogVehicleWithImages) {
    setForm(formFromVehicle(vehicle));
    setNewFiles([]);
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

  async function uploadFiles(vehicleId: string, files: File[], nextSortOrder: number) {
    if (!supabase || files.length === 0) return;

    const imagesToInsert: Array<{
      vehicle_id: string;
      path: string;
      alt_text: string;
      sort_order: number;
    }> = [];
    const uploadedPaths: string[] = [];

    try {
      for (const [index, file] of files.entries()) {
        const path = `vehicles/${vehicleId}/${crypto.randomUUID()}.${fileExtension(file)}`;
        const { error: uploadError } = await supabase.storage
          .from(CATALOG_IMAGE_BUCKET)
          .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;
        uploadedPaths.push(path);

        imagesToInsert.push({
          vehicle_id: vehicleId,
          path,
          alt_text: form.title,
          sort_order: nextSortOrder + index,
        });
      }

      const { error: imageError } = await supabase
        .from("catalog_vehicle_images")
        .insert(imagesToInsert);
      if (imageError) throw imageError;
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(CATALOG_IMAGE_BUCKET).remove(uploadedPaths);
      }
      throw error;
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    const title = form.title.trim();
    const slug = slugify(form.slug);
    const category = form.category.trim();

    if (!title || !slug || !category) {
      setEditorError("Preencha título, URL curta e categoria.");
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
      operation_mode: form.operationMode,
      availability: form.availability,
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      manufactured_year: manufacturedYear.value,
      passenger_capacity: passengerCapacity.value,
      mileage_km: mileageKm.value,
      air_conditioned: form.airConditioned,
      location: form.location.trim() || null,
      price_cents: priceCents.value,
      description: form.description.trim(),
      features: form.features
        .split("\n")
        .map((feature) => feature.trim())
        .filter(Boolean),
      is_featured: form.isFeatured,
      sort_order: sortOrder.value ?? 0,
      published_at: publishedAt,
      updated_at: new Date().toISOString(),
    };

    try {
      let vehicleId = form.id;

      if (vehicleId) {
        const { error } = await supabase
          .from("catalog_vehicles")
          .update(payload)
          .eq("id", vehicleId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("catalog_vehicles")
          .insert(payload)
          .select("id")
          .single();
        if (error || !data) throw error ?? new Error("Não foi possível criar o veículo.");
        vehicleId = data.id as string;
      }

      let uploadError: unknown = null;
      try {
        await uploadFiles(vehicleId, newFiles, currentImages.length);
      } catch (error) {
        uploadError = error;
      }

      setForm((current) => ({ ...current, id: vehicleId, slug, publishedAt }));
      setNewFiles(uploadError ? newFiles : []);
      await loadVehicles();

      if (uploadError) {
        setMessage("");
        setEditorError(
          `Veículo ${form.id ? "atualizado" : "cadastrado"}, mas não foi possível enviar as fotos. Tente salvar novamente.`,
        );
      } else {
        setMessage(form.id ? "Veículo atualizado." : "Veículo cadastrado.");
      }
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : "Não foi possível salvar o veículo.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeImage(image: CatalogVehicleImage) {
    if (!supabase) return;
    if (!window.confirm("Remover esta foto do veículo?")) return;

    setEditorError("");
    const { error: storageError } = await supabase.storage
      .from(CATALOG_IMAGE_BUCKET)
      .remove([image.path]);
    if (storageError) {
      setEditorError("Não foi possível remover a foto.");
      return;
    }

    const { error } = await supabase.from("catalog_vehicle_images").delete().eq("id", image.id);
    if (error) {
      setEditorError("A foto foi removida do armazenamento, mas não do cadastro.");
      return;
    }

    await loadVehicles();
  }

  async function deleteVehicle() {
    if (!supabase || !form.id) return;
    if (!window.confirm("Excluir este veículo e todas as suas fotos?")) return;

    setEditorError("");
    const paths = currentImages.map((image) => image.path);
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(CATALOG_IMAGE_BUCKET)
        .remove(paths);
      if (storageError) {
        setEditorError("Não foi possível excluir as fotos do veículo.");
        return;
      }
    }

    const { error } = await supabase.from("catalog_vehicles").delete().eq("id", form.id);
    if (error) {
      setEditorError("Não foi possível excluir o veículo.");
      return;
    }

    startNewVehicle();
    await loadVehicles();
  }

  if (!isSupabaseConfigured) {
    return <ConfigurationNotice />;
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
            <h1 className="text-3xl font-black text-primary">Veículos</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Cadastre fotos, especificações e disponibilidade do catálogo público.
            </p>
          </div>
          <button
            type="button"
            onClick={startNewVehicle}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Novo veículo
          </button>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
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
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            Sem foto
                          </div>
                        )}
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{vehicle.title}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {vehicle.category} · {vehicle.published_at ? "Publicado" : "Rascunho"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-bold">{form.id ? "Editar veículo" : "Novo veículo"}</h2>
            </div>

            <form onSubmit={handleSave} className="space-y-8 p-5">
              <fieldset className="grid gap-5 md:grid-cols-2">
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

              <fieldset className="grid gap-5 border-t border-border pt-6 md:grid-cols-3">
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
                <p className={`text-sm ${editorError ? "text-destructive" : "text-foreground"}`}>
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

function ConfigurationNotice() {
  return (
    <AdminStatus message="A conexão com o catálogo ainda não foi configurada. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY ao ambiente de publicação." />
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
