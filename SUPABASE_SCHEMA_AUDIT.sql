-- ============================================================================
-- INDOVINANDO - SUPABASE SCHEMA AUDIT
-- ============================================================================
-- Run in Supabase SQL Editor after restore/migrations.
-- Purpose: verify table presence, RLS, critical UNIQUE constraints, indexes,
-- policies, and profile trigger wiring.
-- ============================================================================

-- 1) Required tables
select
  t.table_name,
  case when t.table_name is null then 'MISSING' else 'OK' end as status
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
) req(name)
left join information_schema.tables t
  on t.table_schema = 'public'
 and t.table_name = req.name
order by req.name;

-- 2) RLS enabled check
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles',
    'games',
    'game_questions',
    'game_question_options',
    'game_bottles',
    'game_bottle_answers',
    'live_sessions',
    'live_players',
    'live_round_answers',
    'live_round_status',
    'wine_course_progress',
    'enoteca_tasting_sessions',
    'enoteca_answers'
  )
order by c.relname;

-- 3) Critical UNIQUE constraints
select
  conname,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where contype = 'u'
  and conrelid::regclass::text in (
    'live_players',
    'live_round_answers',
    'live_round_status',
    'wine_course_progress',
    'enoteca_answers'
  )
order by table_name, conname;

-- 4) Critical indexes
select
  indexname,
  tablename,
  indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'idx_games_created_by',
    'idx_game_questions_game_id',
    'idx_game_question_options_question_id',
    'idx_game_bottles_game_id',
    'idx_game_bottle_answers_bottle_id',
    'idx_game_bottle_answers_question_id',
    'idx_live_sessions_host',
    'idx_live_sessions_game',
    'idx_live_sessions_status',
    'idx_live_players_session',
    'idx_live_players_user',
    'idx_live_round_answers_session',
    'idx_live_round_answers_player',
    'idx_live_round_answers_question',
    'idx_live_round_status_session',
    'idx_live_round_status_question',
    'idx_enoteca_sessions_game',
    'idx_enoteca_answers_session',
    'idx_enoteca_answers_bottle'
  )
order by tablename, indexname;

-- 5) Policies snapshot
select
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 6) Must-have policy names (quick existence)
select
  req.policy_name,
  req.table_name,
  case when p.policyname is null then 'MISSING' else 'OK' end as status
from (
  values
    ('Users can read own profile', 'profiles'),
    ('Users can insert own profile', 'profiles'),
    ('Users can update own profile', 'profiles'),
    ('Games are readable by everyone', 'games'),
    ('Games are creatable by auth users', 'games'),
    ('Games readable in live session', 'games'),
    ('Anyone can view public live sessions', 'live_sessions'),
    ('Host can score round answers', 'live_round_answers'),
    ('Host can update player scores', 'live_players'),
    ('Users read own progress', 'wine_course_progress'),
    ('Users insert own progress', 'wine_course_progress'),
    ('Users update own progress', 'wine_course_progress'),
    ('anon insert session', 'enoteca_tasting_sessions'),
    ('anon manage answers', 'enoteca_answers')
) req(policy_name, table_name)
left join pg_policies p
  on p.schemaname = 'public'
 and p.tablename = req.table_name
 and p.policyname = req.policy_name
order by req.table_name, req.policy_name;

-- 7) Profile trigger/function presence
select
  p.proname as function_name,
  n.nspname as schema_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'handle_new_user_profile';

select
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table,
  action_statement
from information_schema.triggers
where trigger_name = 'on_auth_user_created_profile';

-- 8) Default privileges and schema grants (important after reset)
select
  grantee,
  privilege_type
from information_schema.role_usage_grants
where object_schema = 'public'
order by grantee, privilege_type;
