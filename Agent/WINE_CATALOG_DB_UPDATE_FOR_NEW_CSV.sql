-- Patch DB for new wine catalog CSV headers
-- Date: 2026-06-02
-- Safe to run multiple times (idempotent)

begin;

-- ---------------------------------------------------------------------------
-- 1) Staging table alignment (CSV import compatibility)
-- ---------------------------------------------------------------------------
alter table public.wine_import_staging
  add column if not exists normalized_name text,
  add column if not exists normalized_producer text,
  add column if not exists quiz_region text,
  add column if not exists quiz_appellation text,
  add column if not exists wine_type text,
  add column if not exists quiz_price_band text,
  add column if not exists data_source text,
  add column if not exists external_source_id text,
  add column if not exists elaborate text,
  add column if not exists harmonize text,
  add column if not exists body text,
  add column if not exists acidity text,
  add column if not exists website text,
  add column if not exists vintages text,
  add column if not exists updated_at timestamptz,
  add column if not exists search_tokens text;

-- Keep potentially mixed CSV fields as text in staging
alter table public.wine_import_staging
  alter column processed set default false;

-- ---------------------------------------------------------------------------
-- 2) Canonical model extension (persist useful new metadata)
-- ---------------------------------------------------------------------------
alter table public.wine_labels
  add column if not exists quiz_region text,
  add column if not exists quiz_appellation text,
  add column if not exists quiz_price_band text,
  add column if not exists body text,
  add column if not exists acidity text,
  add column if not exists elaborate text,
  add column if not exists harmonize text,
  add column if not exists search_tokens text;

alter table public.wine_vintages
  add column if not exists external_id text,
  add column if not exists price_min numeric(10,2),
  add column if not exists price_max numeric(10,2),
  add column if not exists price_band text;

alter table public.wine_sources
  add column if not exists data_source text,
  add column if not exists external_source_id text;

-- website is already modeled as wine_producers.website_url (reuse it)

-- ---------------------------------------------------------------------------
-- 3) Helpful indexes for new external/source fields
-- ---------------------------------------------------------------------------
create index if not exists wine_vintages_external_id_idx
  on public.wine_vintages (external_id);

create index if not exists wine_sources_external_source_id_idx
  on public.wine_sources (external_source_id);

create index if not exists wine_sources_data_source_idx
  on public.wine_sources (data_source);

-- ---------------------------------------------------------------------------
-- 4) Update wine_catalog compatibility view (expose new label/vintage columns)
-- ---------------------------------------------------------------------------
create or replace view public.wine_catalog as
select
  v.id,
  v.external_id,
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
  v.updated_at,
  wl.quiz_region,
  wl.quiz_appellation,
  v.price_band,
  wl.quiz_price_band,
  wl.search_tokens,
  wl.body,
  wl.acidity,
  wl.elaborate,
  wl.harmonize,
  v.price_min,
  v.price_max
from public.wine_vintages v
join public.wine_labels wl on wl.id = v.wine_label_id
left join public.wine_producers wp on wp.id = wl.producer_id;

commit;

-- Optional checks
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('wine_import_staging', 'wine_labels', 'wine_vintages', 'wine_sources')
-- order by table_name, ordinal_position;
