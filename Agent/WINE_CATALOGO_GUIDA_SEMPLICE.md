# Wine Catalog: guida semplice

Questa guida spiega in modo pratico:

1. il file/tabella di import staging
2. le tabelle e colonne principali del catalogo
3. come creare gli indici fin dall'inizio per avere query veloci

## 1) Concetto base: staging -> catalogo

Il flusso giusto e sempre in 2 step:

1. carichi CSV in `wine_import_staging` (zona di atterraggio)
2. trasformi e salvi nei dati canonici (`wine_producers`, `wine_labels`, `wine_vintages`, ecc.)

Perche e utile:

- non sporchi subito il catalogo definitivo
- puoi controllare e correggere dati prima del merge
- puoi reimportare senza rischiare duplicati grossi

## 2) `wine_import_staging`: cosa deve contenere

Tabella staging: `public.wine_import_staging`

Colonne "core" consigliate (import minimo):

- `external_id`
- `ean`
- `name`
- `name_normalized`
- `producer`
- `producer_normalized`
- `country`
- `region`
- `appellation`
- `type`
- `vintage`
- `price`
- `currency`
- `search_text`
- `dedupe_key`
- `processed` (gestito dal DB, default false)

Colonne opzionali (arricchimento):

- `grapes`, `grapes_normalized`
- `quiz_region`, `quiz_appellation`, `quiz_price_band`
- `body`, `acidity`, `elaborate`, `harmonize`
- `data_source`, `external_source_id`
- `raw_row` (jsonb)

Nota pratica:

- staging puo avere anche colonne "sporche" o testuali, poi le normalizzi nel merge.

## 3) Tabelle canoniche del catalogo

## 3.1 Dizionari

### `wine_producers`

Scopo: anagrafica produttori.

Campi chiave:

- `id`
- `name`
- `normalized_name` (fondamentale per deduplica e match)
- `country`, `region`

### `wine_grapes`

Scopo: anagrafica vitigni.

Campi chiave:

- `id`
- `name`
- `normalized_name`

## 3.2 Entita vino

### `wine_labels`

Scopo: etichetta/cuvée (senza fissare una sola annata).

Campi chiave:

- `id`
- `producer_id`
- `name`
- `normalized_name`
- `appellation`, `country`, `region`, `type`
- `search_text`

Campi quiz (se usati):

- `quiz_region`, `quiz_appellation`, `quiz_price_band`
- `body`, `acidity`, `elaborate`, `harmonize`

### `wine_vintages`

Scopo: singola annata della label.

Campi chiave:

- `id`
- `wine_label_id`
- `vintage`
- `ean`
- `price`, `currency`
- `external_id`, `price_band` (se usi CSV nuovo)

### `wine_label_grapes`

Scopo: tabella ponte label <-> vitigni.

Campi:

- `wine_label_id`
- `grape_id`
- `percentage`

### `wine_sources`

Scopo: traccia fonti esterne / scraping.

Campi chiave:

- `wine_vintage_id`
- `source`, `source_url`
- `data_source`, `external_source_id` (se usi CSV nuovo)
- `raw_payload`

## 3.3 View di compatibilita

### `wine_catalog`

Vista pronta per API e admin: unisce label + producer + vintage (+ grapes aggregate).

### `wine_catalog_producer_stats`

Vista aggregata per statistiche produttori.

## 4) Indici: quali creare subito (fase iniziale)

Questi vanno creati all'inizio, insieme allo schema.

## 4.1 Indici essenziali

- `wine_producers(normalized_name)` unique
- `wine_grapes(normalized_name)` unique
- `wine_labels(producer_id)`
- `wine_labels(normalized_name, producer_id, coalesce(appellation,''))` unique
- `wine_vintages(wine_label_id)`
- `wine_vintages(ean)`
- `wine_vintages(wine_label_id, coalesce(vintage,-1))` unique
- `wine_label_grapes(grape_id)`
- `wine_sources(wine_vintage_id)`
- `wine_sources(source)`

## 4.2 Indici per import staging

- `wine_import_staging(batch_id)`
- `wine_import_staging(processed)`

Questi due accelerano tantissimo merge a batch e retry.

## 4.3 Indici per ricerca fuzzy (match OCR)

Abilita estensione una volta:

```sql
create extension if not exists pg_trgm;
```

Poi:

- GIN trigram su `wine_labels.search_text`
- GIN trigram su `wine_producers.name`

Servono per query `ilike` e similarita durante match da etichetta.

## 5) Strategia performance consigliata

1. Prima crea schema + indici base.
2. Poi importa CSV in staging.
3. Poi fai merge in catalogo (non direttamente da CSV a tabelle finali).
4. Se il CSV cresce molto:
   - lavora per `batch_id`
   - processa solo `processed = false`
5. Se fai molte ricerche OCR:
   - mantieni `search_text` pulito
   - evita colonne inutili nel match online

## 6) SQL minimo di controllo dopo setup

```sql
-- tabelle principali
select table_name
from information_schema.tables
where table_schema='public'
  and table_name like 'wine_%'
order by table_name;

-- indici wine
select indexname, tablename
from pg_indexes
where schemaname='public' and tablename like 'wine_%'
order by tablename, indexname;

-- staging pronto al merge
select count(*) as pending_rows
from public.wine_import_staging
where processed = false;
```

## 7) Regola pratica per ridurre il file import

Se il campo non migliora almeno uno di questi punti, lascialo fuori dal CSV iniziale:

1. qualita del match
2. qualita delle domande quiz
3. deduplica corretta

Meglio partire con un CSV piccolo e pulito, poi arricchire in una fase 2.
