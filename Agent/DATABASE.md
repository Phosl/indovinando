# Database Schema - Indovinando

Panoramica aggiornata delle tabelle Supabase (PostgreSQL) usate dall'app.

## Fonti di verita SQL

- `DATABASE_SETUP_GAMES_ONLY.sql` - schema base giochi + RLS
- `SUPABASE_RESTORE_FULL.sql` - script unico di restore completo post-reset
- `SUPABASE_LIVE_SESSIONS.sql` - schema live multiplayer
- `SUPABASE_LIVE_GUEST_PATCH.sql` - patch guest/live policy
- `RLS_DELETE_POLICIES_PATCH.sql` - patch delete policy editor giochi
- `WINE_COURSE_PROGRESS.sql` - progresso corso vino
- `ENOTECA_SCHEMA.sql` - schema enoteca minimale
- `WINE_CATALOG_SCHEMA.sql` - catalogo vini per creazione degustazione automatica
- `AUTO_TASTING_MEDIA_SCHEMA.sql` - bucket + tabella immagini bottiglie (opzionale, isolato)

## Diagramma ER (semplificato)

```text
auth.users
    |
    +--- profiles
    |
    +--- games ---------------------- game_questions --- game_question_options
    |      |                                  |                  |
    |      +--- game_bottles -----------------+--- game_bottle_answers
    |
    +--- live_sessions --- live_players --- live_round_answers
    |          |
    |          +--- live_round_status
    |
    +--- wine_course_progress

games --- enoteca_tasting_sessions --- enoteca_answers
        \                              /
         +---- game_bottles / game_questions / game_question_options
```

## Tabelle Account

### `profiles`

Profilo utente applicativo (username, onboarding e preferenze UI), legato a `auth.users.id`.

| Colonna              | Tipo          | Note                                                                |
| -------------------- | ------------- | ------------------------------------------------------------------- |
| `id`                 | `UUID PK`     | coincide con `auth.users.id`                                        |
| `username`           | `TEXT`        | opzionale                                                           |
| `preferred_language` | `TEXT`        | default `it`, valori ammessi `it`/`en`                              |
| `avatar_emoji`       | `TEXT`        | opzionale                                                           |
| `onboarding`         | `BOOLEAN`     | opzionale                                                           |
| `super_admin`        | `BOOLEAN`     | default `false` — gestito solo via Supabase dashboard dal developer |
| `created_at`         | `TIMESTAMPTZ` | opzionale                                                           |
| `updated_at`         | `TIMESTAMPTZ` | aggiornato su salvataggi preferenze                                 |

Uso in app:

- onboarding editor gioco
- username dashboard/profilo
- upsert in fase signup
- lingua UI (`preferred_language`)
- avatar profilo (`avatar_emoji`)
- accesso admin editor corsi (`super_admin`)

## Storage Bucket

### `corsi` (Supabase Storage)

Bucket **pubblico** che contiene i file JSON dei corsi di vino.

| Path                            | Descrizione       |
| ------------------------------- | ----------------- |
| `corso_livello_{1..10}.json`    | Corsi in italiano |
| `en/corso_livello_{1..10}.json` | Corsi in inglese  |

Policy:

- **Read:** pubblico (anonimo)
- **Write/Update/Delete:** solo utenti con `profiles.super_admin = true`

Migration: `SUPABASE_COURSE_ADMIN_PATCH.sql`

### `tasting-bottles` (Supabase Storage, opzionale)

Bucket **privato** per upload foto bottiglie nella modalita automatica.

Regola path consigliata:

- `<auth.uid()>/draft/<file>.jpg`
- `<auth.uid()>/game/<game_id>/<file>.jpg`

Policy:

- **Read/Write/Update/Delete:** solo owner del path (prima cartella uguale a `auth.uid()`)

Migration: `AUTO_TASTING_MEDIA_SCHEMA.sql`

---

## Tabelle Gioco

### `games`

Gioco creato dall'utente.

| Colonna       | Tipo                    | Note                        |
| ------------- | ----------------------- | --------------------------- |
| `id`          | `UUID PK`               | default `gen_random_uuid()` |
| `created_by`  | `UUID FK -> auth.users` | creatore                    |
| `name`        | `VARCHAR(255)`          | nome gioco                  |
| `status`      | `VARCHAR(20)`           | `draft` o `published`       |
| `cover_index` | `INTEGER`               | indice avatar/copertina     |
| `created_at`  | `TIMESTAMPTZ`           | default `now()`             |
| `updated_at`  | `TIMESTAMPTZ`           | default `now()`             |

RLS principali:

- creator puo insert/update/delete
- read su giochi published o propri
- con patch guest: read consentita anche se il gioco e collegato a una live session

### `game_questions`

Domande condivise per tutte le bottiglie del gioco.

| Colonna         | Tipo               | Note          |
| --------------- | ------------------ | ------------- |
| `id`            | `UUID PK`          |               |
| `game_id`       | `UUID FK -> games` |               |
| `text`          | `TEXT`             | testo domanda |
| `kind`          | `TEXT`             | `rating`, `neutral`, o `NULL` |
| `is_neutral`    | `BOOLEAN`          | se `true`, la domanda non richiede risposta corretta |
| `display_order` | `INTEGER`          | ordine        |
| `created_at`    | `TIMESTAMPTZ`      |               |

Indice: `idx_game_questions_game_id`

### `game_question_options`

Opzioni di risposta per ogni domanda.

| Colonna        | Tipo                        | Note    |
| -------------- | --------------------------- | ------- |
| `id`           | `UUID PK`                   |         |
| `question_id`  | `UUID FK -> game_questions` |         |
| `text`         | `VARCHAR(255)`              | opzione |
| `option_order` | `INTEGER`                   | ordine  |
| `created_at`   | `TIMESTAMPTZ`               |         |

Indice: `idx_game_question_options_question_id`

### `game_bottles`

Bottiglie da indovinare in un gioco.

| Colonna        | Tipo               | Note                      |
| -------------- | ------------------ | ------------------------- |
| `id`           | `UUID PK`          |                           |
| `game_id`      | `UUID FK -> games` |                           |
| `name`         | `VARCHAR(255)`     | nome vino                 |
| `producer`     | `VARCHAR(255)`     | opzionale                 |
| `year`         | `VARCHAR(4)`       | opzionale                 |
| `wine_type`    | `TEXT`             | opzionale (red/white/...) |
| `bottle_order` | `INTEGER`          | ordine                    |
| `created_at`   | `TIMESTAMPTZ`      |                           |

Indice: `idx_game_bottles_game_id`

### `game_bottle_answers`

Risposta corretta per coppia `(bottle, question)`.

| Colonna       | Tipo                               | Note             |
| ------------- | ---------------------------------- | ---------------- |
| `id`          | `UUID PK`                          |                  |
| `bottle_id`   | `UUID FK -> game_bottles`          |                  |
| `question_id` | `UUID FK -> game_questions`        |                  |
| `option_id`   | `UUID FK -> game_question_options` | opzione corretta |
| `created_at`  | `TIMESTAMPTZ`                      |                  |

Indici:

- `idx_game_bottle_answers_bottle_id`
- `idx_game_bottle_answers_question_id`

## Catalogo Vini (Auto Degustazione)

Nota aggiornamento schema: dal file `WINE_CATALOG_SCHEMA.sql` il modello e normalizzato
(`wine_producers`, `wine_labels`, `wine_vintages`, `wine_grapes`, `wine_label_grapes`,
`wine_sources`) con tabella `wine_import_staging` per import CSV. La view `wine_catalog` resta
disponibile per compatibilita con pagine/admin query esistenti.

### Modello Normalizzato (principale)

Tabelle principali:

- `wine_producers`
- `wine_grapes`
- `wine_labels`
- `wine_label_grapes`
- `wine_vintages`
- `wine_sources`
- `wine_import_staging` (ingestion)

### View Compatibilita: `wine_catalog`

Vista catalogo vini usata per:

- match da etichetta (OpenAI Vision)
- precompilazione bottiglie
- generazione quiz rapido (paese, regione, annata, tipologia, vitigni, prezzo)

| Colonna               | Tipo            | Note                                   |
| --------------------- | --------------- | -------------------------------------- |
| `id`                  | `UUID`          | id vintage                             |
| `external_id`         | `TEXT`          | id sorgente scraper                    |
| `ean`                 | `TEXT`          | barcode/ean                            |
| `name`                | `TEXT`          | nome vino completo                     |
| `name_normalized`     | `TEXT`          | nome normalizzato                      |
| `producer`            | `TEXT`          | produttore                             |
| `producer_normalized` | `TEXT`          | produttore normalizzato                |
| `country`             | `TEXT`          | paese                                  |
| `region`              | `TEXT`          | regione                                |
| `appellation`         | `TEXT`          | doc/docg/igt                           |
| `type`                | `TEXT`          | red/white/rose/sparkling               |
| `grapes`              | `TEXT[]`        | lista vitigni                          |
| `grapes_normalized`   | `TEXT[]`        | lista vitigni normalizzati             |
| `vintage`             | `INT`           | annata                                 |
| `abv`                 | `NUMERIC(5,2)`  | gradazione                             |
| `price`               | `NUMERIC(10,2)` | prezzo                                 |
| `currency`            | `TEXT`          | valuta                                 |
| `image_url`           | `TEXT`          | url immagine                           |
| `source`              | `TEXT`          | fonte (tannico, open food facts, ecc.) |
| `source_url`          | `TEXT`          | url prodotto                           |
| `scraped_at`          | `TIMESTAMPTZ`   | data scraping                          |
| `last_updated`        | `TIMESTAMPTZ`   | aggiornamento record                   |
| `confidence`          | `NUMERIC(4,3)`  | affidabilita estrazione                |
| `search_text`         | `TEXT`          | testo indicizzato per match fuzzy      |
| `dedupe_key`          | `TEXT`          | chiave deduplica                       |
| `notes`               | `TEXT`          | note tecniche                          |
| `is_active`           | `BOOLEAN`       | attivo a livello label                 |
| `created_at`          | `TIMESTAMPTZ`   | default `now()`                        |
| `updated_at`          | `TIMESTAMPTZ`   | default `now()`                        |
| `quiz_region`         | `TEXT`          | etichetta regione per quiz/UI          |
| `quiz_appellation`    | `TEXT`          | etichetta appellazione per quiz/UI     |
| `price_band`          | `TEXT`          | fascia prezzo vintage                  |
| `quiz_price_band`     | `TEXT`          | fascia prezzo quiz/UI                  |
| `search_tokens`       | `TEXT`          | token ricerca/catalog match            |
| `body`                | `TEXT`          | corpo vino                             |
| `acidity`             | `TEXT`          | acidita vino                           |
| `elaborate`           | `TEXT`          | campo extra import legacy              |
| `harmonize`           | `TEXT`          | armonia/equilibrio                     |
| `price_min`           | `NUMERIC(10,2)` | limite inferiore range prezzo          |
| `price_max`           | `NUMERIC(10,2)` | limite superiore range prezzo          |

Indici principali:

- `ean`
- `producer_normalized`
- `vintage`
- `type`
- trigram su `search_text` (richiede `pg_trgm`)
- unique parziale su `dedupe_key`

Vista supporto admin:

- `wine_catalog_producer_stats` (aggregazione produttori)

### RLS (tabelle wine\_\*)

- `SELECT`: utenti autenticati
- `INSERT/UPDATE/DELETE`: solo `profiles.super_admin = true`
- La view `wine_catalog` eredita la sicurezza dalle tabelle sottostanti.

### Import CSV in Supabase

1. Esegui `WINE_CATALOG_SCHEMA.sql` in SQL Editor (una volta sola).
2. Esegui anche `WINE_CATALOG_DB_UPDATE_FOR_NEW_CSV.sql` per allineare colonne/view moderne.
3. Converti il file Excel in CSV UTF-8 (foglio principale).
4. Importa il CSV in `wine_import_staging`:
   `Table Editor -> wine_import_staging -> Insert -> Import data via CSV`.
5. Mappa le colonne CSV su:
   `external_id, ean, name, name_normalized, producer, producer_normalized, country, region, appellation, type, grapes, grapes_normalized, vintage, abv, price, currency, image_url, source, source_url, scraped_at, last_updated, confidence, search_text, dedupe_key, notes`.
6. Esegui `WINE_CATALOG_IMPORT.sql` per popolare tabelle normalizzate (`wine_producers`,
   `wine_labels`, `wine_vintages`, `wine_grapes`, `wine_label_grapes`, `wine_sources`) e marcare
   `processed = true` in staging.
7. Controlli rapidi:
   - count record su `wine_catalog`
   - count record su `wine_catalog_producer_stats`
   - `wine_import_staging where processed = false` deve essere 0

### Comportamento Import (sync)

## Immagini Bottiglie (modulo opzionale)

### `tasting_bottle_images`

Metadati immagini caricati per riconoscimento etichetta. Tabella separata dal core game flow
(quick/custom restano invariati anche se questa tabella non e presente).

| Colonna                  | Tipo           | Note                                                |
| ------------------------ | -------------- | --------------------------------------------------- |
| `id`                     | `UUID PK`      | default `gen_random_uuid()`                         |
| `uploaded_by`            | `UUID FK`      | owner (`auth.users.id`)                             |
| `game_id`                | `UUID FK`      | opzionale, `on delete set null`                     |
| `storage_bucket`         | `TEXT`         | default `tasting-bottles`                           |
| `storage_path`           | `TEXT`         | path file nel bucket                                |
| `original_filename`      | `TEXT`         | opzionale                                           |
| `mime_type`              | `TEXT`         | opzionale                                           |
| `size_bytes`             | `BIGINT`       | opzionale                                           |
| `status`                 | `TEXT`         | `uploaded` / `processing` / `recognized` / `failed` |
| `recognized_payload`     | `JSONB`        | payload OpenAI Vision + catalog/web enrichment      |
| `recognized_name`        | `TEXT`         | valore estratto                                     |
| `recognized_producer`    | `TEXT`         | valore estratto                                     |
| `recognized_vintage`     | `INT`          | valore estratto                                     |
| `recognition_confidence` | `NUMERIC(5,4)` | confidenza                                          |
| `error_message`          | `TEXT`         | dettaglio errore pipeline                           |
| `created_at`             | `TIMESTAMPTZ`  | default `now()`                                     |
| `updated_at`             | `TIMESTAMPTZ`  | trigger `set_updated_at()`                          |

Chiavi importanti dentro `recognized_payload`:

- `provider` / `extractor`
- `catalog_match`
- `catalog_details`
- `web_enrichment`
- `review`
- `verification`
- `catalog_sync`
- `openai_payload.usage`

Campi tipici di `catalog_details`:

- `country`
- `region`
- `quiz_region`
- `appellation`
- `quiz_appellation`
- `type`
- `grapes`
- `price`
- `average_price`
- `price_min`
- `price_max`
- `price_band`
- `body`
- `acidity`
- `harmony`
- `why_notable`
- `short_description`

### Flusso runtime auto tasting

Route principali:

- `POST /api/auto-tasting/upload`
- `POST /api/auto-tasting/metadata`
- `POST /api/auto-tasting/analyze`
- `POST /api/auto-tasting/verify-catalog`
- `POST /api/auto-tasting/delete`
- `GET /api/auto-tasting/image`

Pipeline runtime attuale:

1. upload file in bucket `tasting-bottles`
2. creazione record `tasting_bottle_images`
3. `analyze` esegue:
   - OpenAI Vision
   - estrazione dati strutturati
   - match catalogo
4. opzionalmente `web enrichment` solo se richiesto
5. `verify-catalog` promuove la bottiglia nel catalogo canonico

### Web enrichment

Il web enrichment e opzionale e disattivabile via env:

- `OPENAI_WEB_ENRICHMENT_ENABLED=true|false`

Non parte piu automaticamente nel normale flusso `Analizza`.
Parte solo se:

- la request passa `useWebEnrichment: true`
- e il server ha il flag env attivo

Il risultato puo arricchire:

- vitigni
- note narrative (`why_notable`, `short_description`)
- profilo degustativo (`body`, `acidity`, `harmony`)
- prezzo medio e range (`average_price`, `price_min`, `price_max`)

### Salvataggio catalogo dopo conferma

`verify-catalog` crea o aggiorna:

- `wine_producers`
- `wine_labels`
- `wine_vintages`
- `wine_grapes`
- `wine_label_grapes`
- `wine_sources`

Le note testuali non sono ancora su colonne dedicate multilingua. Oggi vengono salvate in:

- `wine_labels.notes`
- `wine_sources.raw_payload`

Questo permette di recuperarle in analisi successive senza rifare per forza la web search.

- `wine_label_grapes` e gestita in modalita **replace** per i `wine_label` impattati dal batch:
  - delete relazioni esistenti dei label nel batch
  - insert delle sole relazioni presenti nel CSV corrente
- Questo evita accumulo storico di vitigni errati da import precedenti.

## Tabelle Live Multiplayer

### `live_sessions`

Sessione live avviata da host.

| Colonna                  | Tipo                    | Note                                                    |
| ------------------------ | ----------------------- | ------------------------------------------------------- |
| `id`                     | `UUID PK`               | default `uuid_generate_v4()`                            |
| `game_id`                | `UUID FK -> games`      |                                                         |
| `host_user_id`           | `UUID FK -> auth.users` |                                                         |
| `status`                 | `TEXT`                  | `lobby`, `playing`, `finished`                          |
| `current_question_index` | `INT`                   | default `0`                                             |
| `round_status`           | `TEXT`                  | `waiting_players`, `waiting_answers`, `showing_results` |
| `created_at`             | `TIMESTAMPTZ`           |                                                         |
| `started_at`             | `TIMESTAMPTZ`           |                                                         |
| `finished_at`            | `TIMESTAMPTZ`           |                                                         |
| `updated_at`             | `TIMESTAMPTZ`           |                                                         |

RLS principali:

- host puo creare/aggiornare sessioni proprie
- con patch guest: sessioni live leggibili pubblicamente (`lobby`/`playing`/`finished`)

Indici:

- `idx_live_sessions_host`
- `idx_live_sessions_game`
- `idx_live_sessions_status`

### `live_players`

Partecipanti sessione live (anonimi o autenticati).

| Colonna       | Tipo                       | Note                         |
| ------------- | -------------------------- | ---------------------------- |
| `id`          | `UUID PK`                  | default `uuid_generate_v4()` |
| `session_id`  | `UUID FK -> live_sessions` |                              |
| `nickname`    | `TEXT`                     | univoco per sessione         |
| `avatar_id`   | `INT`                      | 1-10                         |
| `user_id`     | `UUID FK -> auth.users`    | nullable per guest           |
| `is_host`     | `BOOLEAN`                  |                              |
| `total_score` | `INT`                      | default `0`                  |
| `joined_at`   | `TIMESTAMPTZ`              |                              |
| `created_at`  | `TIMESTAMPTZ`              |                              |
| `updated_at`  | `TIMESTAMPTZ`              |                              |

Vincolo: `UNIQUE(session_id, nickname)`

RLS principali:

- read pubblico (lobby)
- insert join consentito
- update player proprio
- con patch guest: host puo aggiornare punteggi

Indici:

- `idx_live_players_session`
- `idx_live_players_user`

### `live_round_answers`

Risposte inviate durante round live.

| Colonna              | Tipo                               | Note                         |
| -------------------- | ---------------------------------- | ---------------------------- |
| `id`                 | `UUID PK`                          | default `uuid_generate_v4()` |
| `session_id`         | `UUID FK -> live_sessions`         |                              |
| `player_id`          | `UUID FK -> live_players`          |                              |
| `question_id`        | `UUID FK -> game_questions`        |                              |
| `selected_option_id` | `UUID FK -> game_question_options` |                              |
| `is_correct`         | `BOOLEAN`                          | default `false`              |
| `points`             | `INT`                              | default `0`                  |
| `answered_at`        | `TIMESTAMPTZ`                      |                              |
| `created_at`         | `TIMESTAMPTZ`                      |                              |

Vincolo: `UNIQUE(session_id, player_id, question_id)`

RLS principali:

- player inserisce propria risposta
- con patch guest: lettura risposte per partecipanti sessione
- con patch guest: host puo update/delete per scoring/reset round

Indici:

- `idx_live_round_answers_session`
- `idx_live_round_answers_player`
- `idx_live_round_answers_question`

### `live_round_status`

Tabella ausiliaria di stato round per sessione+domanda.

| Colonna       | Tipo                        | Note                                 |
| ------------- | --------------------------- | ------------------------------------ |
| `id`          | `UUID PK`                   | default `uuid_generate_v4()`         |
| `session_id`  | `UUID FK -> live_sessions`  |                                      |
| `question_id` | `UUID FK -> game_questions` |                                      |
| `status`      | `TEXT`                      | `waiting_answers`, `showing_results` |
| `created_at`  | `TIMESTAMPTZ`               |                                      |
| `updated_at`  | `TIMESTAMPTZ`               |                                      |

Vincolo: `UNIQUE(session_id, question_id)`

Indice:

- `idx_live_round_status_session`
- `idx_live_round_status_question`

## Tabelle Live Tavoli e Gruppi

Schema dedicato usato da `/table-live/*` e API `/api/table-live/*`.

Tabelle principali:

- `table_live_events`
- `table_live_sessions`
- `table_live_players`
- `table_live_round_answers`
- `table_live_event_results`

Migration: `TABLE_LIVE_GROUPS_SCHEMA.sql`

RLS (step 1):

- RLS abilitato su tutte le `table_live_*`
- policy baseline intenzionalmente permissive per supportare flusso guest/table
- eventi leggibili pubblicamente solo se `status = 'active'`
- write gestite dalle API server-side; se `SUPABASE_SERVICE_ROLE_KEY` e assente, le policy baseline
  permettono fallback funzionale

## Tabelle Corso Vino

### `wine_course_progress`

Progressi utente per lezione.

| Colonna        | Tipo                    | Note                        |
| -------------- | ----------------------- | --------------------------- |
| `id`           | `UUID PK`               | default `gen_random_uuid()` |
| `user_id`      | `UUID FK -> auth.users` |                             |
| `level_id`     | `TEXT`                  |                             |
| `lesson_id`    | `TEXT`                  |                             |
| `completed`    | `BOOLEAN`               | default `false`             |
| `score`        | `INTEGER`               | default `0`                 |
| `attempts`     | `INTEGER`               | default `0`                 |
| `completed_at` | `TIMESTAMPTZ`           | nullable                    |
| `updated_at`   | `TIMESTAMPTZ`           | default `now()`             |

Vincolo: `UNIQUE(user_id, level_id, lesson_id)`

RLS:

- read/insert/update solo su proprie righe (`auth.uid() = user_id`)

## Tabelle Enoteca

### `enoteca_tasting_sessions`

Sessione degustazione semplificata (anche anonima), basata su `games`.

| Colonna                | Tipo               | Note                        |
| ---------------------- | ------------------ | --------------------------- |
| `id`                   | `UUID PK`          | default `gen_random_uuid()` |
| `game_id`              | `UUID FK -> games` |                             |
| `nickname`             | `TEXT`             |                             |
| `table_name`           | `TEXT`             | opzionale                   |
| `current_bottle_index` | `INTEGER`          | default `0`                 |
| `status`               | `TEXT`             | default `in_progress`       |
| `total_score`          | `INTEGER`          | default `0`                 |
| `started_at`           | `TIMESTAMPTZ`      | default `now()`             |
| `completed_at`         | `TIMESTAMPTZ`      | opzionale                   |
| `updated_at`           | `TIMESTAMPTZ`      | default `now()`             |

RLS (aperto per flusso anonimo):

- insert/select/update consentiti a tutti

Indice:

- `idx_enoteca_sessions_game`

### `enoteca_answers`

Risposte in sessione enoteca.

| Colonna              | Tipo                                  | Note                        |
| -------------------- | ------------------------------------- | --------------------------- |
| `id`                 | `UUID PK`                             | default `gen_random_uuid()` |
| `tasting_session_id` | `UUID FK -> enoteca_tasting_sessions` |                             |
| `bottle_id`          | `UUID FK -> game_bottles`             |                             |
| `question_id`        | `UUID FK -> game_questions`           |                             |
| `selected_option_id` | `UUID FK -> game_question_options`    | nullable                    |
| `is_correct`         | `BOOLEAN`                             | nullable                    |
| `points`             | `INTEGER`                             | default `0`                 |
| `answered_at`        | `TIMESTAMPTZ`                         | default `now()`             |

Vincolo: `UNIQUE(tasting_session_id, bottle_id, question_id)`

RLS (aperto per flusso anonimo):

- policy `FOR ALL USING (TRUE)`

Indici:

- `idx_enoteca_answers_session`
- `idx_enoteca_answers_bottle`

## Storico Partite Live

### `live_session_results`

Snapshot permanente salvato al termine di ogni sessione live (via `POST /api/live/session/finish`).
Non viene mai cancellato; serve come storico consultabile dall'host dal proprio dashboard.

| Colonna        | Tipo          | Note                                                                         |
| -------------- | ------------- | ---------------------------------------------------------------------------- |
| `id`           | `UUID PK`     | default `gen_random_uuid()`                                                  |
| `session_id`   | `UUID`        | soft reference (la sessione può sparire)                                     |
| `host_user_id` | `UUID`        | `auth.uid()` dell'host al momento del termine                                |
| `game_id`      | `UUID`        | riferimento al gioco                                                         |
| `game_name`    | `TEXT`        | snapshot del nome al momento del termine                                     |
| `played_at`    | `TIMESTAMPTZ` | data/ora di fine sessione                                                    |
| `player_count` | `INT`         | numero di partecipanti                                                       |
| `players`      | `JSONB`       | array ordinato per rank: `[{id, nickname, avatar_id, is_host, total_score}]` |
| `created_at`   | `TIMESTAMPTZ` | default `now()`                                                              |

RLS:

- `SELECT`: `auth.uid() = host_user_id` (solo l'host vede le proprie partite)
- Insert avviene tramite service role (route `/api/live/session/finish`) — nessun policy INSERT lato
  client

Indici:

- `idx_lsr_host` su `host_user_id`
- `idx_lsr_played_at` su `played_at`
- `idx_lsr_game_id` su `game_id`

Migration: `LIVE_SESSION_HISTORY.sql`

---

## Punteggio Live (client)

Calcolo usato lato client durante round live:

| Condizione        | Punti           |
| ----------------- | --------------- |
| risposta errata   | 0               |
| risposta corretta | 10              |
| combo 2 corrette  | +5 bonus        |
| combo 3 corrette  | +10 bonus       |
| combo 4+ corrette | +15 bonus (cap) |

## Realtime

Canali usati in app:

| Canale                           | Tabella              | Evento   | Scopo                        |
| -------------------------------- | -------------------- | -------- | ---------------------------- |
| `live_sessions:{id}`             | `live_sessions`      | `*`      | stato sessione e avanzamento |
| `live_players:{sessionId}`       | `live_players`       | `*`      | classifica live              |
| `live_round_answers:{sessionId}` | `live_round_answers` | `INSERT` | arrivo risposte              |

E presente fallback polling lato client durante la fase risultati.

## Nota Operativa Post-Reset Schema

Se esegui `drop schema public cascade; create schema public;`, devi ripristinare anche i permessi
sullo schema `public`, altrimenti puoi ricevere errori tipo `permission denied for schema public`.

SQL consigliato:

```sql
grant usage on schema public to anon, authenticated, service_role;
grant create on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
```
