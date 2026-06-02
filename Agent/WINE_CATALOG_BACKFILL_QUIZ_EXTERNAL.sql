-- Backfill only quiz fields and external_id from staging into canonical catalog
-- Safe to run multiple times.
-- Prerequisite:
-- 1) WINE_CATALOG_DB_UPDATE_FOR_NEW_CSV.sql already executed
-- 2) staging contains the source rows (processed true/false both are accepted)

begin;

alter table public.wine_import_staging
  add column if not exists normalized_name text,
  add column if not exists normalized_producer text,
  add column if not exists quiz_region text,
  add column if not exists quiz_appellation text;

-- Ensure target columns exist even if DB patch was not run yet.
alter table public.wine_labels
  add column if not exists quiz_region text,
  add column if not exists quiz_appellation text;

alter table public.wine_vintages
  add column if not exists external_id text;

-- Parse keys once for stable joins.
create temporary table _staging_keys on commit drop as
select
  s.id as staging_id,
  trim(coalesce(s.producer_normalized, s.normalized_producer)) as producer_norm_key,
  trim(coalesce(s.name_normalized, s.normalized_name)) as label_norm_key,
  coalesce(nullif(trim(s.appellation), ''), '') as appellation_key,
  nullif(trim(s.quiz_region), '') as quiz_region,
  nullif(trim(s.quiz_appellation), '') as quiz_appellation,
  nullif(trim(s.external_id), '') as external_id,
  case
    when nullif(trim(s.vintage::text), '') ~ '^-?\d+$' then trim(s.vintage::text)::int
    else null
  end as vintage_int,
  coalesce(s.last_updated, s.scraped_at, s.created_at) as sort_ts
from public.wine_import_staging s
where coalesce(trim(coalesce(s.name_normalized, s.normalized_name)), '') <> '';

-- Pick best quiz values per canonical label key.
with label_candidates as (
  select
    sk.label_norm_key,
    p.id as producer_id,
    sk.appellation_key,
    sk.quiz_region,
    sk.quiz_appellation,
    sk.sort_ts,
    (
      (case when sk.quiz_region is not null then 1 else 0 end) +
      (case when sk.quiz_appellation is not null then 1 else 0 end)
    ) as quiz_score
  from _staging_keys sk
  left join public.wine_producers p
    on p.normalized_name = sk.producer_norm_key
),
label_best as (
  select distinct on (label_norm_key, producer_id, appellation_key)
    label_norm_key,
    producer_id,
    appellation_key,
    quiz_region,
    quiz_appellation
  from label_candidates
  order by
    label_norm_key,
    producer_id,
    appellation_key,
    quiz_score desc,
    sort_ts desc nulls last
)
update public.wine_labels wl
set
  quiz_region = coalesce(lb.quiz_region, wl.quiz_region),
  quiz_appellation = coalesce(lb.quiz_appellation, wl.quiz_appellation),
  updated_at = now()
from label_best lb
where wl.normalized_name = lb.label_norm_key
  and wl.producer_id is not distinct from lb.producer_id
  and coalesce(wl.appellation, '') = lb.appellation_key
  and (
    lb.quiz_region is not null
    or lb.quiz_appellation is not null
  );

-- Pick best external_id per label + vintage and backfill vintages.
with vintage_candidates as (
  select
    wl.id as wine_label_id,
    sk.vintage_int,
    sk.external_id,
    sk.sort_ts
  from _staging_keys sk
  left join public.wine_producers p
    on p.normalized_name = sk.producer_norm_key
  join public.wine_labels wl
    on wl.normalized_name = sk.label_norm_key
   and wl.producer_id is not distinct from p.id
   and coalesce(wl.appellation, '') = sk.appellation_key
  where sk.external_id is not null
),
vintage_best as (
  select distinct on (wine_label_id, coalesce(vintage_int, -1))
    wine_label_id,
    vintage_int,
    external_id
  from vintage_candidates
  order by wine_label_id, coalesce(vintage_int, -1), sort_ts desc nulls last
)
update public.wine_vintages v
set
  external_id = coalesce(vb.external_id, v.external_id),
  updated_at = now()
from vintage_best vb
where v.wine_label_id = vb.wine_label_id
  and coalesce(v.vintage, -1) = coalesce(vb.vintage_int, -1)
  and vb.external_id is not null;

commit;

-- Optional checks:
-- select count(*) from public.wine_labels where quiz_region is not null or quiz_appellation is not null;
-- select count(*) from public.wine_vintages where external_id is not null;
