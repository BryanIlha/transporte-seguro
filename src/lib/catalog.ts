import { supabase } from "./supabase";

export const CATALOG_IMAGE_BUCKET = "catalog-vehicle-images";

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

export async function getCatalogImageUrls(paths: string[], expiresIn = 60 * 60) {
  const client = supabase;
  if (!client || paths.length === 0) return {};

  const signedUrls = await Promise.all(
    paths.map(async (path) => {
      const { data } = await client.storage
        .from(CATALOG_IMAGE_BUCKET)
        .createSignedUrl(path, expiresIn);

      return [path, data?.signedUrl] as const;
    }),
  );

  return Object.fromEntries(
    signedUrls.filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  );
}
