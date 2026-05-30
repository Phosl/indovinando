# Live Tavoli e Gruppi — Step 1 (MVP)

Data: 2026-05-30

## Obiettivo

Aggiungere una nuova modalita "Live per Tavoli e Gruppi" separata dalle modalita esistenti:

- QR unico evento degustazione
- utente sceglie `Crea partita` o `Partecipa`
- ogni partita ha codice breve random (es. `1545`)
- piu partite parallele sullo stesso evento
- classifica partita + classifica generale evento live

## Scelte consigliate (in base ai tuoi punti)

1. Riutilizzo codice esistente: SI, ma solo della logica quiz (domande, bottiglie, scoring).  
   Stato/sessioni/players/answers restano su nuove tabelle dedicate.
2. Codice partita: random numerico a 4 cifre, univoco per evento tra le partite attive.
3. Timeout inattivita: 15 minuti, configurabile via costante.
4. Nessun host: avanzamento round automatico quando tutti i player attivi hanno risposto.
5. Classifica generale evento: live (include partite in corso).
6. Login non obbligatorio: guest nickname + `player_token`.
7. Re-join persistente: NON incluso in step 1 (icebucket).
8. QR: punta a pagina evento con 2 azioni (`crea` / `partecipa`).
9. Isolamento: namespace DB/API nuovo (`table_live_*`, `/api/table-live/*`).
10. Dashboard enoteca avanzata: fuori scope step 1 (icebucket).

## Architettura (isolata)

Nuove entita:

- `table_live_events` (evento degustazione; 1 QR)
- `table_live_sessions` (partita tavolo, codice breve, stato round)
- `table_live_players` (partecipanti partita)
- `table_live_round_answers` (risposte round corrente)
- `table_live_event_results` (snapshot punteggi per storico/event leaderboard)

Riuso da esistente:

- `games`, `game_questions`, `game_question_options`, `game_bottles`, `game_bottle_answers`

In questo modo non tocchiamo `live_sessions/live_players/live_round_answers` gia attive.

## Flusso UX step 1

1. Enoteca crea evento (`table_live_events`) legato a un `game_id`.
2. Enoteca stampa QR: URL tipo `/table-live/event/[eventSlug]`.
3. Utente apre pagina evento:
   - `Crea partita` -> crea `table_live_session`, genera `join_code`, entra subito.
   - `Partecipa` -> inserisce codice, entra nella sessione.
4. In partita:
   - ogni player risponde alle domande della bottiglia corrente
   - quando tutti hanno risposto: advance automatico alla bottiglia successiva
   - punteggi aggiornati live su classifica partita
5. Leaderboard evento:
   - aggrega punteggi di tutte le sessioni attive/concluse dell'evento.

## SQL schema (step 1)

```sql
begin;

-- 1) Evento degustazione (QR unico)
create table if not exists public.table_live_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  game_id uuid not null references public.games(id) on delete restrict,
  created_by uuid null references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'closed')),
  inactivity_timeout_minutes int not null default 15 check (inactivity_timeout_minutes between 1 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_table_live_events_game_id
  on public.table_live_events(game_id);

create index if not exists idx_table_live_events_status
  on public.table_live_events(status);

-- 2) Sessione tavolo (partita indipendente)
create table if not exists public.table_live_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.table_live_events(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  join_code text not null,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished', 'expired')),
  current_bottle_index int not null default 0,
  round_status text not null default 'waiting_answers' check (round_status in ('waiting_answers', 'advancing')),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, join_code)
);

create index if not exists idx_table_live_sessions_event_id
  on public.table_live_sessions(event_id);

create index if not exists idx_table_live_sessions_status
  on public.table_live_sessions(status);

create index if not exists idx_table_live_sessions_last_activity
  on public.table_live_sessions(last_activity_at);

-- 3) Giocatori della sessione tavolo
create table if not exists public.table_live_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.table_live_sessions(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  nickname text not null,
  player_token text not null,
  total_score int not null default 0,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (session_id, player_token)
);

create index if not exists idx_table_live_players_session
  on public.table_live_players(session_id);

create index if not exists idx_table_live_players_user
  on public.table_live_players(user_id);

-- 4) Risposte round corrente (simile live esistente ma isolata)
create table if not exists public.table_live_round_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.table_live_sessions(id) on delete cascade,
  player_id uuid not null references public.table_live_players(id) on delete cascade,
  bottle_index int not null,
  question_id uuid not null references public.game_questions(id) on delete cascade,
  selected_option_id uuid not null references public.game_question_options(id) on delete cascade,
  is_correct boolean not null,
  points int not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, player_id, bottle_index, question_id)
);

create index if not exists idx_table_live_answers_session
  on public.table_live_round_answers(session_id);

create index if not exists idx_table_live_answers_player
  on public.table_live_round_answers(player_id);

create index if not exists idx_table_live_answers_bottle
  on public.table_live_round_answers(session_id, bottle_index);

-- 5) Snapshot classifica evento (storico/aggregazioni)
create table if not exists public.table_live_event_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.table_live_events(id) on delete cascade,
  session_id uuid not null references public.table_live_sessions(id) on delete cascade,
  player_id uuid not null references public.table_live_players(id) on delete cascade,
  score int not null default 0,
  rank_in_session int null,
  captured_at timestamptz not null default now()
);

create index if not exists idx_table_live_event_results_event
  on public.table_live_event_results(event_id);

create index if not exists idx_table_live_event_results_session
  on public.table_live_event_results(session_id);

commit;
```

## API namespace consigliato (step 1)

- `POST /api/table-live/event/create`
- `POST /api/table-live/session/create`
- `POST /api/table-live/session/join`
- `POST /api/table-live/round-answer`
- `POST /api/table-live/advance-auto`
- `GET /api/table-live/session/standings`
- `GET /api/table-live/event/standings`

Nota: teniamo tutto sotto `table-live` per evitare conflitti con `/api/live/*`.

## Regole di gioco (step 1)

- sessione va in `expired` se `now() - last_activity_at > inactivity_timeout_minutes`
- ogni submit risposta aggiorna `last_activity_at`
- auto-advance quando count(player attivi) == count(player con risposta per tutte le domande del round)
- su advance:
  - somma punti round nei `table_live_players.total_score`
  - pulizia risposte round corrente
  - `current_bottle_index += 1`
  - se oltre ultima bottiglia -> `status = finished`

## Sicurezza minima consigliata

- tutte le write su tabelle `table_live_*` via API server-side (service role)
- per player anonimi usare `player_token` random salvato in cookie/localStorage
- route player richiedono `session_id + player_id + player_token`
- rate limit su `join` e `round-answer` (step 2 se non ora)

## Scope implementazione immediata (iniziamo da qui)

Step 1A:

- migrazione SQL tabelle `table_live_*`
- pagina evento QR (`/table-live/event/[slug]`) con bottoni `Crea` / `Partecipa`
- create session + join by code

Step 1B:

- pagina gioco sessione tavolo (`/table-live/session/[sessionId]`)
- submit risposte, auto-advance, classifica partita live
- classifica generale evento live

Step 1C:

- timeout inattivita configurabile
- gestione stati `finished/expired`

