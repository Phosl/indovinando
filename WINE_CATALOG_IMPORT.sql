-- Wine catalog import pipeline
-- Prerequisite: run WINE_CATALOG_SCHEMA.sql first
-- Usage:
-- 1) Import CSV rows into public.wine_import_staging (Dashboard -> Table Editor -> Import)
-- 2) Run this file in Supabase SQL Editor
-- 3) Validate results with final SELECTs at bottom

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
  select distinct on (trim(coalesce(s.producer_normalized, s.normalized_producer)))
    trim(s.producer) as name,
    trim(coalesce(s.producer_normalized, s.normalized_producer)) as normalized_name,
    nullif(trim(s.country), '') as country,
    nullif(trim(s.region), '') as region
  from public.wine_import_staging s
  where s.processed = false
    and coalesce(trim(s.producer), '') <> ''
    and coalesce(trim(coalesce(s.producer_normalized, s.normalized_producer)), '') <> ''
  order by
    trim(coalesce(s.producer_normalized, s.normalized_producer)),
    (nullif(trim(s.country), '') is not null) desc,
    (nullif(trim(s.region), '') is not null) desc,
    trim(s.producer)
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
    trim(coalesce(s.name_normalized, s.normalized_name)),
    p.id,
    coalesce(nullif(trim(s.appellation), ''), '')
  )
    p.id as producer_id,
    trim(s.name) as name,
    trim(coalesce(s.name_normalized, s.normalized_name)) as normalized_name,
    nullif(trim(s.appellation), '') as appellation,
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
    nullif(trim(s.notes), '') as notes
  from public.wine_import_staging s
  left join public.wine_producers p
    on p.normalized_name = trim(coalesce(s.producer_normalized, s.normalized_producer))
  where s.processed = false
    and coalesce(trim(s.name), '') <> ''
    and coalesce(trim(coalesce(s.name_normalized, s.normalized_name)), '') <> ''
  order by
    trim(coalesce(s.name_normalized, s.normalized_name)),
    p.id,
    coalesce(nullif(trim(s.appellation), ''), ''),
    (nullif(trim(coalesce(s.search_text, s.search_tokens)), '') is not null) desc
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
  search_text = coalesce(nullif(trim(coalesce(s.search_text, s.search_tokens)), ''), wl.search_text),
  country = coalesce(nullif(trim(s.country), ''), wl.country),
  region = coalesce(nullif(trim(s.region), ''), wl.region),
  notes = coalesce(nullif(trim(s.notes), ''), wl.notes),
  type = coalesce(
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
    end,
    wl.type
  ),
  updated_at = now()
from public.wine_import_staging s
left join public.wine_producers p
  on p.normalized_name = trim(coalesce(s.producer_normalized, s.normalized_producer))
where s.processed = false
  and wl.normalized_name = trim(coalesce(s.name_normalized, s.normalized_name))
  and wl.producer_id is not distinct from p.id
  and coalesce(wl.appellation, '') = coalesce(nullif(trim(s.appellation), ''), '');

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
  wl.id as wine_label_id,
  s.vintage,
  nullif(trim(s.ean), '') as ean,
  s.abv,
  s.price,
  nullif(trim(s.currency), '') as currency,
  nullif(trim(s.image_url), '') as image_url,
  s.confidence,
  nullif(trim(s.notes), '') as notes,
  s.scraped_at,
  coalesce(s.last_updated, s.updated_at, s.scraped_at)
from public.wine_import_staging s
left join public.wine_producers p
  on p.normalized_name = trim(coalesce(s.producer_normalized, s.normalized_producer))
join public.wine_labels wl
  on wl.normalized_name = trim(coalesce(s.name_normalized, s.normalized_name))
 and wl.producer_id is not distinct from p.id
 and coalesce(wl.appellation, '') = coalesce(nullif(trim(s.appellation), ''), '')
where s.processed = false
  and not exists (
    select 1
    from public.wine_vintages v
    where v.wine_label_id = wl.id
      and coalesce(v.vintage, -1) = coalesce(s.vintage, -1)
  );

-- Update existing vintages with fresher details
update public.wine_vintages v
set
  ean = coalesce(nullif(trim(s.ean), ''), v.ean),
  abv = coalesce(s.abv, v.abv),
  price = coalesce(s.price, v.price),
  currency = coalesce(nullif(trim(s.currency), ''), v.currency),
  image_url = coalesce(nullif(trim(s.image_url), ''), v.image_url),
  confidence = greatest(coalesce(v.confidence, 0), coalesce(s.confidence, 0)),
  notes = coalesce(nullif(trim(s.notes), ''), v.notes),
  first_seen_at = least(coalesce(v.first_seen_at, s.scraped_at), coalesce(s.scraped_at, v.first_seen_at)),
  last_seen_at = greatest(coalesce(v.last_seen_at, s.last_updated, s.scraped_at), coalesce(s.last_updated, s.scraped_at, v.last_seen_at)),
  updated_at = now()
from public.wine_import_staging s
left join public.wine_producers p
  on p.normalized_name = trim(coalesce(s.producer_normalized, s.normalized_producer))
join public.wine_labels wl
  on wl.normalized_name = trim(coalesce(s.name_normalized, s.normalized_name))
 and wl.producer_id is not distinct from p.id
 and coalesce(wl.appellation, '') = coalesce(nullif(trim(s.appellation), ''), '')
where s.processed = false
  and v.wine_label_id = wl.id
  and coalesce(v.vintage, -1) = coalesce(s.vintage, -1);

-- ---------------------------------------------------------------------------
-- 4) Grapes dictionary + relationship table
-- ---------------------------------------------------------------------------
-- Important: sync mode for grape relations
-- For labels touched by current import batch:
-- 1) delete all existing wine_label_grapes
-- 2) reinsert only grapes present in current CSV
with impacted_labels as (
  select distinct wl.id as wine_label_id
  from public.wine_import_staging s
  left join public.wine_producers p
    on p.normalized_name = trim(coalesce(s.producer_normalized, s.normalized_producer))
  join public.wine_labels wl
    on wl.normalized_name = trim(coalesce(s.name_normalized, s.normalized_name))
   and wl.producer_id is not distinct from p.id
   and coalesce(wl.appellation, '') = coalesce(nullif(trim(s.appellation), ''), '')
  where s.processed = false
)
delete from public.wine_label_grapes wlg
using impacted_labels il
where wlg.wine_label_id = il.wine_label_id;

with raw_grapes as (
  select
    lower(trim(x.grape)) as normalized_name
  from public.wine_import_staging s
  cross join lateral regexp_split_to_table(coalesce(s.grapes_normalized, s.grapes, ''), '\s*,\s*') as x(grape)
  where s.processed = false
    and coalesce(trim(x.grape), '') <> ''
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
    s.id as staging_id,
    wl.id as wine_label_id,
    lower(trim(x.grape)) as normalized_name
  from public.wine_import_staging s
  left join public.wine_producers p
    on p.normalized_name = trim(coalesce(s.producer_normalized, s.normalized_producer))
  join public.wine_labels wl
    on wl.normalized_name = trim(coalesce(s.name_normalized, s.normalized_name))
   and wl.producer_id is not distinct from p.id
   and coalesce(wl.appellation, '') = coalesce(nullif(trim(s.appellation), ''), '')
  cross join lateral regexp_split_to_table(coalesce(s.grapes_normalized, s.grapes, ''), '\s*,\s*') as x(grape)
  where s.processed = false
    and coalesce(trim(x.grape), '') <> ''
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
  coalesce(nullif(trim(s.source), ''), 'unknown') as source,
  nullif(trim(s.source_url), '') as source_url,
  s.price,
  nullif(trim(s.currency), '') as currency,
  s.scraped_at,
  s.confidence
from public.wine_import_staging s
left join public.wine_producers p
  on p.normalized_name = trim(coalesce(s.producer_normalized, s.normalized_producer))
join public.wine_labels wl
  on wl.normalized_name = trim(coalesce(s.name_normalized, s.normalized_name))
 and wl.producer_id is not distinct from p.id
 and coalesce(wl.appellation, '') = coalesce(nullif(trim(s.appellation), ''), '')
join public.wine_vintages v
  on v.wine_label_id = wl.id
 and coalesce(v.vintage, -1) = coalesce(s.vintage, -1)
where s.processed = false
  and not exists (
    select 1
    from public.wine_sources ws
    where ws.wine_vintage_id = v.id
      and ws.source = coalesce(nullif(trim(s.source), ''), 'unknown')
      and coalesce(ws.source_url, '') = coalesce(nullif(trim(s.source_url), ''), '')
      and coalesce(ws.scraped_at, to_timestamp(0)) = coalesce(s.scraped_at, to_timestamp(0))
  );

-- ---------------------------------------------------------------------------
-- 6) Mark batch rows as processed
-- ---------------------------------------------------------------------------
update public.wine_import_staging
set processed = true
where processed = false;

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
