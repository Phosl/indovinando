-- ============================================================================
-- LIVE SESSION HISTORY
-- Saves a permanent snapshot when a live session finishes.
-- Run once in Supabase SQL Editor.
-- ============================================================================

create table if not exists live_session_results (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null,          -- original session (may be deleted later)
  host_user_id  uuid not null references auth.users(id) on delete cascade,
  game_id       uuid,                   -- soft reference; game may be deleted
  game_name     text not null,
  played_at     timestamptz not null,
  player_count  int not null default 0,
  -- Full leaderboard snapshot: [{id, user_id, nickname, avatar_id, total_score, rank, is_host}]
  players       jsonb not null default '[]',
  created_at    timestamptz default now()
);

create index if not exists idx_lsr_host      on live_session_results(host_user_id);
create index if not exists idx_lsr_played_at on live_session_results(played_at desc);
create index if not exists idx_lsr_game_id   on live_session_results(game_id);

alter table live_session_results enable row level security;

-- Host can read their own session results
drop policy if exists "Host can read own session results" on live_session_results;
create policy "Host can read own session results"
  on live_session_results for select
  using (auth.uid() = host_user_id);

-- Only server-side (service role) inserts — no direct client insert allowed
-- (the /api/live/session/finish route uses the admin client)
