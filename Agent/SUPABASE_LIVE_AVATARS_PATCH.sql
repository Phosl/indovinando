-- ============================================================================
-- PATCH: Expand live avatar_id constraint to support SVG avatars (1-16)
-- Apply in Supabase SQL Editor once on existing databases.
-- ============================================================================

begin;

alter table if exists live_players
  drop constraint if exists live_players_avatar_id_check;

alter table live_players
  add constraint live_players_avatar_id_check
  check (avatar_id >= 1 and avatar_id <= 16);

commit;