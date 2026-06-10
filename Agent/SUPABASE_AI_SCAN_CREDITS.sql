alter table public.profiles
  add column if not exists ai_scan_credits_total integer not null default 30,
  add column if not exists ai_scan_credits_bonus integer not null default 0,
  add column if not exists ai_scan_credits_used integer not null default 0;

alter table public.profiles
  alter column ai_scan_credits_total set default 30,
  alter column ai_scan_credits_bonus set default 0,
  alter column ai_scan_credits_used set default 0;

update public.profiles
set
  ai_scan_credits_total = coalesce(ai_scan_credits_total, 30),
  ai_scan_credits_bonus = coalesce(ai_scan_credits_bonus, 0),
  ai_scan_credits_used = coalesce(ai_scan_credits_used, 0)
where
  ai_scan_credits_total is null
  or ai_scan_credits_bonus is null
  or ai_scan_credits_used is null;

create or replace function public.consume_ai_scan_credits(p_user_id uuid, p_amount integer default 1)
returns table (
  ai_scan_credits_total integer,
  ai_scan_credits_bonus integer,
  ai_scan_credits_used integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount integer := greatest(coalesce(p_amount, 0), 0);
begin
  if v_amount < 1 then
    raise exception 'INVALID_SCAN_CREDIT_AMOUNT';
  end if;

  update public.profiles as profile_row
  set
    ai_scan_credits_total = coalesce(profile_row.ai_scan_credits_total, 30),
    ai_scan_credits_bonus = coalesce(profile_row.ai_scan_credits_bonus, 0),
    ai_scan_credits_used = coalesce(profile_row.ai_scan_credits_used, 0)
  where profile_row.id = p_user_id;

  return query
  update public.profiles as profile_row
  set
    ai_scan_credits_used = coalesce(profile_row.ai_scan_credits_used, 0) + v_amount,
    updated_at = now()
  where
    profile_row.id = p_user_id
    and (
      coalesce(profile_row.ai_scan_credits_total, 30) +
      coalesce(profile_row.ai_scan_credits_bonus, 0) -
      coalesce(profile_row.ai_scan_credits_used, 0)
    ) >= v_amount
  returning
    profile_row.ai_scan_credits_total,
    profile_row.ai_scan_credits_bonus,
    profile_row.ai_scan_credits_used;
end;
$$;

grant execute on function public.consume_ai_scan_credits(uuid, integer) to authenticated;
