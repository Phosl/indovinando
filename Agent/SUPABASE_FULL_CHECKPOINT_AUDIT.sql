-- ============================================================================
-- INDOVINANDO - FULL CHECKPOINT AUDIT
-- ============================================================================
-- Scopo:
--   Fotografare lo stato reale del DB Supabase in un momento preciso, in modo
--   utile sia per debug sia come checkpoint se in futuro serve ricostruire
--   schema, policy, viste o oggetti mancanti.
--
-- Come usarlo:
--   1. Apri Supabase SQL Editor
--   2. Incolla ed esegui questo file
--   3. Salva l'output dei result-set piu importanti
--
-- Cosa copre:
--   - estensioni
--   - tabelle richieste
--   - colonne critiche
--   - viste
--   - indici
--   - vincoli UNIQUE/FK/CHECK
--   - RLS e policy
--   - trigger/funzioni principali
--   - bucket/storage policies
--   - conteggi record
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0) Timestamp checkpoint
-- --------------------------------------------------------------------------
select now() as checkpoint_created_at;

-- --------------------------------------------------------------------------
-- 1) Estensioni richieste
-- --------------------------------------------------------------------------
select
  e.extname as extension_name,
  e.extversion as extension_version
from pg_extension e
where e.extname in ('pgcrypto', 'uuid-ossp', 'pg_trgm')
order by e.extname;

-- --------------------------------------------------------------------------
-- 2) Tabelle richieste - presenza
-- --------------------------------------------------------------------------
select
  req.schema_name,
  req.table_name,
  case when t.table_name is null then 'MISSING' else 'OK' end as status
from (
  values
    ('public', 'profiles'),
    ('public', 'games'),
    ('public', 'game_questions'),
    ('public', 'game_question_options'),
    ('public', 'game_bottles'),
    ('public', 'game_bottle_answers'),
    ('public', 'live_sessions'),
    ('public', 'live_players'),
    ('public', 'live_round_answers'),
    ('public', 'live_round_status'),
    ('public', 'live_session_results'),
    ('public', 'wine_course_progress'),
    ('public', 'enoteca_tasting_sessions'),
    ('public', 'enoteca_answers'),
    ('public', 'wine_producers'),
    ('public', 'wine_grapes'),
    ('public', 'wine_labels'),
    ('public', 'wine_label_grapes'),
    ('public', 'wine_vintages'),
    ('public', 'wine_sources'),
    ('public', 'wine_import_staging'),
    ('public', 'tasting_bottle_images'),
    ('public', 'table_live_events'),
    ('public', 'table_live_sessions'),
    ('public', 'table_live_players'),
    ('public', 'table_live_round_answers'),
    ('public', 'table_live_event_results')
) req(schema_name, table_name)
left join information_schema.tables t
  on t.table_schema = req.schema_name
 and t.table_name = req.table_name
order by req.schema_name, req.table_name;

-- --------------------------------------------------------------------------
-- 3) Viste richieste - presenza
-- --------------------------------------------------------------------------
select
  req.schema_name,
  req.view_name,
  case when v.table_name is null then 'MISSING' else 'OK' end as status
from (
  values
    ('public', 'wine_catalog'),
    ('public', 'wine_catalog_producer_stats')
) req(schema_name, view_name)
left join information_schema.views v
  on v.table_schema = req.schema_name
 and v.table_name = req.view_name
order by req.schema_name, req.view_name;

-- --------------------------------------------------------------------------
-- 4) Colonne critiche - giochi / live / enoteca / corso
-- --------------------------------------------------------------------------
select
  table_name,
  string_agg(column_name, ', ' order by ordinal_position) as columns
from information_schema.columns
where table_schema = 'public'
  and table_name in (
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
    'live_session_results',
    'wine_course_progress',
    'enoteca_tasting_sessions',
    'enoteca_answers'
  )
group by table_name
order by table_name;

-- --------------------------------------------------------------------------
-- 5) Colonne critiche - catalogo vino / auto tasting / table-live
-- --------------------------------------------------------------------------
select
  table_name,
  string_agg(column_name, ', ' order by ordinal_position) as columns
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'wine_producers',
    'wine_grapes',
    'wine_labels',
    'wine_label_grapes',
    'wine_vintages',
    'wine_sources',
    'wine_import_staging',
    'tasting_bottle_images',
    'table_live_events',
    'table_live_sessions',
    'table_live_players',
    'table_live_round_answers',
    'table_live_event_results'
  )
group by table_name
order by table_name;

-- --------------------------------------------------------------------------
-- 6) Focus colonne moderne catalogo / auto tasting
-- --------------------------------------------------------------------------
select
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
from information_schema.columns c
where c.table_schema = 'public'
  and (
    (c.table_name = 'wine_labels' and c.column_name in (
      'quiz_region', 'quiz_appellation', 'quiz_price_band',
      'body', 'acidity', 'elaborate', 'harmonize', 'search_tokens'
    ))
    or
    (c.table_name = 'wine_vintages' and c.column_name in (
      'external_id', 'price', 'price_min', 'price_max', 'price_band', 'currency'
    ))
    or
    (c.table_name = 'wine_sources' and c.column_name in (
      'data_source', 'external_source_id', 'raw_payload'
    ))
    or
    (c.table_name = 'tasting_bottle_images' and c.column_name in (
      'recognized_payload', 'recognized_name', 'recognized_producer',
      'recognized_vintage', 'recognition_confidence', 'error_message'
    ))
  )
order by c.table_name, c.ordinal_position;

-- --------------------------------------------------------------------------
-- 7) Definizione view vino
-- --------------------------------------------------------------------------
select
  schemaname,
  viewname,
  definition
from pg_views
where schemaname = 'public'
  and viewname in ('wine_catalog', 'wine_catalog_producer_stats')
order by viewname;

-- --------------------------------------------------------------------------
-- 8) RLS abilitato?
-- --------------------------------------------------------------------------
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
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
    'enoteca_answers',
    'wine_producers',
    'wine_grapes',
    'wine_labels',
    'wine_label_grapes',
    'wine_vintages',
    'wine_sources',
    'wine_import_staging',
    'tasting_bottle_images',
    'table_live_events',
    'table_live_sessions',
    'table_live_players',
    'table_live_round_answers',
    'table_live_event_results'
  )
order by c.relname;

-- --------------------------------------------------------------------------
-- 9) Snapshot policy completa
-- --------------------------------------------------------------------------
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- --------------------------------------------------------------------------
-- 10) Indici snapshot
-- --------------------------------------------------------------------------
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
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
    'enoteca_answers',
    'wine_producers',
    'wine_grapes',
    'wine_labels',
    'wine_label_grapes',
    'wine_vintages',
    'wine_sources',
    'wine_import_staging',
    'tasting_bottle_images',
    'table_live_events',
    'table_live_sessions',
    'table_live_players',
    'table_live_round_answers',
    'table_live_event_results'
  )
order by tablename, indexname;

-- --------------------------------------------------------------------------
-- 11) Vincoli snapshot (PK / UNIQUE / FK / CHECK)
-- --------------------------------------------------------------------------
select
  n.nspname as schema_name,
  r.relname as table_name,
  c.conname as constraint_name,
  c.contype as constraint_type,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class r on c.conrelid = r.oid
join pg_namespace n on r.relnamespace = n.oid
where n.nspname = 'public'
  and r.relname in (
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
    'live_session_results',
    'wine_course_progress',
    'enoteca_tasting_sessions',
    'enoteca_answers',
    'wine_producers',
    'wine_grapes',
    'wine_labels',
    'wine_label_grapes',
    'wine_vintages',
    'wine_sources',
    'wine_import_staging',
    'tasting_bottle_images',
    'table_live_events',
    'table_live_sessions',
    'table_live_players',
    'table_live_round_answers',
    'table_live_event_results'
  )
order by r.relname, c.contype, c.conname;

-- --------------------------------------------------------------------------
-- 12) Trigger e funzioni principali
-- --------------------------------------------------------------------------
select
  trigger_schema,
  event_object_table,
  trigger_name,
  event_manipulation,
  action_statement
from information_schema.triggers
where trigger_schema in ('public')
order by event_object_table, trigger_name;

select
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'set_updated_at',
    'handle_new_user_profile'
  )
order by p.proname;

-- --------------------------------------------------------------------------
-- 13) Bucket e storage policies
-- --------------------------------------------------------------------------
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in ('tasting-bottles', 'corsi')
order by id;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

-- --------------------------------------------------------------------------
-- 14) Conteggi record principali
-- --------------------------------------------------------------------------
select 'profiles' as table_name, count(*) as row_count from public.profiles
union all select 'games', count(*) from public.games
union all select 'game_questions', count(*) from public.game_questions
union all select 'game_question_options', count(*) from public.game_question_options
union all select 'game_bottles', count(*) from public.game_bottles
union all select 'game_bottle_answers', count(*) from public.game_bottle_answers
union all select 'live_sessions', count(*) from public.live_sessions
union all select 'live_players', count(*) from public.live_players
union all select 'live_round_answers', count(*) from public.live_round_answers
union all select 'live_round_status', count(*) from public.live_round_status
union all select 'live_session_results', count(*) from public.live_session_results
union all select 'wine_course_progress', count(*) from public.wine_course_progress
union all select 'enoteca_tasting_sessions', count(*) from public.enoteca_tasting_sessions
union all select 'enoteca_answers', count(*) from public.enoteca_answers
union all select 'wine_producers', count(*) from public.wine_producers
union all select 'wine_grapes', count(*) from public.wine_grapes
union all select 'wine_labels', count(*) from public.wine_labels
union all select 'wine_label_grapes', count(*) from public.wine_label_grapes
union all select 'wine_vintages', count(*) from public.wine_vintages
union all select 'wine_sources', count(*) from public.wine_sources
union all select 'wine_import_staging', count(*) from public.wine_import_staging
union all select 'tasting_bottle_images', count(*) from public.tasting_bottle_images
union all select 'table_live_events', count(*) from public.table_live_events
union all select 'table_live_sessions', count(*) from public.table_live_sessions
union all select 'table_live_players', count(*) from public.table_live_players
union all select 'table_live_round_answers', count(*) from public.table_live_round_answers
union all select 'table_live_event_results', count(*) from public.table_live_event_results
order by table_name;

-- --------------------------------------------------------------------------
-- 15) Orfani principali
-- --------------------------------------------------------------------------
select 'game_questions -> games' as check_name, count(*) as orphaned_count
from public.game_questions q
where not exists (select 1 from public.games g where g.id = q.game_id)
union all
select 'game_bottles -> games', count(*)
from public.game_bottles b
where not exists (select 1 from public.games g where g.id = b.game_id)
union all
select 'game_question_options -> game_questions', count(*)
from public.game_question_options o
where not exists (select 1 from public.game_questions q where q.id = o.question_id)
union all
select 'game_bottle_answers -> game_bottles', count(*)
from public.game_bottle_answers a
where not exists (select 1 from public.game_bottles b where b.id = a.bottle_id)
union all
select 'game_bottle_answers -> game_questions', count(*)
from public.game_bottle_answers a
where not exists (select 1 from public.game_questions q where q.id = a.question_id)
union all
select 'live_players -> live_sessions', count(*)
from public.live_players p
where not exists (select 1 from public.live_sessions s where s.id = p.session_id)
union all
select 'live_round_answers -> live_sessions', count(*)
from public.live_round_answers a
where not exists (select 1 from public.live_sessions s where s.id = a.session_id)
union all
select 'wine_labels -> wine_producers', count(*)
from public.wine_labels l
where l.producer_id is not null
  and not exists (select 1 from public.wine_producers p where p.id = l.producer_id)
union all
select 'wine_vintages -> wine_labels', count(*)
from public.wine_vintages v
where not exists (select 1 from public.wine_labels l where l.id = v.wine_label_id)
union all
select 'wine_sources -> wine_vintages', count(*)
from public.wine_sources s
where not exists (select 1 from public.wine_vintages v where v.id = s.wine_vintage_id)
union all
select 'tasting_bottle_images -> games', count(*)
from public.tasting_bottle_images i
where i.game_id is not null
  and not exists (select 1 from public.games g where g.id = i.game_id)
order by check_name;

-- --------------------------------------------------------------------------
-- 16) Ultimi record utili per debug
-- --------------------------------------------------------------------------
select * from public.tasting_bottle_images order by created_at desc limit 10;
select * from public.live_sessions order by created_at desc limit 10;
select * from public.table_live_events order by created_at desc limit 10;
select * from public.games order by created_at desc limit 10;

-- ============================================================================
-- FINE AUDIT
-- ============================================================================
-- Se vuoi un checkpoint ancora piu forte:
--   - esporta anche l'output di pg_policies
--   - esporta anche l'output di pg_indexes
--   - salva questo file insieme ai result-set
-- ============================================================================
