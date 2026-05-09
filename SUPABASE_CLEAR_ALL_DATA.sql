-- ============================================================================
-- INDOVINANDO - CLEAR ALL DATA (including auth)
-- ============================================================================
-- Purpose:
--   Remove all rows from public + auth tables while keeping schema, constraints,
--   indexes, RLS policies, functions and triggers.
--
-- Run in Supabase SQL Editor as project owner.
-- ============================================================================

begin;

-- 1) Clear all data in public schema (keep structure)
do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('truncate table public.%I restart identity cascade', r.tablename);
  end loop;
end $$;

-- 2) Clear all data in auth schema (users included)
-- Exclude migration metadata table.
-- NOTE: do NOT use RESTART IDENTITY in auth, because some sequences are not
-- owned by the executing role in Supabase managed schemas.
do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'auth'
      and tablename not in ('schema_migrations')
  loop
    execute format('truncate table auth.%I cascade', r.tablename);
  end loop;
end $$;

commit;

-- Optional quick checks
-- select count(*) from auth.users;
-- select table_name from information_schema.tables where table_schema = 'public' order by 1;
