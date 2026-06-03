-- ============================================================================
-- WINE CATALOG INDEX PACK (performance + low overhead)
-- ============================================================================
-- Goal:
--   - Speed up 100k+ imports from wine_import_staging
--   - Speed up AutoVision catalog matching
--   - Speed up admin pages (search producer, filters, wine list)
--
-- Usage:
--   1) Run this once after schema setup.
--   2) Safe to rerun (IF NOT EXISTS).
--   3) Prefer running during low traffic windows.
-- ============================================================================

begin;

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- A) Import throughput indexes (staging -> catalog)
-- ---------------------------------------------------------------------------

-- Main index for picking "next batch" and chunk rows quickly.
create index if not exists idx_wine_import_staging_processed_batch_id_id
  on public.wine_import_staging (processed, batch_id, id);

-- Optional but often faster/lighter for chunk runners that always process pending rows.
create index if not exists idx_wine_import_staging_pending_batch_id_id
  on public.wine_import_staging (batch_id, id)
  where processed = false;

-- ---------------------------------------------------------------------------
-- B) AutoVision match indexes
-- ---------------------------------------------------------------------------

-- OCR match uses ILIKE/fuzzy on label names.
create index if not exists idx_wine_labels_name_trgm
  on public.wine_labels using gin (name gin_trgm_ops);

create index if not exists idx_wine_labels_normalized_name_trgm
  on public.wine_labels using gin (normalized_name gin_trgm_ops);

-- Producer fuzzy/equality matching from admin and match pipeline.
create index if not exists idx_wine_producers_name_btree
  on public.wine_producers (name);

-- Keep producer/name trigram for fuzzy producer searches (already present in many envs).
create index if not exists wine_producers_name_trgm_idx
  on public.wine_producers using gin (name gin_trgm_ops);

-- Match pipeline loads vintages by label and sorts by recency.
create index if not exists idx_wine_vintages_label_last_seen_desc
  on public.wine_vintages (wine_label_id, last_seen_at desc);

-- ---------------------------------------------------------------------------
-- C) Admin list/filter indexes
-- ---------------------------------------------------------------------------

-- Common equality filters.
create index if not exists idx_wine_labels_type
  on public.wine_labels (type);

create index if not exists idx_wine_labels_region
  on public.wine_labels (region);

-- Admin pages sort by last_updated (mapped from wine_vintages.updated_at in view wine_catalog).
create index if not exists idx_wine_vintages_updated_at_desc
  on public.wine_vintages (updated_at desc);

-- Optional for broad ILIKE country filters from admin pages.
create index if not exists idx_wine_labels_country_trgm
  on public.wine_labels using gin (country gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- D) Join/dedupe support indexes (requested for large datasets)
-- ---------------------------------------------------------------------------

-- NOTE: PK (wine_label_id, grape_id) already gives a left-prefix index on wine_label_id.
-- Kept explicitly for planner stability and readability.
create index if not exists idx_wine_label_grapes_label_id
  on public.wine_label_grapes (wine_label_id);

-- NOTE: unique expression index exists in base schema:
--   (wine_label_id, coalesce(vintage, -1))
-- This additional non-expression index helps plain predicates/order on vintage.
create index if not exists idx_wine_vintages_label_vintage
  on public.wine_vintages (wine_label_id, vintage);

-- Speeds source dedupe checks during imports.
create index if not exists idx_wine_sources_vintage_source
  on public.wine_sources (wine_vintage_id, source, source_url, scraped_at);

commit;

-- ---------------------------------------------------------------------------
-- Post-run maintenance (recommended)
-- ---------------------------------------------------------------------------
-- analyze public.wine_import_staging;
-- analyze public.wine_labels;
-- analyze public.wine_producers;
-- analyze public.wine_vintages;
-- analyze public.wine_sources;
-- analyze public.wine_label_grapes;

-- ---------------------------------------------------------------------------
-- Quick checks
-- ---------------------------------------------------------------------------
-- select indexname, tablename
-- from pg_indexes
-- where schemaname = 'public' and tablename like 'wine_%'
-- order by tablename, indexname;

-- select relname as table_name, n_live_tup as est_rows
-- from pg_stat_user_tables
-- where schemaname = 'public' and relname like 'wine_%'
-- order by est_rows desc;


-- MUST HAVE
-- Main index for picking "next batch" and chunk rows quickly.
create index if not exists idx_wine_import_staging_processed_batch_id_id
  on public.wine_import_staging (processed, batch_id, id);
  -- Optional but often faster/lighter for chunk runners that always process pending rows.
create index if not exists idx_wine_import_staging_pending_batch_id_id
  on public.wine_import_staging (batch_id, id)
  where processed = false;
  -- OCR match uses ILIKE/fuzzy on label names.
create index if not exists idx_wine_labels_name_trgm
  on public.wine_labels using gin (name gin_trgm_ops);
  create index if not exists idx_wine_labels_normalized_name_trgm
  on public.wine_labels using gin (normalized_name gin_trgm_ops);
-- Producer fuzzy/equality matching from admin and match pipeline.
create index if not exists idx_wine_producers_name_btree
  on public.wine_producers (name);
-- Match pipeline loads vintages by label and sorts by recency.
create index if not exists idx_wine_vintages_label_last_seen_desc
  on public.wine_vintages (wine_label_id, last_seen_at desc);
-- Admin pages sort by last_updated (mapped from wine_vintages.updated_at in view wine_catalog).
create index if not exists idx_wine_vintages_updated_at_desc
  on public.wine_vintages (updated_at desc);
-- Speeds source dedupe checks during imports.
create index if not exists idx_wine_sources_vintage_source
  on public.wine_sources (wine_vintage_id, source, source_url, scraped_at);
