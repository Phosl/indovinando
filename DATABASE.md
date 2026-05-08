# Database Schema — Indovinando

Panoramica completa delle tabelle Supabase (PostgreSQL) usate dall'applicazione.

---

## Diagramma ER (semplificato)

```
auth.users
    │
    ├─── games ──────────────── game_questions ─── game_question_options
    │        │                        │                      │
    │        └─── game_bottles ───────┴── game_bottle_answers
    │
    └─── live_sessions ──── live_players ──── live_round_answers
```

---

## Tabelle di Gioco

### `games`

Rappresenta un gioco creato da un utente.

| Colonna      | Tipo                   | Note                     |
| ------------ | ---------------------- | ------------------------ |
| `id`         | `UUID PK`              | Generato automaticamente |
| `created_by` | `UUID FK → auth.users` | Creatore del gioco       |
| `name`       | `VARCHAR(255)`         | Nome del gioco           |
| `status`     | `VARCHAR(20)`          | `draft` \| `published`   |
| `created_at` | `TIMESTAMPTZ`          |                          |
| `updated_at` | `TIMESTAMPTZ`          |                          |

**RLS:**

- Tutti possono leggere i giochi con `status = 'published'` o propri
- Solo il creatore può inserire, modificare, eliminare

---

### `game_questions`

Le domande associate a un gioco. La stessa lista di domande si applica a tutte le bottiglie.

| Colonna         | Tipo              | Note                      |
| --------------- | ----------------- | ------------------------- |
| `id`            | `UUID PK`         |                           |
| `game_id`       | `UUID FK → games` |                           |
| `text`          | `TEXT`            | Testo della domanda       |
| `display_order` | `INTEGER`         | Ordine di visualizzazione |
| `created_at`    | `TIMESTAMPTZ`     |                           |

**Indice:** `idx_game_questions_game_id`

---

### `game_question_options`

Le opzioni di risposta per ogni domanda (risposta multipla).

| Colonna        | Tipo                       | Note                      |
| -------------- | -------------------------- | ------------------------- |
| `id`           | `UUID PK`                  |                           |
| `question_id`  | `UUID FK → game_questions` |                           |
| `text`         | `VARCHAR(255)`             | Testo dell'opzione        |
| `option_order` | `INTEGER`                  | Ordine di visualizzazione |
| `created_at`   | `TIMESTAMPTZ`              |                           |

**Indice:** `idx_game_question_options_question_id`

---

### `game_bottles`

Le bottiglie da indovinare in un gioco.

| Colonna        | Tipo              | Note                            |
| -------------- | ----------------- | ------------------------------- |
| `id`           | `UUID PK`         |                                 |
| `game_id`      | `UUID FK → games` |                                 |
| `name`         | `VARCHAR(255)`    | Nome del vino                   |
| `producer`     | `VARCHAR(255)`    | Produttore (opzionale)          |
| `year`         | `VARCHAR(4)`      | Annata (opzionale)              |
| `bottle_order` | `INTEGER`         | Ordine nella sequenza del gioco |
| `created_at`   | `TIMESTAMPTZ`     |                                 |

**Indice:** `idx_game_bottles_game_id`

---

### `game_bottle_answers`

Le **risposte corrette**: per ogni bottiglia e ogni domanda, quale opzione è quella giusta.

| Colonna       | Tipo                              | Note             |
| ------------- | --------------------------------- | ---------------- |
| `id`          | `UUID PK`                         |                  |
| `bottle_id`   | `UUID FK → game_bottles`          |                  |
| `question_id` | `UUID FK → game_questions`        |                  |
| `option_id`   | `UUID FK → game_question_options` | Opzione corretta |
| `created_at`  | `TIMESTAMPTZ`                     |                  |

> Una riga per coppia `(bottle_id, question_id)` definisce la risposta corretta.

**Indici:** `idx_game_bottle_answers_bottle_id`, `idx_game_bottle_answers_question_id`

---

## Tabelle Live (Multiplayer)

### `live_sessions`

Una sessione di gioco in tempo reale avviata dall'host.

| Colonna                  | Tipo                   | Note                                                        |
| ------------------------ | ---------------------- | ----------------------------------------------------------- |
| `id`                     | `UUID PK`              |                                                             |
| `game_id`                | `UUID FK → games`      | Gioco su cui si basa la sessione                            |
| `host_user_id`           | `UUID FK → auth.users` | Chi ha avviato la sessione                                  |
| `status`                 | `TEXT`                 | `lobby` \| `playing` \| `finished`                          |
| `current_question_index` | `INT`                  | Indice della bottiglia corrente (0-based)                   |
| `round_status`           | `TEXT`                 | `waiting_players` \| `waiting_answers` \| `showing_results` |
| `created_at`             | `TIMESTAMPTZ`          |                                                             |
| `started_at`             | `TIMESTAMPTZ`          | Quando il gioco è iniziato                                  |
| `finished_at`            | `TIMESTAMPTZ`          | Quando il gioco è terminato                                 |
| `updated_at`             | `TIMESTAMPTZ`          | Aggiornato ad ogni cambio di stato                          |

**Ciclo di vita della sessione:**

```
lobby → playing (host avvia)
playing → finished (ultima bottiglia completata)
```

**Ciclo di `round_status` per ogni bottiglia:**

```
waiting_players → waiting_answers → showing_results → (bottiglia successiva → waiting_answers)
```

**RLS:**

- L'host può creare/leggere/aggiornare le proprie sessioni
- I giocatori che hanno fatto join possono leggere la sessione

**Indici:** `idx_live_sessions_host`, `idx_live_sessions_game`, `idx_live_sessions_status`

---

### `live_players`

I partecipanti a una sessione live.

| Colonna       | Tipo                      | Note                                    |
| ------------- | ------------------------- | --------------------------------------- |
| `id`          | `UUID PK`                 |                                         |
| `session_id`  | `UUID FK → live_sessions` |                                         |
| `nickname`    | `TEXT`                    | Nome visualizzato; univoco per sessione |
| `avatar_id`   | `INT`                     | Da 1 a 10 (emoji avatar stile Apple)    |
| `user_id`     | `UUID FK → auth.users`    | `NULL` per giocatori anonimi            |
| `is_host`     | `BOOLEAN`                 | `true` se è l'host della sessione       |
| `total_score` | `INT`                     | Punteggio accumulato nella sessione     |
| `joined_at`   | `TIMESTAMPTZ`             |                                         |
| `created_at`  | `TIMESTAMPTZ`             |                                         |
| `updated_at`  | `TIMESTAMPTZ`             | Usato come segnale "pronto" dal client  |

**Vincolo:** `UNIQUE(session_id, nickname)`

**RLS:**

- Tutti possono leggere i giocatori di una sessione (necessario per la lobby)
- Chiunque può inserirsi (join anonimo o autenticato)
- Aggiornamento permesso se `user_id` è `NULL` o corrisponde all'utente autenticato

**Indici:** `idx_live_players_session`, `idx_live_players_user`

---

### `live_round_answers`

Le risposte inviate dai giocatori durante una sessione live. Al cambio di bottiglia la tabella viene
svuotata dall'host.

| Colonna              | Tipo                              | Note                                       |
| -------------------- | --------------------------------- | ------------------------------------------ |
| `id`                 | `UUID PK`                         |                                            |
| `session_id`         | `UUID FK → live_sessions`         |                                            |
| `player_id`          | `UUID FK → live_players`          |                                            |
| `question_id`        | `UUID FK → game_questions`        |                                            |
| `selected_option_id` | `UUID FK → game_question_options` | Opzione scelta                             |
| `is_correct`         | `BOOLEAN`                         | Calcolato client-side al momento del check |
| `points`             | `INT`                             | Punti guadagnati (10 base + combo bonus)   |
| `answered_at`        | `TIMESTAMPTZ`                     |                                            |
| `created_at`         | `TIMESTAMPTZ`                     |                                            |

**Vincolo:** `UNIQUE(session_id, player_id, question_id)` — un giocatore risponde una sola volta per
domanda

**RLS:**

- I giocatori possono inserire le proprie risposte
- I giocatori possono leggere le risposte della loro sessione

**Indici:** `idx_live_round_answers_session`, `idx_live_round_answers_player`,
`idx_live_round_answers_question`

---

### `live_round_status` _(tabella ausiliaria)_

Traccia lo stato per coppia `(sessione, domanda)`. Definita nello schema ma il client gestisce lo
stato principalmente tramite `live_sessions.round_status`.

| Colonna                     | Tipo                       | Note                                   |
| --------------------------- | -------------------------- | -------------------------------------- |
| `id`                        | `UUID PK`                  |                                        |
| `session_id`                | `UUID FK → live_sessions`  |                                        |
| `question_id`               | `UUID FK → game_questions` |                                        |
| `status`                    | `TEXT`                     | `waiting_answers` \| `showing_results` |
| `created_at` / `updated_at` | `TIMESTAMPTZ`              |                                        |

**Vincolo:** `UNIQUE(session_id, question_id)`

---

## Sistema di punteggio

Il punteggio viene calcolato nel client (`PlayerLiveClient.jsx`) al momento del check:

| Condizione                                  | Punti           |
| ------------------------------------------- | --------------- |
| Risposta errata                             | 0               |
| Risposta corretta                           | 10              |
| Risposta corretta in combo (2 consecutive)  | +5 bonus        |
| Risposta corretta in combo (3 consecutive)  | +10 bonus       |
| Risposta corretta in combo (4+ consecutive) | +15 bonus (cap) |

- Il combo si azzera ad ogni risposta sbagliata o al cambio bottiglia.
- Il punteggio viene accumulato su `live_players.total_score` dall'host dopo ogni bottiglia tramite
  `syncScoresFromAnswers`.

---

## Realtime

Supabase Realtime è abilitato su tutte le tabelle live. Il client si iscrive ai canali:

| Canale                           | Tabella              | Evento   | Scopo                                        |
| -------------------------------- | -------------------- | -------- | -------------------------------------------- |
| `live_sessions:{id}`             | `live_sessions`      | `*`      | Avanzamento bottiglia, cambio stato sessione |
| `live_players:{sessionId}`       | `live_players`       | `*`      | Aggiornamento classifica                     |
| `live_round_answers:{sessionId}` | `live_round_answers` | `INSERT` | Ricezione risposte in tempo reale            |

Il polling ogni 2 secondi (attivo dopo che il giocatore ha premuto "Vedi risultati") funge da
fallback Realtime per garantire la sincronizzazione.
