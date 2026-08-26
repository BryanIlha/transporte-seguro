create table if not exists app_metadata (
  project_key text primary key,
  created_at timestamptz not null default now()
);

insert into app_metadata (project_key) values ('transporte-seguro') on conflict do nothing;

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admin_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_sessions_expires_at_idx on admin_sessions(expires_at);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  operation_mode text not null check (operation_mode in ('RENT','SALE','RENT_AND_SALE')),
  availability text not null check (availability in ('AVAILABLE','ON_REQUEST','RESERVED')),
  brand text,
  model text,
  manufactured_year integer check (manufactured_year is null or manufactured_year between 1950 and 2100),
  passenger_capacity integer check (passenger_capacity is null or passenger_capacity > 0),
  mileage_km integer check (mileage_km is null or mileage_km >= 0),
  plate text,
  renavam text,
  chassi text,
  air_conditioned boolean not null default true,
  location text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  description text not null default '',
  features jsonb not null default '[]'::jsonb,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists vehicles_plate_unique on vehicles(lower(plate)) where plate is not null and plate <> '';
create unique index if not exists vehicles_renavam_unique on vehicles(renavam) where renavam is not null and renavam <> '';
create unique index if not exists vehicles_chassi_unique on vehicles(upper(chassi)) where chassi is not null and chassi <> '';
create index if not exists vehicles_catalog_order_idx on vehicles(is_featured desc, sort_order asc, published_at desc);

create table if not exists vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  storage_name text not null,
  alt_text text,
  mime_type text not null,
  size_bytes integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists vehicle_images_vehicle_idx on vehicle_images(vehicle_id, sort_order);

create table if not exists vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  type text not null default 'CRLV' check (type = 'CRLV'),
  filename text not null,
  storage_name text not null,
  mime_type text not null default 'application/pdf',
  size_bytes integer not null,
  sha256 text not null unique,
  fingerprint text,
  pages integer not null default 0,
  extractor_version text not null default 'crlv-ts-v1',
  extraction_status text not null default 'REVISAR' check (extraction_status in ('OK','REVISAR','APLICADO')),
  extracted_plate text,
  extracted_renavam text,
  extracted_chassi text,
  extracted_data jsonb not null default '{}'::jsonb,
  confirmed_data jsonb not null default '{}'::jsonb,
  extraction_text text not null default '',
  extraction_layout text not null default '',
  extraction_error text,
  current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vehicle_documents_vehicle_idx on vehicle_documents(vehicle_id, current);
create index if not exists vehicle_documents_fingerprint_idx on vehicle_documents(fingerprint) where fingerprint is not null;
