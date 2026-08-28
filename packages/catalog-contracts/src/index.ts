import { z } from "zod";

export const operationModeSchema = z.enum(["RENT", "SALE", "RENT_AND_SALE"]);
export const availabilitySchema = z.enum(["AVAILABLE", "ON_REQUEST", "RESERVED"]);
export const documentStatusSchema = z.enum(["OK", "REVISAR", "APLICADO"]);
export const apiPlacasStatusSchema = z.enum([
  "SUCCESS",
  "INVALID_PLATE",
  "NOT_FOUND",
  "TOKEN_INVALID",
  "QUOTA_EXCEEDED",
  "ERROR",
]);

export const apiPlacasSnapshotSchema = z.object({
  brand: z.string().nullable(),
  model: z.string().nullable(),
  makeModel: z.string().nullable(),
  year: z.string().nullable(),
  modelYear: z.string().nullable(),
  color: z.string().nullable(),
  situation: z.string().nullable(),
  state: z.string().nullable(),
  origin: z.string().nullable(),
  logoUrl: z.string().url().nullable(),
});

export const plateLookupInputSchema = z.object({
  plate: z.string().trim().min(1).max(20),
  vehicleId: z.string().uuid().optional(),
  refresh: z.boolean().optional().default(false),
});

export const plateLookupResultSchema = z.object({
  status: apiPlacasStatusSchema,
  plate: z.string().nullable(),
  cacheHit: z.boolean(),
  providerHttpStatus: z.number().int().nullable(),
  message: z.string().nullable(),
  snapshot: apiPlacasSnapshotSchema.nullable(),
  checkedAt: z.string().datetime().nullable(),
  applied: z.boolean(),
});

export const vehicleImageSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string().uuid(),
  url: z.string().url(),
  altText: z.string().nullable(),
  sortOrder: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export const vehicleDocumentSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string().uuid(),
  type: z.literal("CRLV"),
  filename: z.string(),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  fingerprint: z.string().nullable(),
  pages: z.number().int().nonnegative(),
  extractorVersion: z.string(),
  extractionStatus: documentStatusSchema,
  extractedPlate: z.string().nullable(),
  extractedRenavam: z.string().nullable(),
  extractedChassi: z.string().nullable(),
  extractedData: z.record(z.unknown()),
  confirmedData: z.record(z.unknown()),
  extractionText: z.string(),
  extractionLayout: z.string(),
  extractionError: z.string().nullable(),
  current: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const vehicleSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  category: z.string(),
  operationMode: operationModeSchema,
  availability: availabilitySchema,
  brand: z.string().nullable(),
  model: z.string().nullable(),
  manufacturedYear: z.number().int().nullable(),
  passengerCapacity: z.number().int().nullable(),
  mileageKm: z.number().int().nullable(),
  plate: z.string().nullable(),
  renavam: z.string().nullable(),
  chassi: z.string().nullable(),
  airConditioned: z.boolean(),
  location: z.string().nullable(),
  priceCents: z.number().int().nullable(),
  currency: z.literal("BRL"),
  description: z.string(),
  features: z.array(z.string()),
  isFeatured: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  images: z.array(vehicleImageSchema),
  documents: z.array(vehicleDocumentSchema).optional(),
});

export const vehicleInputSchema = z.object({
  title: z.string().trim().min(1).max(180),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.string().trim().min(1).max(100),
  operationMode: operationModeSchema,
  availability: availabilitySchema,
  brand: z.string().trim().max(100).nullable().optional(),
  model: z.string().trim().max(180).nullable().optional(),
  plate: z.string().trim().max(20).nullable().optional(),
  renavam: z.string().trim().max(30).nullable().optional(),
  chassi: z.string().trim().max(40).nullable().optional(),
  manufacturedYear: z.number().int().min(1950).max(2100).nullable().optional(),
  passengerCapacity: z.number().int().min(1).max(1000).nullable().optional(),
  mileageKm: z.number().int().min(0).max(10000000).nullable().optional(),
  airConditioned: z.boolean().default(true),
  location: z.string().trim().max(180).nullable().optional(),
  priceCents: z.number().int().min(0).max(2000000000).nullable().optional(),
  description: z.string().max(10000).default(""),
  features: z.array(z.string().trim().min(1).max(180)).max(100).default([]),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  publishedAt: z.string().datetime().nullable().optional(),
});

export const loginInputSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
});

export type OperationMode = z.infer<typeof operationModeSchema>;
export type Availability = z.infer<typeof availabilitySchema>;
export type Vehicle = z.infer<typeof vehicleSchema>;
export type VehicleImage = z.infer<typeof vehicleImageSchema>;
export type VehicleDocument = z.infer<typeof vehicleDocumentSchema>;
export type VehicleInput = z.infer<typeof vehicleInputSchema>;
export type ApiPlacasStatus = z.infer<typeof apiPlacasStatusSchema>;
export type ApiPlacasSnapshot = z.infer<typeof apiPlacasSnapshotSchema>;
export type PlateLookupInput = z.infer<typeof plateLookupInputSchema>;
export type PlateLookupResult = z.infer<typeof plateLookupResultSchema>;
