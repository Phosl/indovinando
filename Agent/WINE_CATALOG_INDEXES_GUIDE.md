# Wine Catalog Index Guide

Guida rapida per tenere il DB veloce ma non pesante.

## File da eseguire

- `WINE_CATALOG_INDEXES.sql`

## Strategia consigliata

1. Esegui subito gli indici must-have.
2. Misura tempi query/import.
3. Attiva gli optional solo se vedi lentezza reale.

## Must-have (sempre consigliati)

- `idx_wine_import_staging_processed_batch_id_id`
- `idx_wine_import_staging_pending_batch_id_id`
- `idx_wine_labels_name_trgm`
- `idx_wine_labels_normalized_name_trgm`
- `idx_wine_producers_name_btree`
- `idx_wine_vintages_label_last_seen_desc`
- `idx_wine_vintages_updated_at_desc`
- `idx_wine_sources_vintage_source`

## Optional (attiva solo se serve)

- `idx_wine_labels_country_trgm` (utile se filtro paese ILIKE molto usato)
- `idx_wine_label_grapes_label_id` (ridondante col PK, ma a volte utile al planner)
- `idx_wine_vintages_label_vintage` (completa il caso senza coalesce)

## Perche questa divisione

- Troppi indici rallentano INSERT/UPDATE e consumano disco.
- Pochi indici giusti migliorano molto le query critiche.
- Con 100k+ righe staging, gli indici su batch/processed sono prioritari.

## Checklist post-run

1. `ANALYZE` sulle tabelle wine.
2. Verifica indici presenti in `pg_indexes`.
3. Testa:
   - import chunk (`WINE_CATALOG_IMPORT_LAST.sql`)
   - admin vini/produttori
   - match AutoVision
4. Se una query resta lenta: prendi `EXPLAIN (ANALYZE, BUFFERS)` e valuta indice mirato.

## Regola pratica

Aggiungi un indice solo se velocizza una query vera e frequente. Se non hai un caso concreto, meglio
non aggiungerlo.
