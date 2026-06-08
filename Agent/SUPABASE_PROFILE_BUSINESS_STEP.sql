-- ============================================================================
-- PATCH: Business profile fields
-- ============================================================================
-- Run this in Supabase SQL Editor if you already applied the earlier profile
-- migration before business fields were introduced.
-- ============================================================================

begin;

alter table public.profiles
  add column if not exists business_name text,
  add column if not exists business_type text,
  add column if not exists business_description text,
  add column if not exists business_website text,
  add column if not exists business_phone text,
  add column if not exists business_address text,
  add column if not exists business_latitude double precision,
  add column if not exists business_longitude double precision;

commit;
