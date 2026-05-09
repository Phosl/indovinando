-- ============================================================================
-- PATCH: Profiles preferences (language + avatar)
-- ============================================================================
-- Run this in Supabase SQL Editor on existing environments.
-- Adds user preference fields used by app:
--   - preferred_language ('it' | 'en')
--   - avatar_emoji
--   - updated_at
-- ============================================================================

begin;

alter table public.profiles
  add column if not exists preferred_language text,
  add column if not exists avatar_emoji text,
  add column if not exists updated_at timestamptz not null default now();

-- Normalize existing values and set defaults
update public.profiles
set preferred_language = 'it'
where preferred_language is null
   or preferred_language not in ('it', 'en');

alter table public.profiles
  alter column preferred_language set default 'it';

-- Enforce valid language choices
alter table public.profiles
  drop constraint if exists profiles_preferred_language_check;

alter table public.profiles
  add constraint profiles_preferred_language_check
  check (preferred_language in ('it', 'en'));

commit;
