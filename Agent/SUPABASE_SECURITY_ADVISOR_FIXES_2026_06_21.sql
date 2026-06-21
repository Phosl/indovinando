-- Supabase Security Advisor fixes — 2026-06-21
-- Run in Supabase SQL Editor after reviewing Agent/SUPABASE_SECURITY_ADVISOR_RECAP_2026_06_21.md.
-- This script applies safe-first fixes and intentionally does not rewrite Enoteca/Table Live RLS flows.

begin;

-- ---------------------------------------------------------------------------
-- 1) Views: make them security invoker instead of security definer.
-- ---------------------------------------------------------------------------

alter view if exists public.wine_catalog
  set (security_invoker = true);

alter view if exists public.wine_catalog_producer_stats
  set (security_invoker = true);

alter view if exists public.public_wine_rating_events
  set (security_invoker = true);

alter view if exists public.public_wine_rankings
  set (security_invoker = true);

alter view if exists public.public_user_rankings
  set (security_invoker = true);

-- Keep intended API visibility explicit. RLS still applies because views are invoker.
grant select on public.wine_catalog to authenticated;
grant select on public.wine_catalog_producer_stats to authenticated;
grant select on public.public_wine_rating_events to service_role;
grant select on public.public_wine_rankings to service_role;
grant select on public.public_user_rankings to service_role;

-- ---------------------------------------------------------------------------
-- 2) Trigger functions: pin search_path.
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'alter function public.set_updated_at() set search_path = public';
  end if;

  if to_regprocedure('public.touch_ai_credit_purchase_orders_updated_at()') is not null then
    execute 'alter function public.touch_ai_credit_purchase_orders_updated_at() set search_path = public';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) SECURITY DEFINER RPC functions: remove public execution.
-- ---------------------------------------------------------------------------

revoke execute on function public.consume_ai_scan_credits(uuid, integer)
  from public, anon, authenticated;

grant execute on function public.consume_ai_scan_credits(uuid, integer)
  to service_role;

revoke execute on function public.grant_ai_credit_purchase(
  text,
  text,
  text,
  uuid,
  text,
  integer,
  integer,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.grant_ai_credit_purchase(
  text,
  text,
  text,
  uuid,
  text,
  integer,
  integer,
  text,
  jsonb
) to service_role;

revoke execute on function public.handle_new_user_profile()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Public storage bucket: keep public object URLs, remove broad listing.
-- ---------------------------------------------------------------------------

drop policy if exists "business-branding public read"
  on storage.objects;

-- ---------------------------------------------------------------------------
-- 5) Extensions: move pg_trgm out of public when present.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from pg_extension
    where extname = 'pg_trgm'
  ) then
    create schema if not exists extensions;
    execute 'alter extension pg_trgm set schema extensions';
  end if;
end $$;

commit;

-- Suggested checks after running:
-- 1. Re-run Supabase Security Advisor.
-- 2. Test AI scan credits, Stripe webhook credit grant, public rankings, wine catalog admin, and business logo upload/display.
