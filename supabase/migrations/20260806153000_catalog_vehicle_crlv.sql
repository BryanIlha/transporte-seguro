alter table public.catalog_vehicles
  add column if not exists plate text,
  add column if not exists renavam text,
  add column if not exists chassi text;

create unique index if not exists catalog_vehicles_plate_key_idx
  on public.catalog_vehicles (upper(regexp_replace(plate, '[^A-Za-z0-9]', '', 'g')))
  where plate is not null;

create table if not exists public.catalog_vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.catalog_vehicles (id) on delete cascade,
  tipo_documento text not null default 'CRLV' check (tipo_documento = 'CRLV'),
  arquivo_nome text not null,
  storage_bucket text not null default 'catalog-vehicle-documents',
  storage_path text not null unique,
  mime_type text not null default 'application/pdf' check (mime_type = 'application/pdf'),
  tamanho_bytes bigint not null check (tamanho_bytes > 0),
  arquivo_hash_sha256 text not null unique,
  documento_fingerprint text,
  paginas integer not null default 1 check (paginas > 0),
  versao_extrator text not null default 'crlv-ts-v1',
  status_extracao text not null check (status_extracao in ('OK', 'REVISAR', 'APLICADO')),
  placa_extraida text,
  renavam_extraido text,
  chassi_extraido text,
  dados_extraidos jsonb not null default '{}'::jsonb,
  dados_confirmados jsonb not null default '{}'::jsonb,
  texto_extraido text not null default '',
  texto_layout text not null default '',
  erro_extracao text,
  documento_atual boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists catalog_vehicle_documents_fingerprint_idx
  on public.catalog_vehicle_documents (documento_fingerprint)
  where documento_fingerprint is not null;

create index if not exists catalog_vehicle_documents_vehicle_idx
  on public.catalog_vehicle_documents (vehicle_id, documento_atual, created_at desc);

alter table public.catalog_vehicle_documents enable row level security;

grant select, insert, update, delete on public.catalog_vehicle_documents to authenticated;

drop policy if exists "Catalog admins can manage vehicle documents"
  on public.catalog_vehicle_documents;

create policy "Catalog admins can manage vehicle documents"
on public.catalog_vehicle_documents
for all
to authenticated
using (
  exists (
    select 1
    from public.catalog_admins
    where catalog_admins.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.catalog_admins
    where catalog_admins.user_id = (select auth.uid())
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-vehicle-documents',
  'catalog-vehicle-documents',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "Catalog admins can manage vehicle document files"
  on storage.objects;

create policy "Catalog admins can manage vehicle document files"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'catalog-vehicle-documents'
  and exists (
    select 1
    from public.catalog_admins
    where catalog_admins.user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'catalog-vehicle-documents'
  and exists (
    select 1
    from public.catalog_admins
    where catalog_admins.user_id = (select auth.uid())
  )
);
