-- Wine catalog import pipeline
-- Prerequisite: run WINE_CATALOG_SCHEMA.sql first
-- Usage:
-- 1) Import CSV rows into public.wine_import_staging (Dashboard -> Table Editor -> Import)
-- 2) Run this file in Supabase SQL Editor
-- 3) Repeat execution until unprocessed_rows = 0 (one chunk per run)
-- 4) Validate results with final SELECTs at bottom

-- Performance notes:
-- - This script processes exactly one batch_id and a limited number of rows per run
-- - Heavy parsing/join keys are computed once in a temp table and reused

begin;

-- Optional: ensure new rows without batch_id get one batch id
with generated as (
  select gen_random_uuid() as batch_id
)
update public.wine_import_staging s
set batch_id = g.batch_id
from generated g
where s.batch_id is null
  and s.processed = false;

-- Pick one batch and only a limited number of rows per run.
-- Keep this small in SQL Editor to avoid upstream timeout.
-- Tune the LIMIT below if needed (e.g. 250 / 500 / 1000).
create temporary table _target_rows on commit drop as
with target_batch as (
  select s.batch_id
  from public.wine_import_staging s
  where s.processed = false
  order by s.batch_id
  limit 1
)
select s.id as staging_id, s.batch_id
from public.wine_import_staging s
join target_batch tb
  on tb.batch_id = s.batch_id
where s.processed = false
order by s.id
limit 500;

-- Pre-parse all values used by downstream steps once
create temporary table _import_rows on commit drop as
select
  s.id as staging_id,
  s.batch_id,
  trim(coalesce(s.producer_normalized, s.normalized_producer)) as producer_norm_key,
  trim(s.producer) as producer_name,
  trim(coalesce(s.name_normalized, s.normalized_name)) as label_norm_key,
  trim(s.name) as label_name,
  nullif(trim(s.appellation), '') as appellation,
  coalesce(nullif(trim(s.appellation), ''), '') as appellation_key,
  nullif(trim(s.country), '') as country,
  nullif(trim(s.region), '') as region,
  case lower(trim(coalesce(s.type, s.wine_type, '')))
    when 'red' then 'red'
    when 'white' then 'white'
    when 'rose' then 'rose'
    when 'rosé' then 'rose'
    when 'sparkling' then 'sparkling'
    when 'orange' then 'orange'
    when 'dessert' then 'dessert'
    when 'fortified' then 'fortified'
    else null
  end as type,
  nullif(trim(coalesce(s.search_text, s.search_tokens)), '') as search_text,
  nullif(trim(s.notes), '') as notes,
  case
    when nullif(trim(s.vintage::text), '') ~ '^-?\d+$'
      then trim(s.vintage::text)::int
    else null
  end as vintage_int,
  case
    when nullif(trim(s.abv::text), '') ~ '^-?\d+([.,]\d+)?$'
      then replace(trim(s.abv::text), ',', '.')::numeric
    else null
  end as abv_num,
  case
    when nullif(trim(s.price::text), '') ~ '^-?\d+([.,]\d+)?$'
      then replace(trim(s.price::text), ',', '.')::numeric
    else null
  end as price_num,
  case
    when nullif(trim(s.confidence::text), '') ~ '^-?\d+([.,]\d+)?$' then
      case
        -- Canonical confidence range
        when replace(trim(s.confidence::text), ',', '.')::numeric between 0 and 1
          then round(replace(trim(s.confidence::text), ',', '.')::numeric, 3)
        -- Common CSV format: percentage (e.g. 87.5 => 0.875)
        when replace(trim(s.confidence::text), ',', '.')::numeric > 1
         and replace(trim(s.confidence::text), ',', '.')::numeric <= 100
          then round(replace(trim(s.confidence::text), ',', '.')::numeric / 100.0, 3)
        else null
      end
    else null
  end as confidence_num,
  nullif(trim(s.ean), '') as ean,
  nullif(trim(s.currency), '') as currency,
  nullif(trim(s.image_url), '') as image_url,
  coalesce(s.grapes_normalized, s.grapes, '') as grapes_csv,
  coalesce(nullif(trim(s.source), ''), 'unknown') as source,
  nullif(trim(s.source_url), '') as source_url,
  s.scraped_at,
  coalesce(s.last_updated, s.updated_at, s.scraped_at) as last_seen_at
from public.wine_import_staging s
join _target_rows tr
  on tr.staging_id = s.id
where s.processed = false;

-- ---------------------------------------------------------------------------
-- 1) Producers
-- ---------------------------------------------------------------------------
insert into public.wine_producers (
  name,
  normalized_name,
  country,
  region
)
select
  x.name,
  x.normalized_name,
  x.country,
  x.region
from (
  select distinct on (r.producer_norm_key)
    r.producer_name as name,
    r.producer_norm_key as normalized_name,
    r.country,
    r.region
  from _import_rows r
  where coalesce(r.producer_name, '') <> ''
    and coalesce(r.producer_norm_key, '') <> ''
  order by
    r.producer_norm_key,
    (r.country is not null) desc,
    (r.region is not null) desc,
    r.producer_name
) x
on conflict (normalized_name) do update
set
  name = excluded.name,
  country = coalesce(excluded.country, public.wine_producers.country),
  region = coalesce(excluded.region, public.wine_producers.region),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2) Wine labels (canonical wine)
-- ---------------------------------------------------------------------------
insert into public.wine_labels (
  producer_id,
  name,
  normalized_name,
  appellation,
  country,
  region,
  type,
  search_text,
  notes
)
select
  x.producer_id,
  x.name,
  x.normalized_name,
  x.appellation,
  x.country,
  x.region,
  x.type,
  x.search_text,
  x.notes
from (
  select distinct on (
    r.label_norm_key,
    p.id,
    r.appellation_key
  )
    p.id as producer_id,
    r.label_name as name,
    r.label_norm_key as normalized_name,
    r.appellation,
    r.country,
    r.region,
    r.type,
    r.search_text,
    r.notes
  from _import_rows r
  left join public.wine_producers p
    on p.normalized_name = r.producer_norm_key
  where coalesce(r.label_name, '') <> ''
    and coalesce(r.label_norm_key, '') <> ''
  order by
    r.label_norm_key,
    p.id,
    r.appellation_key,
    (r.search_text is not null) desc
) x
on conflict (normalized_name, producer_id, coalesce(appellation, ''))
do update
set
  name = excluded.name,
  country = coalesce(excluded.country, public.wine_labels.country),
  region = coalesce(excluded.region, public.wine_labels.region),
  type = coalesce(excluded.type, public.wine_labels.type),
  search_text = coalesce(excluded.search_text, public.wine_labels.search_text),
  notes = coalesce(excluded.notes, public.wine_labels.notes),
  updated_at = now();

-- Update existing labels with richer data when available
update public.wine_labels wl
set
  search_text = coalesce(r.search_text, wl.search_text),
  country = coalesce(r.country, wl.country),
  region = coalesce(r.region, wl.region),
  notes = coalesce(r.notes, wl.notes),
  type = coalesce(r.type, wl.type),
  updated_at = now()
from _import_rows r
left join public.wine_producers p
  on p.normalized_name = r.producer_norm_key
where wl.normalized_name = r.label_norm_key
  and wl.producer_id is not distinct from p.id
  and coalesce(wl.appellation, '') = r.appellation_key;

-- Resolve label ids once and reuse in downstream steps
create temporary table _resolved_rows on commit drop as
select
  r.staging_id,
  wl.id as wine_label_id,
  r.vintage_int,
  r.ean,
  r.abv_num,
  r.price_num,
  r.currency,
  r.image_url,
  r.confidence_num,
  r.notes,
  r.scraped_at,
  r.last_seen_at,
  r.grapes_csv,
  r.source,
  r.source_url
from _import_rows r
left join public.wine_producers p
  on p.normalized_name = r.producer_norm_key
join public.wine_labels wl
  on wl.normalized_name = r.label_norm_key
 and wl.producer_id is not distinct from p.id
 and coalesce(wl.appellation, '') = r.appellation_key;

-- ---------------------------------------------------------------------------
-- 3) Vintages
-- ---------------------------------------------------------------------------
insert into public.wine_vintages (
  wine_label_id,
  vintage,
  ean,
  abv,
  price,
  currency,
  image_url,
  confidence,
  notes,
  first_seen_at,
  last_seen_at
)
select
  rr.wine_label_id,
  rr.vintage_int,
  rr.ean,
  rr.abv_num,
  rr.price_num,
  rr.currency,
  rr.image_url,
  rr.confidence_num,
  rr.notes,
  rr.scraped_at,
  rr.last_seen_at
from _resolved_rows rr
where not exists (
  select 1
  from public.wine_vintages v
  where v.wine_label_id = rr.wine_label_id
    and coalesce(v.vintage, -1) = coalesce(rr.vintage_int, -1)
)
on conflict do nothing;

-- Update existing vintages with fresher details
update public.wine_vintages v
set
  ean = coalesce(rr.ean, v.ean),
  abv = coalesce(rr.abv_num, v.abv),
  price = coalesce(rr.price_num, v.price),
  currency = coalesce(rr.currency, v.currency),
  image_url = coalesce(rr.image_url, v.image_url),
  confidence = greatest(coalesce(v.confidence, 0), coalesce(rr.confidence_num, 0)),
  notes = coalesce(rr.notes, v.notes),
  first_seen_at = least(coalesce(v.first_seen_at, rr.scraped_at), coalesce(rr.scraped_at, v.first_seen_at)),
  last_seen_at = greatest(coalesce(v.last_seen_at, rr.last_seen_at, rr.scraped_at), coalesce(rr.last_seen_at, rr.scraped_at, v.last_seen_at)),
  updated_at = now()
from _resolved_rows rr
where v.wine_label_id = rr.wine_label_id
  and coalesce(v.vintage, -1) = coalesce(rr.vintage_int, -1);

-- ---------------------------------------------------------------------------
-- 4) Grapes dictionary + relationship table
-- ---------------------------------------------------------------------------
-- Sync mode for grapes on impacted labels in current batch:
-- 1) delete existing wine_label_grapes for impacted labels
-- 2) reinsert only grapes present in current batch
with impacted_labels as (
  select distinct rr.wine_label_id
  from _resolved_rows rr
)
delete from public.wine_label_grapes wlg
using impacted_labels il
where wlg.wine_label_id = il.wine_label_id;

with raw_grapes as (
  select
    lower(trim(x.grape)) as normalized_name
  from _resolved_rows rr
  cross join lateral regexp_split_to_table(rr.grapes_csv, '\s*,\s*') as x(grape)
  where coalesce(trim(x.grape), '') <> ''
),
distinct_grapes as (
  select distinct normalized_name
  from raw_grapes
)
insert into public.wine_grapes (name, normalized_name)
select
  initcap(normalized_name) as name,
  normalized_name
from distinct_grapes
on conflict (normalized_name) do nothing;

with grape_rows as (
  select
    rr.wine_label_id,
    lower(trim(x.grape)) as normalized_name
  from _resolved_rows rr
  cross join lateral regexp_split_to_table(rr.grapes_csv, '\s*,\s*') as x(grape)
  where coalesce(trim(x.grape), '') <> ''
),
resolved as (
  select distinct
    gr.wine_label_id,
    g.id as grape_id
  from grape_rows gr
  join public.wine_grapes g
    on g.normalized_name = gr.normalized_name
)
insert into public.wine_label_grapes (wine_label_id, grape_id)
select wine_label_id, grape_id
from resolved
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 5) Source records
-- ---------------------------------------------------------------------------
insert into public.wine_sources (
  wine_vintage_id,
  source,
  source_url,
  price,
  currency,
  scraped_at,
  confidence
)
select
  v.id as wine_vintage_id,
  rr.source,
  rr.source_url,
  rr.price_num,
  rr.currency,
  rr.scraped_at,
  rr.confidence_num
from _resolved_rows rr
join public.wine_vintages v
  on v.wine_label_id = rr.wine_label_id
 and coalesce(v.vintage, -1) = coalesce(rr.vintage_int, -1)
where not exists (
  select 1
  from public.wine_sources ws
  where ws.wine_vintage_id = v.id
    and ws.source = rr.source
    and coalesce(ws.source_url, '') = coalesce(rr.source_url, '')
    and coalesce(ws.scraped_at, to_timestamp(0)) = coalesce(rr.scraped_at, to_timestamp(0))
);

-- ---------------------------------------------------------------------------
-- 6) Mark current batch rows as processed
-- ---------------------------------------------------------------------------
update public.wine_import_staging s
set processed = true
from _import_rows r
where s.id = r.staging_id
  and s.processed = false;

commit;

-- ---------------------------------------------------------------------------
-- Validation queries
-- ---------------------------------------------------------------------------
-- select count(*) as producers from public.wine_producers;
-- select count(*) as labels from public.wine_labels;
-- select count(*) as vintages from public.wine_vintages;
-- select count(*) as grapes from public.wine_grapes;
-- select count(*) as sources from public.wine_sources;
-- select count(*) as unprocessed_rows from public.wine_import_staging where processed = false;
