-- Wine catalog import pipeline - CHUNKED new CSV format
-- Run repeatedly until unprocessed_rows = 0

begin;

with generated as (
  select gen_random_uuid() as batch_id
)
update public.wine_import_staging s
set batch_id = g.batch_id
from generated g
where s.batch_id is null
  and s.processed = false;

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
join target_batch tb on tb.batch_id = s.batch_id
where s.processed = false
order by s.id
limit 500;

create temporary table _import_rows on commit drop as
select
  s.id as staging_id,
  s.batch_id,

  trim(s.producer) as producer_name,
  trim(coalesce(nullif(s.producer_normalized, ''), nullif(s.normalized_producer, ''))) as producer_norm_key,

  trim(s.name) as label_name,
  trim(coalesce(nullif(s.name_normalized, ''), nullif(s.normalized_name, ''))) as label_norm_key,

  nullif(trim(s.appellation), '') as appellation,
  coalesce(nullif(trim(s.appellation), ''), '') as appellation_key,

  nullif(trim(s.country), '') as country,
  nullif(trim(s.region), '') as region,
  nullif(trim(s.website), '') as website_url,

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
  end as wine_type,

  nullif(trim(coalesce(s.search_text, s.search_tokens)), '') as search_text,
  nullif(trim(s.search_tokens), '') as search_tokens,

  nullif(trim(s.quiz_region), '') as quiz_region,
  nullif(trim(s.quiz_appellation), '') as quiz_appellation,
  nullif(trim(coalesce(s.quiz_price_band, s.price_band)), '') as quiz_price_band,

  nullif(trim(s.body), '') as body,
  nullif(trim(s.acidity), '') as acidity,
  nullif(trim(s.elaborate), '') as elaborate,
  nullif(trim(s.harmonize), '') as harmonize,
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
        when replace(trim(s.confidence::text), ',', '.')::numeric between 0 and 1
          then round(replace(trim(s.confidence::text), ',', '.')::numeric, 3)
        when replace(trim(s.confidence::text), ',', '.')::numeric > 1
         and replace(trim(s.confidence::text), ',', '.')::numeric <= 100
          then round(replace(trim(s.confidence::text), ',', '.')::numeric / 100.0, 3)
        else null
      end
    else null
  end as confidence_num,

  nullif(trim(s.external_id), '') as external_id,
  nullif(trim(s.external_source_id), '') as external_source_id,
  nullif(trim(s.data_source), '') as data_source,

  nullif(trim(s.ean), '') as ean,
  nullif(trim(s.currency), '') as currency,
  nullif(trim(s.price_band), '') as price_band,
  nullif(trim(s.image_url), '') as image_url,

  coalesce(s.grapes_normalized, s.grapes, '') as grapes_csv,

  coalesce(nullif(trim(s.source), ''), 'unknown') as source,
  nullif(trim(s.source_url), '') as source_url,

  nullif(trim(s.vintages), '') as vintages,

  s.scraped_at,
  coalesce(s.last_updated, s.updated_at, s.scraped_at) as last_seen_at

from public.wine_import_staging s
join _target_rows tr on tr.staging_id = s.id
where s.processed = false;

-- Producers
insert into public.wine_producers (
  name,
  normalized_name,
  country,
  region,
  website_url
)
select
  x.name,
  x.normalized_name,
  x.country,
  x.region,
  x.website_url
from (
  select distinct on (r.producer_norm_key)
    r.producer_name as name,
    r.producer_norm_key as normalized_name,
    r.country,
    r.region,
    r.website_url
  from _import_rows r
  where coalesce(r.producer_name, '') <> ''
    and coalesce(r.producer_norm_key, '') <> ''
  order by
    r.producer_norm_key,
    (r.website_url is not null) desc,
    (r.country is not null) desc,
    (r.region is not null) desc,
    r.producer_name
) x
on conflict (normalized_name) do update
set
  name = excluded.name,
  country = coalesce(excluded.country, public.wine_producers.country),
  region = coalesce(excluded.region, public.wine_producers.region),
  website_url = coalesce(excluded.website_url, public.wine_producers.website_url),
  updated_at = now();

-- Labels
insert into public.wine_labels (
  producer_id,
  name,
  normalized_name,
  appellation,
  country,
  region,
  type,
  search_text,
  search_tokens,
  quiz_region,
  quiz_appellation,
  quiz_price_band,
  body,
  acidity,
  elaborate,
  harmonize,
  notes
)
select
  x.producer_id,
  x.name,
  x.normalized_name,
  x.appellation,
  x.country,
  x.region,
  x.wine_type,
  x.search_text,
  x.search_tokens,
  x.quiz_region,
  x.quiz_appellation,
  x.quiz_price_band,
  x.body,
  x.acidity,
  x.elaborate,
  x.harmonize,
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
    r.wine_type,
    r.search_text,
    r.search_tokens,
    r.quiz_region,
    r.quiz_appellation,
    r.quiz_price_band,
    r.body,
    r.acidity,
    r.elaborate,
    r.harmonize,
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
    (r.search_text is not null) desc,
    (r.body is not null) desc,
    (r.acidity is not null) desc
) x
on conflict (normalized_name, producer_id, coalesce(appellation, ''))
do update
set
  name = excluded.name,
  country = coalesce(excluded.country, public.wine_labels.country),
  region = coalesce(excluded.region, public.wine_labels.region),
  type = coalesce(excluded.type, public.wine_labels.type),
  search_text = coalesce(excluded.search_text, public.wine_labels.search_text),
  search_tokens = coalesce(excluded.search_tokens, public.wine_labels.search_tokens),
  quiz_region = coalesce(excluded.quiz_region, public.wine_labels.quiz_region),
  quiz_appellation = coalesce(excluded.quiz_appellation, public.wine_labels.quiz_appellation),
  quiz_price_band = coalesce(excluded.quiz_price_band, public.wine_labels.quiz_price_band),
  body = coalesce(excluded.body, public.wine_labels.body),
  acidity = coalesce(excluded.acidity, public.wine_labels.acidity),
  elaborate = coalesce(excluded.elaborate, public.wine_labels.elaborate),
  harmonize = coalesce(excluded.harmonize, public.wine_labels.harmonize),
  notes = coalesce(excluded.notes, public.wine_labels.notes),
  updated_at = now();

create temporary table _resolved_rows on commit drop as
select
  r.*,
  wl.id as wine_label_id
from _import_rows r
left join public.wine_producers p
  on p.normalized_name = r.producer_norm_key
join public.wine_labels wl
  on wl.normalized_name = r.label_norm_key
 and wl.producer_id is not distinct from p.id
 and coalesce(wl.appellation, '') = r.appellation_key;

-- Vintages
insert into public.wine_vintages (
  wine_label_id,
  vintage,
  external_id,
  ean,
  abv,
  price,
  currency,
  price_band,
  image_url,
  confidence,
  notes,
  first_seen_at,
  last_seen_at
)
select
  rr.wine_label_id,
  rr.vintage_int,
  rr.external_id,
  rr.ean,
  rr.abv_num,
  rr.price_num,
  rr.currency,
  rr.price_band,
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

update public.wine_vintages v
set
  external_id = coalesce(rr.external_id, v.external_id),
  ean = coalesce(rr.ean, v.ean),
  abv = coalesce(rr.abv_num, v.abv),
  price = coalesce(rr.price_num, v.price),
  currency = coalesce(rr.currency, v.currency),
  price_band = coalesce(rr.price_band, v.price_band),
  image_url = coalesce(rr.image_url, v.image_url),
  confidence = greatest(coalesce(v.confidence, 0), coalesce(rr.confidence_num, 0)),
  notes = coalesce(rr.notes, v.notes),
  first_seen_at = least(
    coalesce(v.first_seen_at, rr.scraped_at),
    coalesce(rr.scraped_at, v.first_seen_at)
  ),
  last_seen_at = greatest(
    coalesce(v.last_seen_at, rr.last_seen_at, rr.scraped_at),
    coalesce(rr.last_seen_at, rr.scraped_at, v.last_seen_at)
  ),
  updated_at = now()
from _resolved_rows rr
where v.wine_label_id = rr.wine_label_id
  and coalesce(v.vintage, -1) = coalesce(rr.vintage_int, -1);

-- Grapes
with impacted_labels as (
  select distinct wine_label_id
  from _resolved_rows
)
delete from public.wine_label_grapes wlg
using impacted_labels il
where wlg.wine_label_id = il.wine_label_id;

with raw_grapes as (
  select lower(trim(x.grape)) as normalized_name
  from _resolved_rows rr
  cross join lateral regexp_split_to_table(rr.grapes_csv, '\s*,\s*') as x(grape)
  where coalesce(trim(x.grape), '') <> ''
),
distinct_grapes as (
  select distinct normalized_name
  from raw_grapes
)
insert into public.wine_grapes (
  name,
  normalized_name
)
select
  initcap(normalized_name),
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
insert into public.wine_label_grapes (
  wine_label_id,
  grape_id
)
select
  wine_label_id,
  grape_id
from resolved
on conflict do nothing;

-- Sources
insert into public.wine_sources (
  wine_vintage_id,
  source,
  source_url,
  data_source,
  external_source_id,
  price,
  currency,
  scraped_at,
  confidence,
  raw_payload
)
select
  v.id as wine_vintage_id,
  rr.source,
  rr.source_url,
  rr.data_source,
  rr.external_source_id,
  rr.price_num,
  rr.currency,
  rr.scraped_at,
  rr.confidence_num,
  jsonb_strip_nulls(
    jsonb_build_object(
      'elaborate', rr.elaborate,
      'harmonize', rr.harmonize,
      'vintages', rr.vintages,
      'quiz_region', rr.quiz_region,
      'quiz_appellation', rr.quiz_appellation,
      'quiz_price_band', rr.quiz_price_band,
      'body', rr.body,
      'acidity', rr.acidity
    )
  ) as raw_payload
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

update public.wine_import_staging s
set processed = true
from _import_rows r
where s.id = r.staging_id
  and s.processed = false;

commit;

select count(*) as unprocessed_rows
from public.wine_import_staging
where processed = false;