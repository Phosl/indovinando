# Wine Catalog Clean Import Guide

Questa guida serve per fare un import del catalogo vini da zero, in modo pulito.

## Flusso consigliato

1. Pulisci catalogo + staging
2. Aggiorna lo schema DB con `WINE_CATALOG_DB_UPDATE_FOR_NEW_CSV.sql`
3. Importa il nuovo CSV in `public.wine_import_staging`
4. Esegui `WINE_CATALOG_IMPORT_NEW_CSV.sql`
5. Verifica i risultati

> **Script di riferimento (formato CSV aggiornato)**
>
> - `WINE_CATALOG_DB_UPDATE_FOR_NEW_CSV.sql` — patch idempotente al DB
> - `WINE_CATALOG_IMPORT_NEW_CSV.sql` — pipeline import aggiornata

## Colonne CSV supportate (formato corrente)

```
external_id  ean  name  normalized_name  name_normalized
producer  normalized_producer  producer_normalized
country  region  quiz_region  appellation  quiz_appellation
type  wine_type  grapes  grapes_normalized
vintage  abv  price  currency  price_band  quiz_price_band
image_url  source  source_url  data_source  external_source_id
elaborate  harmonize  body  acidity
website  vintages  scraped_at  last_updated  updated_at
confidence  search_text  search_tokens  notes  processed
```

## 1) Pulizia completa (reset totale)

Attenzione: questa operazione elimina tutti i dati del catalogo e anche lo staging.

```sql
begin;

truncate table
  public.wine_sources,
  public.wine_label_grapes,
  public.wine_grapes,
  public.wine_vintages,
  public.wine_labels,
  public.wine_producers,
  public.wine_import_staging
restart identity cascade;

commit;
```

## 2) Aggiorna lo schema DB

Esegui `WINE_CATALOG_DB_UPDATE_FOR_NEW_CSV.sql` nel SQL Editor di Supabase.

Questo script (idempotente) aggiunge le nuove colonne dove necessario:

- `wine_import_staging`: normalized_name, normalized_producer, quiz_region, quiz_appellation,
  wine_type, quiz_price_band, data_source, external_source_id, elaborate, harmonize, body, acidity,
  website, vintages, updated_at, search_tokens
- `wine_labels`: quiz_region, quiz_appellation, quiz_price_band, body, acidity, elaborate,
  harmonize, search_tokens
- `wine_vintages`: external_id, price_band
- `wine_sources`: data_source, external_source_id

## 3) Import CSV in staging

In Supabase:

- Apri `public.wine_import_staging`
- `Import data` (CSV)
- Carica il nuovo file

### Troubleshooting rapido

**Errore `column X does not exist`** Lo schema non è ancora aggiornato. Esegui prima il punto 2.

**Errore `invalid input syntax for type numeric: "medium"` o simile** Nel CSV c'è un valore testuale
in una colonna numerica. Correggi con:

```sql
alter table public.wine_import_staging
  alter column reference_price type text using reference_price::text,
  alter column data_quality_score type text using data_quality_score::text;
```

Poi riesegui l'import CSV.

## 4) Verifica staging prima dell'import

```sql
select count(*) as staging_rows from public.wine_import_staging;
select count(*) as unprocessed_rows
from public.wine_import_staging
where processed = false;
```

## 5) Esegui lo script di import

Esegui interamente `WINE_CATALOG_IMPORT_NEW_CSV.sql` nel SQL Editor di Supabase.

## 6) Verifica finale

```sql
select count(*) as producers from public.wine_producers;
select count(*) as labels from public.wine_labels;
select count(*) as vintages from public.wine_vintages;
select count(*) as grapes from public.wine_grapes;
select count(*) as sources from public.wine_sources;
select count(*) as unprocessed_rows
from public.wine_import_staging
where processed = false;
```

## Variante: pulizia solo staging (non distruttiva sul catalogo)

Se vuoi mantenere il catalogo esistente e ricaricare solo il CSV:

```sql
truncate table public.wine_import_staging restart identity;
```

Poi:

1. Aggiorna schema DB se non ancora fatto (punto 2)
2. Reimport CSV in staging
3. Riesegui `WINE_CATALOG_IMPORT_NEW_CSV.sql`
