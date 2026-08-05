drop policy "Public users can read published catalog vehicles" on public.catalog_vehicles;
drop policy "Catalog admins can manage catalog vehicles" on public.catalog_vehicles;
drop policy "Public users can read images for published catalog vehicles" on public.catalog_vehicle_images;
drop policy "Catalog admins can manage catalog vehicle images" on public.catalog_vehicle_images;
drop policy "Public users can read files for published catalog vehicles" on storage.objects;
drop policy "Catalog admins can manage catalog image files" on storage.objects;

create policy "Published catalog vehicles or full admin access"
on public.catalog_vehicles
for select
to anon, authenticated
using (
  published_at is not null
  or exists (
    select 1
    from public.catalog_admins
    where catalog_admins.user_id = (select auth.uid())
  )
);

create policy "Catalog admins can create catalog vehicles"
on public.catalog_vehicles
for insert
to authenticated
with check (
  exists (
    select 1
    from public.catalog_admins
    where catalog_admins.user_id = (select auth.uid())
  )
);

create policy "Catalog admins can update catalog vehicles"
on public.catalog_vehicles
for update
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

create policy "Catalog admins can delete catalog vehicles"
on public.catalog_vehicles
for delete
to authenticated
using (
  exists (
    select 1
    from public.catalog_admins
    where catalog_admins.user_id = (select auth.uid())
  )
);

create policy "Published catalog images or full admin access"
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
  or exists (
    select 1
    from public.catalog_admins
    where catalog_admins.user_id = (select auth.uid())
  )
);

create policy "Catalog admins can create catalog vehicle images"
on public.catalog_vehicle_images
for insert
to authenticated
with check (
  exists (
    select 1
    from public.catalog_admins
    where catalog_admins.user_id = (select auth.uid())
  )
);

create policy "Catalog admins can update catalog vehicle images"
on public.catalog_vehicle_images
for update
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

create policy "Catalog admins can delete catalog vehicle images"
on public.catalog_vehicle_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.catalog_admins
    where catalog_admins.user_id = (select auth.uid())
  )
);

create policy "Published catalog files or full admin access"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'catalog-vehicle-images'
  and (
    exists (
      select 1
      from public.catalog_vehicle_images
      join public.catalog_vehicles
        on catalog_vehicles.id = catalog_vehicle_images.vehicle_id
      where catalog_vehicle_images.path = name
        and catalog_vehicles.published_at is not null
    )
    or exists (
      select 1
      from public.catalog_admins
      where catalog_admins.user_id = (select auth.uid())
    )
  )
);

create policy "Catalog admins can create catalog image files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'catalog-vehicle-images'
  and exists (
    select 1
    from public.catalog_admins
    where catalog_admins.user_id = (select auth.uid())
  )
);

create policy "Catalog admins can update catalog image files"
on storage.objects
for update
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

create policy "Catalog admins can delete catalog image files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'catalog-vehicle-images'
  and exists (
    select 1
    from public.catalog_admins
    where catalog_admins.user_id = (select auth.uid())
  )
);
