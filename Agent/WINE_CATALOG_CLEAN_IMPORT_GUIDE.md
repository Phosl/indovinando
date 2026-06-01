# Wine Catalog Clean Import Guide

Questa guida serve per fare un import del catalogo vini da zero, in modo pulito.

## Flusso consigliato

1. Pulisci catalogo + staging
2. Importa il nuovo CSV in `public.wine_import_staging`
3. Esegui `WINE_CATALOG_IMPORT.sql`
4. Verifica i risultati

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

## 2) Import CSV in staging

In Supabase:

- Apri `public.wine_import_staging`
- `Import data` (CSV)
- Carica il nuovo file

### Se il CSV ha colonne nuove (header incompatibili)

Se vedi errori tipo:

- `reference_price`
- `price_band`
- `ocr_search_text`
- `quiz_tags`
- `data_quality_score`
- `import_ready`
- `is_active`

allinea prima lo staging con questa query:

```sql
alter table public.wine_import_staging
  add column if not exists reference_price numeric(10,2),
  add column if not exists price_band text,
  add column if not exists ocr_search_text text,
  add column if not exists quiz_tags text,
  add column if not exists data_quality_score numeric(5,2),
  add column if not exists import_ready boolean,
  add column if not exists is_active boolean;
```

Poi rifai l'import CSV.

## Troubleshooting rapido

### Errore `invalid input syntax for type numeric: "medium"`

Significa che nel CSV c'è un valore testuale in una colonna numerica.
Per lo staging, usa tipi testuali per questi campi misti:

```sql
alter table public.wine_import_staging
  alter column reference_price type text using reference_price::text,
  alter column data_quality_score type text using data_quality_score::text;
```

Poi riesegui l'import CSV.

## 3) Verifica staging prima dell'import

```sql
select count(*) as staging_rows from public.wine_import_staging;
select count(*) as unprocessed_rows
from public.wine_import_staging
where processed = false;
```

## 4) Esegui lo script di import

Esegui interamente `WINE_CATALOG_IMPORT.sql` nel SQL Editor di Supabase.

## 5) Verifica finale

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

1. Reimport CSV in staging
2. Riesegui `WINE_CATALOG_IMPORT.sql`
