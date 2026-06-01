-- Robust wine catalog schema (normalized) for automatic tasting creation
-- Run in Supabase SQL editor

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Utilities
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Core dictionary tables
-- ---------------------------------------------------------------------------

create table if not exists public.wine_producers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  country text,
  region text,
  website_url text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists wine_producers_normalized_name_uidx
  on public.wine_producers (normalized_name);

create index if not exists wine_producers_name_trgm_idx
  on public.wine_producers using gin (name gin_trgm_ops);

drop trigger if exists trg_wine_producers_updated_at on public.wine_producers;
create trigger trg_wine_producers_updated_at
before update on public.wine_producers
for each row execute procedure public.set_updated_at();

create table if not exists public.wine_grapes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  color text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists wine_grapes_normalized_name_uidx
  on public.wine_grapes (normalized_name);

drop trigger if exists trg_wine_grapes_updated_at on public.wine_grapes;
create trigger trg_wine_grapes_updated_at
before update on public.wine_grapes
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Canonical wines
-- ---------------------------------------------------------------------------

create table if not exists public.wine_labels (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid references public.wine_producers(id) on delete set null,
  name text not null,
  normalized_name text not null,
  appellation text,
  country text,
  region text,
  type text check (type in ('red', 'white', 'rose', 'sparkling', 'orange', 'dessert', 'fortified') or type is null),
  search_text text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wine_labels_producer_idx
  on public.wine_labels (producer_id);

create unique index if not exists wine_labels_canonical_uidx
  on public.wine_labels (normalized_name, producer_id, coalesce(appellation, ''));

create index if not exists wine_labels_search_text_trgm_idx
  on public.wine_labels using gin (search_text gin_trgm_ops);

drop trigger if exists trg_wine_labels_updated_at on public.wine_labels;
create trigger trg_wine_labels_updated_at
before update on public.wine_labels
for each row execute procedure public.set_updated_at();

create table if not exists public.wine_label_grapes (
  wine_label_id uuid not null references public.wine_labels(id) on delete cascade,
  grape_id uuid not null references public.wine_grapes(id) on delete restrict,
  percentage numeric(5,2),
  primary key (wine_label_id, grape_id)
);

create index if not exists wine_label_grapes_grape_idx
  on public.wine_label_grapes (grape_id);

create table if not exists public.wine_vintages (
  id uuid primary key default gen_random_uuid(),
  wine_label_id uuid not null references public.wine_labels(id) on delete cascade,
  vintage int,
  ean text,
  abv numeric(5, 2),
  price numeric(10, 2),
  currency text,
  image_url text,
  confidence numeric(4, 3),
  notes text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wine_vintages_label_idx
  on public.wine_vintages (wine_label_id);

create index if not exists wine_vintages_ean_idx
  on public.wine_vintages (ean);

create unique index if not exists wine_vintages_label_vintage_uidx
  on public.wine_vintages (wine_label_id, coalesce(vintage, -1));

drop trigger if exists trg_wine_vintages_updated_at on public.wine_vintages;
create trigger trg_wine_vintages_updated_at
before update on public.wine_vintages
for each row execute procedure public.set_updated_at();

create table if not exists public.wine_sources (
  id uuid primary key default gen_random_uuid(),
  wine_vintage_id uuid not null references public.wine_vintages(id) on delete cascade,
  source text not null,
  source_url text,
  price numeric(10,2),
  currency text,
  scraped_at timestamptz,
  confidence numeric(4,3),
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wine_sources_vintage_idx
  on public.wine_sources (wine_vintage_id);

create index if not exists wine_sources_source_idx
  on public.wine_sources (source);

drop trigger if exists trg_wine_sources_updated_at on public.wine_sources;
create trigger trg_wine_sources_updated_at
before update on public.wine_sources
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Import staging table (CSV/Excel ingestion)
-- ---------------------------------------------------------------------------

create table if not exists public.wine_import_staging (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid,
  external_id text,
  ean text,
  name text,
  name_normalized text,
  producer text,
  producer_normalized text,
  country text,
  region text,
  appellation text,
  type text,
  grapes text,
  grapes_normalized text,
  vintage int,
  abv numeric(5,2),
  price numeric(10,2),
  currency text,
  image_url text,
  source text,
  source_url text,
  scraped_at timestamptz,
  last_updated timestamptz,
  confidence numeric(4,3),
  search_text text,
  dedupe_key text,
  notes text,
  raw_row jsonb,
  reference_price text,
  price_band text,
  ocr_search_text text,
  quiz_tags text,
  data_quality_score text,
  import_ready boolean,
  is_active boolean,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists wine_import_staging_batch_idx
  on public.wine_import_staging (batch_id);

create index if not exists wine_import_staging_processed_idx
  on public.wine_import_staging (processed);

-- Keep staging compatible with evolving CSV headers/types.
alter table public.wine_import_staging
  add column if not exists reference_price text,
  add column if not exists price_band text,
  add column if not exists ocr_search_text text,
  add column if not exists quiz_tags text,
  add column if not exists data_quality_score text,
  add column if not exists import_ready boolean,
  add column if not exists is_active boolean;

alter table public.wine_import_staging
  alter column reference_price type text using reference_price::text,
  alter column data_quality_score type text using data_quality_score::text;

-- ---------------------------------------------------------------------------
-- Compatibility views (for existing pages / admin tools)
-- ---------------------------------------------------------------------------

create or replace view public.wine_catalog as
select
  v.id,
  null::text as external_id,
  v.ean,
  wl.name,
  wl.normalized_name as name_normalized,
  wp.name as producer,
  wp.normalized_name as producer_normalized,
  wl.country,
  wl.region,
  wl.appellation,
  wl.type,
  (
    select array_agg(g.name order by g.name)
    from public.wine_label_grapes wlg
    join public.wine_grapes g on g.id = wlg.grape_id
    where wlg.wine_label_id = wl.id
  ) as grapes,
  (
    select array_agg(g.normalized_name order by g.normalized_name)
    from public.wine_label_grapes wlg
    join public.wine_grapes g on g.id = wlg.grape_id
    where wlg.wine_label_id = wl.id
  ) as grapes_normalized,
  v.vintage,
  v.abv,
  v.price,
  v.currency,
  v.image_url,
  null::text as source,
  null::text as source_url,
  v.first_seen_at as scraped_at,
  v.last_seen_at as last_updated,
  v.confidence,
  wl.search_text,
  null::text as dedupe_key,
  coalesce(v.notes, wl.notes) as notes,
  wl.is_active,
  v.created_at,
  v.updated_at
from public.wine_vintages v
join public.wine_labels wl on wl.id = v.wine_label_id
left join public.wine_producers wp on wp.id = wl.producer_id;

create or replace view public.wine_catalog_producer_stats as
select
  coalesce(wp.name, 'Unknown') as producer,
  max(wl.country) as country,
  max(wl.region) as region,
  count(*)::bigint as wines_count,
  max(v.updated_at) as last_updated
from public.wine_vintages v
join public.wine_labels wl on wl.id = v.wine_label_id
left join public.wine_producers wp on wp.id = wl.producer_id
where wl.is_active = true
group by coalesce(wp.name, 'Unknown');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.wine_producers enable row level security;
alter table public.wine_grapes enable row level security;
alter table public.wine_labels enable row level security;
alter table public.wine_label_grapes enable row level security;
alter table public.wine_vintages enable row level security;
alter table public.wine_sources enable row level security;
alter table public.wine_import_staging enable row level security;

-- Read policy for authenticated users
drop policy if exists "wine_producers_read_all" on public.wine_producers;
create policy "wine_producers_read_all" on public.wine_producers
for select to authenticated using (true);

drop policy if exists "wine_grapes_read_all" on public.wine_grapes;
create policy "wine_grapes_read_all" on public.wine_grapes
for select to authenticated using (true);

drop policy if exists "wine_labels_read_all" on public.wine_labels;
create policy "wine_labels_read_all" on public.wine_labels
for select to authenticated using (true);

drop policy if exists "wine_label_grapes_read_all" on public.wine_label_grapes;
create policy "wine_label_grapes_read_all" on public.wine_label_grapes
for select to authenticated using (true);

drop policy if exists "wine_vintages_read_all" on public.wine_vintages;
create policy "wine_vintages_read_all" on public.wine_vintages
for select to authenticated using (true);

drop policy if exists "wine_sources_read_all" on public.wine_sources;
create policy "wine_sources_read_all" on public.wine_sources
for select to authenticated using (true);

drop policy if exists "wine_import_staging_read_all" on public.wine_import_staging;
create policy "wine_import_staging_read_all" on public.wine_import_staging
for select to authenticated using (true);

-- Admin write policy template
drop policy if exists "wine_producers_admin_write" on public.wine_producers;
create policy "wine_producers_admin_write" on public.wine_producers
for all to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.super_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.super_admin = true
  )
);

drop policy if exists "wine_grapes_admin_write" on public.wine_grapes;
create policy "wine_grapes_admin_write" on public.wine_grapes
for all to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.super_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.super_admin = true
  )
);

drop policy if exists "wine_labels_admin_write" on public.wine_labels;
create policy "wine_labels_admin_write" on public.wine_labels
for all to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.super_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.super_admin = true
  )
);

drop policy if exists "wine_label_grapes_admin_write" on public.wine_label_grapes;
create policy "wine_label_grapes_admin_write" on public.wine_label_grapes
for all to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.super_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.super_admin = true
  )
);

drop policy if exists "wine_vintages_admin_write" on public.wine_vintages;
create policy "wine_vintages_admin_write" on public.wine_vintages
for all to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.super_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.super_admin = true
  )
);

drop policy if exists "wine_sources_admin_write" on public.wine_sources;
create policy "wine_sources_admin_write" on public.wine_sources
for all to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.super_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.super_admin = true
  )
);

drop policy if exists "wine_import_staging_admin_write" on public.wine_import_staging;
create policy "wine_import_staging_admin_write" on public.wine_import_staging
for all to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.super_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.super_admin = true
  )
);
