alter table vehicles add column if not exists apiplacas_status text;
alter table vehicles add column if not exists apiplacas_marca text;
alter table vehicles add column if not exists apiplacas_modelo text;
alter table vehicles add column if not exists apiplacas_marca_modelo text;
alter table vehicles add column if not exists apiplacas_ano text;
alter table vehicles add column if not exists apiplacas_ano_modelo text;
alter table vehicles add column if not exists apiplacas_cor text;
alter table vehicles add column if not exists apiplacas_situacao text;
alter table vehicles add column if not exists apiplacas_uf text;
alter table vehicles add column if not exists apiplacas_origem text;
alter table vehicles add column if not exists apiplacas_logo_url text;
alter table vehicles add column if not exists apiplacas_consultado_em timestamptz;

create table if not exists apiplacas_lookups (
  plate_key text primary key,
  plate_queried text not null,
  status text not null,
  provider_http_status integer,
  provider_message text,
  snapshot jsonb not null default '{}'::jsonb,
  raw_payload jsonb,
  checked_at timestamptz not null default now()
);
create index if not exists apiplacas_lookups_checked_at_idx on apiplacas_lookups(checked_at);
