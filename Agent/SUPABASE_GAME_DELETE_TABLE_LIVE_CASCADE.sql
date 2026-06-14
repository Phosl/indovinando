-- Allow deleting a tasting with linked multiplayer events/sessions.
-- Safe to run multiple times.

begin;

alter table if exists public.table_live_sessions
  drop constraint if exists table_live_sessions_game_id_fkey,
  add constraint table_live_sessions_game_id_fkey
    foreign key (game_id)
    references public.games(id)
    on delete cascade;

alter table if exists public.table_live_events
  drop constraint if exists table_live_events_game_id_fkey,
  add constraint table_live_events_game_id_fkey
    foreign key (game_id)
    references public.games(id)
    on delete cascade;

commit;
