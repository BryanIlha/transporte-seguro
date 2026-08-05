create table public.catalog_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.catalog_vehicles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  operation_mode text not null check (operation_mode in ('RENT', 'SALE', 'RENT_AND_SALE')),
  availability text not null default 'ON_REQUEST'
    check (availability in ('AVAILABLE', 'ON_REQUEST', 'RESERVED')),
  brand text,
  model text,
  manufactured_year integer check (manufactured_year between 1950 and 2100),
  passenger_capacity integer check (passenger_capacity > 0),
  mileage_km integer check (mileage_km >= 0),
  air_conditioned boolean not null default false,
  location text,
  price_cents bigint check (price_cents >= 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  description text not null default '',
  features text[] not null default '{}',
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_vehicles_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.catalog_vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.catalog_vehicles (id) on delete cascade,
  path text not null unique,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index catalog_vehicles_public_order_idx
  on public.catalog_vehicles (is_featured desc, sort_order asc, published_at desc)
  where published_at is not null;

create index catalog_vehicle_images_vehicle_order_idx
  on public.catalog_vehicle_images (vehicle_id, sort_order asc);

alter table public.catalog_admins enable row level security;
alter table public.catalog_vehicles enable row level security;
alter table public.catalog_vehicle_images enable row level security;

grant select on public.catalog_vehicles, public.catalog_vehicle_images to anon, authenticated;
grant insert, update, delete on public.catalog_vehicles, public.catalog_vehicle_images to authenticated;
grant select on public.catalog_admins to authenticated;

create policy "Catalog admins can view their own access"
on public.catalog_admins
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Public users can read published catalog vehicles"
on public.catalog_vehicles
for select
to anon, authenticated
using (published_at is not null);

create policy "Catalog admins can manage catalog vehicles"
on public.catalog_vehicles
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

create policy "Public users can read images for published catalog vehicles"
on public.catalog_vehicle_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.catalog_vehicles
    where catalog_vehicles.id = catalog_vehicle_images.vehicle_id
      and catalog_vehicles.published_at is not null
  )
);

create policy "Catalog admins can manage catalog vehicle images"
on public.catalog_vehicle_images
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
  'catalog-vehicle-images',
  'catalog-vehicle-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Public users can read files for published catalog vehicles"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'catalog-vehicle-images'
  and exists (
    select 1
    from public.catalog_vehicle_images
    join public.catalog_vehicles
      on catalog_vehicles.id = catalog_vehicle_images.vehicle_id
    where catalog_vehicle_images.path = name
      and catalog_vehicles.published_at is not null
  )
);

create policy "Catalog admins can manage catalog image files"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'catalog-vehicle-images'
  and exists (
    select 1
    from public.catalog_admins
    where catalog_admins.user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'catalog-vehicle-images'
  and exists (
    select 1
    from public.catalog_admins
    where catalog_admins.user_id = (select auth.uid())
  )
);
