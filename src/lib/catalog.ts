export type OperationMode = "RENT" | "SALE" | "RENT_AND_SALE";
export type Availability = "AVAILABLE" | "ON_REQUEST" | "RESERVED";

export type CatalogVehicleImage = {
  id: string;
  vehicle_id: string;
  path: string;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
};

export type CatalogVehicleDocument = {
  id: string;
  vehicle_id: string;
  tipo_documento: "CRLV";
  arquivo_nome: string;
  mime_type: "application/pdf";
  tamanho_bytes: number;
  arquivo_hash_sha256: string;
  documento_fingerprint: string | null;
  paginas: number;
  versao_extrator: string;
  status_extracao: "OK" | "REVISAR" | "APLICADO";
  placa_extraida: string | null;
  renavam_extraido: string | null;
  chassi_extraido: string | null;
  dados_extraidos: Record<string, unknown>;
  dados_confirmados: Record<string, unknown>;
  texto_extraido: string;
  texto_layout: string;
  erro_extracao: string | null;
  documento_atual: boolean;
  created_at: string;
  updated_at: string;
};

export type CatalogPlateLookup = {
  status: "SUCCESS" | "INVALID_PLATE" | "NOT_FOUND" | "TOKEN_INVALID" | "QUOTA_EXCEEDED" | "ERROR";
  plate: string | null;
  cacheHit: boolean;
  providerHttpStatus: number | null;
  message: string | null;
  snapshot: {
    brand: string | null;
    model: string | null;
    makeModel: string | null;
    year: string | null;
    modelYear: string | null;
    color: string | null;
    situation: string | null;
    state: string | null;
    origin: string | null;
    logoUrl: string | null;
  } | null;
  checkedAt: string | null;
  applied: boolean;
};

export type CatalogVehicle = {
  id: string;
  slug: string;
  title: string;
  category: string;
  operation_mode: OperationMode;
  availability: Availability;
  brand: string | null;
  model: string | null;
  manufactured_year: number | null;
  passenger_capacity: number | null;
  mileage_km: number | null;
  plate: string | null;
  renavam: string | null;
  chassi: string | null;
  air_conditioned: boolean;
  location: string | null;
  price_cents: number | null;
  currency: "BRL";
  description: string;
  features: string[];
  is_featured: boolean;
  sort_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  catalog_vehicle_images?: CatalogVehicleImage[];
  catalog_vehicle_documents?: CatalogVehicleDocument[];
  plate_lookup?: CatalogPlateLookup | null;
};

export const operationModeLabel: Record<OperationMode, string> = {
  RENT: "Locação",
  SALE: "Venda",
  RENT_AND_SALE: "Locação e venda",
};

export const availabilityLabel: Record<Availability, string> = {
  AVAILABLE: "Disponível",
  ON_REQUEST: "Sob consulta",
  RESERVED: "Reservado",
};

export function getCatalogImageUrls(paths: string[]) {
  return Object.fromEntries(paths.map((path) => [path, path]));
}
