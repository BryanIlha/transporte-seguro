import {
  boolean,
  integer,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const appMetadata = pgTable("app_metadata", {
  projectKey: text("project_key").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (table) => ({ emailUnique: uniqueIndex("admin_users_email_unique").on(table.email) }),
);

export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminId: uuid("admin_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    operationMode: text("operation_mode").notNull(),
    availability: text("availability").notNull(),
    brand: text("brand"),
    model: text("model"),
    manufacturedYear: integer("manufactured_year"),
    passengerCapacity: integer("passenger_capacity"),
    mileageKm: integer("mileage_km"),
    plate: text("plate"),
    renavam: text("renavam"),
    chassi: text("chassi"),
    apiPlacasStatus: text("apiplacas_status"),
    apiPlacasBrand: text("apiplacas_marca"),
    apiPlacasModel: text("apiplacas_modelo"),
    apiPlacasMakeModel: text("apiplacas_marca_modelo"),
    apiPlacasYear: text("apiplacas_ano"),
    apiPlacasModelYear: text("apiplacas_ano_modelo"),
    apiPlacasColor: text("apiplacas_cor"),
    apiPlacasSituation: text("apiplacas_situacao"),
    apiPlacasUf: text("apiplacas_uf"),
    apiPlacasOrigin: text("apiplacas_origem"),
    apiPlacasLogoUrl: text("apiplacas_logo_url"),
    apiPlacasCheckedAt: timestamp("apiplacas_consultado_em", { withTimezone: true }),
    airConditioned: boolean("air_conditioned").default(true).notNull(),
    location: text("location"),
    priceCents: integer("price_cents"),
    description: text("description").default("").notNull(),
    features: jsonb("features").$type<string[]>().default([]).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ slugUnique: uniqueIndex("vehicles_slug_unique").on(table.slug) }),
);

export const apiPlacasLookups = pgTable(
  "apiplacas_lookups",
  {
    plateKey: text("plate_key").primaryKey(),
    plateQueried: text("plate_queried").notNull(),
    status: text("status").notNull(),
    providerHttpStatus: integer("provider_http_status"),
    providerMessage: text("provider_message"),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().default({}).notNull(),
    rawPayload: jsonb("raw_payload").$type<unknown>(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ checkedAtIdx: index("apiplacas_lookups_checked_at_idx").on(table.checkedAt) }),
);

export const vehicleImages = pgTable("vehicle_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  storageName: text("storage_name").notNull(),
  altText: text("alt_text"),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const vehicleDocuments = pgTable(
  "vehicle_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    type: text("type").default("CRLV").notNull(),
    filename: text("filename").notNull(),
    storageName: text("storage_name").notNull(),
    mimeType: text("mime_type").default("application/pdf").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    fingerprint: text("fingerprint"),
    pages: integer("pages").default(0).notNull(),
    extractorVersion: text("extractor_version").default("crlv-ts-v1").notNull(),
    extractionStatus: text("extraction_status").default("REVISAR").notNull(),
    extractedPlate: text("extracted_plate"),
    extractedRenavam: text("extracted_renavam"),
    extractedChassi: text("extracted_chassi"),
    extractedData: jsonb("extracted_data").$type<Record<string, unknown>>().default({}).notNull(),
    confirmedData: jsonb("confirmed_data").$type<Record<string, unknown>>().default({}).notNull(),
    extractionText: text("extraction_text").default("").notNull(),
    extractionLayout: text("extraction_layout").default("").notNull(),
    extractionError: text("extraction_error"),
    current: boolean("current").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ shaUnique: uniqueIndex("vehicle_documents_sha256_unique").on(table.sha256) }),
);

export type AppMetadata = typeof appMetadata.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type VehicleImage = typeof vehicleImages.$inferSelect;
export type VehicleDocument = typeof vehicleDocuments.$inferSelect;
export type ApiPlacasLookup = typeof apiPlacasLookups.$inferSelect;
