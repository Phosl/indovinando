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

---

## Tabelle Gioco

### `games`

Gioco creato dall'utente.

| Colonna      | Tipo                    | Note                        |
| ------------ | ----------------------- | --------------------------- |
| `id`         | `UUID PK`               | default `gen_random_uuid()` |
| `created_by` | `UUID FK -> auth.users` | creatore                    |
| `name`       | `VARCHAR(255)`          | nome gioco                  |
| `status`     | `VARCHAR(20)`           | `draft` o `published`       |
| `created_at` | `TIMESTAMPTZ`           | default `now()`             |
| `updated_at` | `TIMESTAMPTZ`           | default `now()`             |

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

| Colonna        | Tipo               | Note      |
| -------------- | ------------------ | --------- |
| `id`           | `UUID PK`          |           |
| `game_id`      | `UUID FK -> games` |           |
| `name`         | `VARCHAR(255)`     | nome vino |
| `producer`     | `VARCHAR(255)`     | opzionale |
| `year`         | `VARCHAR(4)`       | opzionale |
| `bottle_order` | `INTEGER`          | ordine    |
| `created_at`   | `TIMESTAMPTZ`      |           |

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
