import type { CrlvParseResult } from "./crlv-parser";
import type {
  Availability,
  CatalogVehicle,
  CatalogVehicleDocument,
  CatalogVehicleImage,
  CatalogPlateLookup,
  OperationMode,
} from "./catalog";

const API_BASE = "/api";

type ApiError = { error?: string };
export type AdminSession = { user: { id: string; email: string } };
type ApiAdminSession = { admin: { id: string; email: string } };

export function mapAdminSession(payload: ApiAdminSession): AdminSession {
  return { user: payload.admin };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(payload?.error ?? "Não foi possível concluir a operação.");
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function mapImage(image: {
  id: string;
  vehicleId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  createdAt: string;
}): CatalogVehicleImage {
  return {
    id: image.id,
    vehicle_id: image.vehicleId,
    path: image.url,
    alt_text: image.altText,
    sort_order: image.sortOrder,
    created_at: image.createdAt,
  };
}

function mapDocument(document: Record<string, unknown>): CatalogVehicleDocument {
  return {
    id: String(document.id),
    vehicle_id: String(document.vehicleId),
    tipo_documento: "CRLV",
    arquivo_nome: String(document.filename),
    mime_type: "application/pdf",
    tamanho_bytes: Number(document.sizeBytes),
    arquivo_hash_sha256: String(document.sha256),
    documento_fingerprint: (document.fingerprint as string | null) ?? null,
    paginas: Number(document.pages),
    versao_extrator: String(document.extractorVersion),
    status_extracao: document.extractionStatus as CatalogVehicleDocument["status_extracao"],
    placa_extraida: (document.extractedPlate as string | null) ?? null,
    renavam_extraido: (document.extractedRenavam as string | null) ?? null,
    chassi_extraido: (document.extractedChassi as string | null) ?? null,
    dados_extraidos: (document.extractedData as Record<string, unknown>) ?? {},
    dados_confirmados: (document.confirmedData as Record<string, unknown>) ?? {},
    texto_extraido: String(document.extractionText ?? ""),
    texto_layout: String(document.extractionLayout ?? ""),
    erro_extracao: (document.extractionError as string | null) ?? null,
    documento_atual: Boolean(document.current),
    created_at: String(document.createdAt),
    updated_at: String(document.updatedAt),
  };
}

function mapVehicle(vehicle: Record<string, unknown>): CatalogVehicle & {
  catalog_vehicle_images: CatalogVehicleImage[];
} {
  return {
    id: String(vehicle.id),
    slug: String(vehicle.slug),
    title: String(vehicle.title),
    category: String(vehicle.category),
    operation_mode: vehicle.operationMode as OperationMode,
    availability: vehicle.availability as Availability,
    brand: (vehicle.brand as string | null) ?? null,
    model: (vehicle.model as string | null) ?? null,
    manufactured_year: (vehicle.manufacturedYear as number | null) ?? null,
    passenger_capacity: (vehicle.passengerCapacity as number | null) ?? null,
    mileage_km: (vehicle.mileageKm as number | null) ?? null,
    plate: (vehicle.plate as string | null) ?? null,
    renavam: (vehicle.renavam as string | null) ?? null,
    chassi: (vehicle.chassi as string | null) ?? null,
    air_conditioned: Boolean(vehicle.airConditioned),
    location: (vehicle.location as string | null) ?? null,
    price_cents: (vehicle.priceCents as number | null) ?? null,
    currency: "BRL",
    description: String(vehicle.description ?? ""),
    features: Array.isArray(vehicle.features) ? vehicle.features.map(String) : [],
    is_featured: Boolean(vehicle.isFeatured),
    sort_order: Number(vehicle.sortOrder ?? 0),
    published_at: (vehicle.publishedAt as string | null) ?? null,
    created_at: String(vehicle.createdAt),
    updated_at: String(vehicle.updatedAt),
    catalog_vehicle_images: Array.isArray(vehicle.images) ? vehicle.images.map(mapImage) : [],
    catalog_vehicle_documents: Array.isArray(vehicle.documents)
      ? vehicle.documents.map((document) => mapDocument(document as Record<string, unknown>))
      : [],
    plate_lookup: vehicle.plateLookup ? (vehicle.plateLookup as CatalogPlateLookup) : null,
  };
}

export async function getCatalogVehicles(signal?: AbortSignal) {
  const result = await request<{ vehicles: Record<string, unknown>[] }>("/v1/catalog/vehicles", {
    signal,
  });
  return result.vehicles.map(mapVehicle);
}

export async function getAdminSession() {
  return mapAdminSession(await request<ApiAdminSession>("/v1/auth/me"));
}

export async function login(email: string, password: string) {
  return mapAdminSession(
    await request<ApiAdminSession>("/v1/auth/session", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  );
}

export async function logout() {
  return request<void>("/v1/auth/session", { method: "DELETE" });
}

export async function listAdminVehicles() {
  const result = await request<{ vehicles: Record<string, unknown>[] }>("/v1/admin/vehicles");
  return result.vehicles.map(mapVehicle);
}

export type VehicleApiPayload = {
  title: string;
  slug: string;
  category: string;
  operationMode: OperationMode;
  availability: Availability;
  brand: string | null;
  model: string | null;
  plate: string | null;
  renavam: string | null;
  chassi: string | null;
  manufacturedYear: number | null;
  passengerCapacity: number | null;
  mileageKm: number | null;
  airConditioned: boolean;
  location: string | null;
  priceCents: number | null;
  description: string;
  features: string[];
  isFeatured: boolean;
  sortOrder: number;
  publishedAt: string | null;
};

export async function createVehicle(payload: VehicleApiPayload) {
  const result = await request<{ vehicle: Record<string, unknown> }>("/v1/admin/vehicles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapVehicle(result.vehicle);
}

export async function updateVehicle(id: string, payload: VehicleApiPayload) {
  const result = await request<{ vehicle: Record<string, unknown> }>(`/v1/admin/vehicles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapVehicle(result.vehicle);
}

export type PlateLookupResult = {
  status: CatalogPlateLookup["status"];
  plate: string | null;
  cacheHit: boolean;
  providerHttpStatus: number | null;
  message: string | null;
  snapshot: CatalogPlateLookup["snapshot"];
  checkedAt: string | null;
  applied: boolean;
};

export async function lookupVehiclePlate(
  plate: string,
  options: { vehicleId?: string; refresh?: boolean } = {},
) {
  const result = await request<{ lookup: PlateLookupResult }>("/v1/admin/vehicles/lookup-plate", {
    method: "POST",
    body: JSON.stringify({ plate, ...options }),
  });
  return result.lookup;
}

export async function deleteVehicle(id: string, confirmSlug: string) {
  return request<void>(`/v1/admin/vehicles/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmSlug }),
  });
}

export async function uploadImage(
  vehicleId: string,
  file: File,
  sortOrder: number,
  altText: string,
) {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("sortOrder", String(sortOrder));
  form.append("altText", altText);
  const result = await request<{
    image: {
      id: string;
      vehicleId: string;
      url: string;
      altText: string | null;
      sortOrder: number;
      createdAt: string;
    };
  }>(`/v1/admin/vehicles/${vehicleId}/images`, { method: "POST", body: form });
  return mapImage(result.image);
}

export async function deleteImage(imageId: string) {
  return request<void>(`/v1/admin/images/${imageId}`, { method: "DELETE" });
}

export async function uploadCrlv(
  vehicleId: string,
  file: File,
  result: CrlvParseResult,
  hash: string,
  formValues: {
    plate: string;
    renavam: string;
    chassi: string;
    model: string;
    manufacturedYear: string;
    passengerCapacity: string;
  },
  status: string,
  fingerprint: string | null,
) {
  const form = new FormData();
  const confirmedData = {
    ...result.data,
    placa: formValues.plate,
    renavam: formValues.renavam || null,
    chassi: formValues.chassi || null,
    marca_modelo_versao: formValues.model.trim() || null,
    ano_fabricacao: formValues.manufacturedYear.trim() ? Number(formValues.manufacturedYear) : null,
    lotacao_pessoas: formValues.passengerCapacity.trim()
      ? Number(formValues.passengerCapacity)
      : null,
  };
  form.append("file", file, file.name);
  form.append("sha256", hash);
  if (fingerprint) form.append("fingerprint", fingerprint);
  form.append("metadata", JSON.stringify(result.data));
  form.append("confirmedData", JSON.stringify(confirmedData));
  form.append("pages", String(result.paginas));
  form.append("extractionStatus", status === "PRONTO" ? "APLICADO" : "REVISAR");
  form.append("extractionText", result.texto_extraido);
  form.append("extractionLayout", result.texto_layout);
  form.append("extractionError", result.data.erro_extracao ?? "");
  const response = await request<{ document: Record<string, unknown> }>(
    `/v1/admin/vehicles/${vehicleId}/documents/crlv`,
    { method: "POST", body: form },
  );
  return mapDocument(response.document);
}

export async function deleteDocument(documentId: string) {
  return request<void>(`/v1/admin/documents/${documentId}`, { method: "DELETE" });
}
