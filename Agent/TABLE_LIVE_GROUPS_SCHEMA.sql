-- Live Tavoli e Gruppi - schema separato (step 1)
-- Safe to run multiple times.

begin;

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

create table if not exists public.table_live_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.table_live_events(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  join_code text not null,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished', 'expired')),
  current_bottle_index int not null default 0,
  answer_reveal_mode text not null default 'instant' check (answer_reveal_mode in ('instant', 'end')),
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

-- ---------------------------------------------------------------------------
-- RLS baseline policies (step 1)
-- NOTE: kept permissive to support guest/table flows and server routes.
-- ---------------------------------------------------------------------------
alter table public.table_live_events enable row level security;
alter table public.table_live_sessions enable row level security;
alter table public.table_live_players enable row level security;
alter table public.table_live_round_answers enable row level security;
alter table public.table_live_event_results enable row level security;

drop policy if exists "Public read active table live events" on public.table_live_events;
create policy "Public read active table live events"
  on public.table_live_events for select
  using (status = 'active');

drop policy if exists "Authenticated create own table live events" on public.table_live_events;
create policy "Authenticated create own table live events"
  on public.table_live_events for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Owner manage own table live events" on public.table_live_events;
create policy "Owner manage own table live events"
  on public.table_live_events for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "Public read table live sessions" on public.table_live_sessions;
create policy "Public read table live sessions"
  on public.table_live_sessions for select
  using (true);

drop policy if exists "Public insert table live sessions" on public.table_live_sessions;
create policy "Public insert table live sessions"
  on public.table_live_sessions for insert
  with check (true);

drop policy if exists "Public update table live sessions" on public.table_live_sessions;
create policy "Public update table live sessions"
  on public.table_live_sessions for update
  using (true)
  with check (true);

drop policy if exists "Public read table live players" on public.table_live_players;
create policy "Public read table live players"
  on public.table_live_players for select
  using (true);

drop policy if exists "Public insert table live players" on public.table_live_players;
create policy "Public insert table live players"
  on public.table_live_players for insert
  with check (true);

drop policy if exists "Public update table live players" on public.table_live_players;
create policy "Public update table live players"
  on public.table_live_players for update
  using (true)
  with check (true);

drop policy if exists "Public read table live answers" on public.table_live_round_answers;
create policy "Public read table live answers"
  on public.table_live_round_answers for select
  using (true);

drop policy if exists "Public insert table live answers" on public.table_live_round_answers;
create policy "Public insert table live answers"
  on public.table_live_round_answers for insert
  with check (true);

drop policy if exists "Public update table live answers" on public.table_live_round_answers;
create policy "Public update table live answers"
  on public.table_live_round_answers for update
  using (true)
  with check (true);

drop policy if exists "Public delete table live answers" on public.table_live_round_answers;
create policy "Public delete table live answers"
  on public.table_live_round_answers for delete
  using (true);

drop policy if exists "Public read table live event results" on public.table_live_event_results;
create policy "Public read table live event results"
  on public.table_live_event_results for select
  using (true);

drop policy if exists "Public write table live event results" on public.table_live_event_results;
create policy "Public write table live event results"
  on public.table_live_event_results for all
  using (true)
  with check (true);

commit;
