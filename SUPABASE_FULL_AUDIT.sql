-- ============================================================================
-- INDOVINANDO - FULL DATABASE AUDIT
-- ============================================================================
-- Run in Supabase SQL Editor to verify database integrity
-- Reports missing tables, columns, constraints, indexes, and RLS policies
-- ============================================================================

-- === 1) TABLE PRESENCE CHECK ===
select
  req.table_name,
  case when t.table_name is not null then '✓ EXISTS' else '✗ MISSING' end as status
from (
  values
    ('profiles'),
    ('games'),
    ('game_questions'),
    ('game_question_options'),
    ('game_bottles'),
    ('game_bottle_answers'),
    ('live_sessions'),
    ('live_players'),
    ('live_round_answers'),
    ('live_round_status'),
    ('wine_course_progress'),
    ('enoteca_tasting_sessions'),
    ('enoteca_answers')
) req(table_name)
left join information_schema.tables t
  on t.table_schema = 'public'
  and t.table_name = req.table_name
order by req.table_name;

-- === 2) CRITICAL COLUMNS CHECK ===
select
  'profiles' as table_name,
  string_agg(column_name, ', ') as expected_columns
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
union all
select 'games', string_agg(column_name, ', ')
from information_schema.columns
where table_schema = 'public' and table_name = 'games'
union all
select 'live_sessions', string_agg(column_name, ', ')
from information_schema.columns
where table_schema = 'public' and table_name = 'live_sessions'
union all
select 'live_players', string_agg(column_name, ', ')
from information_schema.columns
where table_schema = 'public' and table_name = 'live_players'
union all
select 'live_round_answers', string_agg(column_name, ', ')
from information_schema.columns
where table_schema = 'public' and table_name = 'live_round_answers'
union all
select 'live_round_status', string_agg(column_name, ', ')
from information_schema.columns
where table_schema = 'public' and table_name = 'live_round_status'
order by table_name;

-- === 3) LIVE SESSIONS - TABLE ROW COUNT & SAMPLE ===
select count(*) as live_sessions_count from live_sessions;
select count(*) as live_players_count from live_players;
select count(*) as live_round_answers_count from live_round_answers;
select count(*) as live_round_status_count from live_round_status;

-- === 4) GAME DATA INTEGRITY CHECK ===
select count(*) as total_games from games;
select count(*) as published_games from games where status = 'published';
select count(*) as draft_games from games where status = 'draft';
select count(*) as game_questions_total from game_questions;
select count(*) as game_bottles_total from game_bottles;
select count(*) as game_bottle_answers_total from game_bottle_answers;

-- === 5) MISSING FOREIGN KEY REFERENCES (ORPHANED RECORDS) ===
-- Game questions pointing to deleted games
select 'game_questions' as table_name, count(*) as orphaned_count
from game_questions g
where not exists (select 1 from games where id = g.game_id)
union all
-- Bottles pointing to deleted games
select 'game_bottles', count(*)
from game_bottles b
where not exists (select 1 from games where id = b.game_id)
union all
-- Question options pointing to deleted questions
select 'game_question_options', count(*)
from game_question_options o
where not exists (select 1 from game_questions where id = o.question_id)
union all
-- Bottle answers pointing to deleted bottles
select 'game_bottle_answers', count(*)
from game_bottle_answers ba
where not exists (select 1 from game_bottles where id = ba.bottle_id)
union all
-- Live players pointing to deleted sessions
select 'live_players', count(*)
from live_players lp
where not exists (select 1 from live_sessions where id = lp.session_id)
union all
-- Live round answers pointing to deleted sessions/players/questions
select 'live_round_answers', count(*)
from live_round_answers lra
where not exists (select 1 from live_sessions where id = lra.session_id)
   or not exists (select 1 from live_players where id = lra.player_id)
   or not exists (select 1 from game_questions where id = lra.question_id);

-- === 6) RLS STATUS ===
select
  c.relname as table_name,
  case when c.relrowsecurity then '✓ RLS ENABLED' else '✗ RLS DISABLED' end as status
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles', 'games', 'game_questions', 'game_question_options',
    'game_bottles', 'game_bottle_answers', 'live_sessions', 'live_players',
    'live_round_answers', 'live_round_status', 'wine_course_progress',
    'enoteca_tasting_sessions', 'enoteca_answers'
  )
order by c.relname;

-- === 7) POLICY COUNT BY TABLE ===
select
  tablename,
  count(*) as policy_count
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;

-- === 8) CRITICAL INDEXES ===
select
  tablename,
  indexname,
  case when indexname like 'idx_%' then '✓ FOUND' else '⚠ CHECK' end as status
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'games', 'game_questions', 'game_bottles', 'game_bottle_answers',
    'live_sessions', 'live_players', 'live_round_answers', 'live_round_status'
  )
order by tablename, indexname;

-- === 9) UNIQUE CONSTRAINTS ===
select
  t.tablename,
  c.conname as constraint_name,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class r on c.conrelid = r.oid
join pg_namespace n on r.relnamespace = n.oid
join pg_tables t on r.relname = t.tablename and n.nspname = t.schemaname
where n.nspname = 'public'
  and c.contype = 'u'
  and t.tablename in (
    'games', 'profiles', 'live_players', 'live_round_answers', 'live_round_status'
  )
order by t.tablename, c.conname;

-- === 10) PROFILE TRIGGER & FUNCTION ===
select
  p.proname as function_name,
  n.nspname as schema_name,
  '✓ FOUND' as status
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'handle_new_user_profile'
union all
select
  'handle_new_user_profile',
  'public',
  '✗ MISSING'
where not exists (
  select 1 from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'handle_new_user_profile'
);

-- === 11) RECENT LIVE SESSION ACTIVITY (LAST 10) ===
select
  id,
  game_id,
  status,
  round_status,
  created_at,
  updated_at
from live_sessions
order by created_at desc
limit 10;

-- === 12) WINE COURSE PROGRESS TABLE ===
select count(*) as wine_progress_records from wine_course_progress;
select
  string_agg(column_name, ', ') as columns
from information_schema.columns
where table_schema = 'public' and table_name = 'wine_course_progress';

-- === 13) ENOTECA SCHEMA CHECK ===
select count(*) as enoteca_sessions from enoteca_tasting_sessions;
select count(*) as enoteca_answers from enoteca_answers;

-- enoteca_tasting_sessions columns
select 'enoteca_tasting_sessions' as table_name, string_agg(column_name, ', ') as columns
from information_schema.columns
where table_schema = 'public' and table_name = 'enoteca_tasting_sessions'
union all
-- enoteca_answers columns
select 'enoteca_answers', string_agg(column_name, ', ')
from information_schema.columns
where table_schema = 'public' and table_name = 'enoteca_answers';

-- === AUDIT COMPLETE ===
-- Next steps if issues found:
-- 1. Copy the failing query from above
-- 2. Check against SUPABASE_RESTORE_FULL.sql
-- 3. Apply missing DDL manually or re-run full restore
