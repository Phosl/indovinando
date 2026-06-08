-- ============================================================================
-- PATCH: Phase 1 profile onboarding
-- ============================================================================
-- Adds the profile fields required by the onboarding wizard and dashboard.
-- Run in Supabase SQL Editor on existing environments.
-- ============================================================================

begin;

alter table public.profiles
  add column if not exists profile_type text,
  add column if not exists experience_level text,
  add column if not exists favorite_wine_types text[] not null default '{}',
  add column if not exists favorite_countries text[] not null default '{}',
  add column if not exists city text,
  add column if not exists province text,
  add column if not exists newsletter_opt_in boolean not null default false,
  add column if not exists business_name text,
  add column if not exists business_type text,
  add column if not exists business_description text,
  add column if not exists business_website text,
  add column if not exists business_phone text,
  add column if not exists business_address text,
  add column if not exists business_latitude double precision,
  add column if not exists business_longitude double precision,
  add column if not exists profile_completed_at timestamptz,
  add column if not exists profile_prompt_dismissed_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_profile_type_check;

alter table public.profiles
  add constraint profiles_profile_type_check
  check (
    profile_type is null
    or profile_type in ('enthusiast', 'wine_shop', 'restaurant', 'educator', 'other_business')
  );

alter table public.profiles
  drop constraint if exists profiles_experience_level_check;

alter table public.profiles
  add constraint profiles_experience_level_check
  check (
    experience_level is null
    or experience_level in ('beginner', 'amateur', 'enthusiast', 'expert', 'sommelier', 'professional')
  );

commit;
