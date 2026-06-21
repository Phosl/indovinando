begin;

create table if not exists public.ai_credit_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  pack_code text not null,
  credits_amount integer not null check (credits_amount > 0),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'eur',
  status text not null default 'pending' check (
    status in ('pending', 'completed', 'expired', 'failed', 'refunded')
  ),
  metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ai_credit_purchase_orders_user_id
  on public.ai_credit_purchase_orders(user_id);

create index if not exists idx_ai_credit_purchase_orders_status
  on public.ai_credit_purchase_orders(status);

create table if not exists public.ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purchase_order_id uuid references public.ai_credit_purchase_orders(id) on delete set null,
  entry_type text not null check (
    entry_type in (
      'signup_bonus',
      'purchase',
      'manual_bonus',
      'consumption',
      'refund',
      'adjustment'
    )
  ),
  delta integer not null check (delta <> 0),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ai_credit_ledger_user_id
  on public.ai_credit_ledger(user_id, created_at desc);

create index if not exists idx_ai_credit_ledger_purchase_order_id
  on public.ai_credit_ledger(purchase_order_id);

alter table public.ai_credit_purchase_orders enable row level security;
alter table public.ai_credit_ledger enable row level security;

drop policy if exists "Users can read own ai credit purchase orders"
  on public.ai_credit_purchase_orders;
create policy "Users can read own ai credit purchase orders"
  on public.ai_credit_purchase_orders
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own ai credit ledger"
  on public.ai_credit_ledger;
create policy "Users can read own ai credit ledger"
  on public.ai_credit_ledger
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.touch_ai_credit_purchase_orders_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_ai_credit_purchase_orders_updated_at
  on public.ai_credit_purchase_orders;
create trigger trg_ai_credit_purchase_orders_updated_at
before update on public.ai_credit_purchase_orders
for each row
execute function public.touch_ai_credit_purchase_orders_updated_at();

create or replace function public.grant_ai_credit_purchase(
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_customer_id text,
  p_user_id uuid,
  p_pack_code text,
  p_credits_amount integer,
  p_amount_cents integer,
  p_currency text default 'eur',
  p_metadata jsonb default '{}'::jsonb
)
returns public.ai_credit_purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.ai_credit_purchase_orders;
begin
  if p_credits_amount <= 0 then
    raise exception 'credits_amount must be positive';
  end if;

  insert into public.ai_credit_purchase_orders (
    user_id,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    stripe_customer_id,
    pack_code,
    credits_amount,
    amount_cents,
    currency,
    status,
    metadata,
    completed_at
  )
  values (
    p_user_id,
    p_checkout_session_id,
    p_payment_intent_id,
    p_customer_id,
    p_pack_code,
    p_credits_amount,
    p_amount_cents,
    coalesce(nullif(trim(p_currency), ''), 'eur'),
    'completed',
    coalesce(p_metadata, '{}'::jsonb),
    timezone('utc', now())
  )
  on conflict (stripe_checkout_session_id)
  do update
  set
    stripe_payment_intent_id = excluded.stripe_payment_intent_id,
    stripe_customer_id = excluded.stripe_customer_id,
    metadata = excluded.metadata,
    completed_at = coalesce(public.ai_credit_purchase_orders.completed_at, excluded.completed_at),
    status = 'completed'
  returning * into v_order;

  if not exists (
    select 1
    from public.ai_credit_ledger
    where purchase_order_id = v_order.id
      and entry_type = 'purchase'
  ) then
    insert into public.ai_credit_ledger (
      user_id,
      purchase_order_id,
      entry_type,
      delta,
      note,
      metadata
    )
    values (
      v_order.user_id,
      v_order.id,
      'purchase',
      v_order.credits_amount,
      'Stripe checkout completed',
      jsonb_build_object(
        'pack_code', v_order.pack_code,
        'stripe_checkout_session_id', v_order.stripe_checkout_session_id
      )
    );

    update public.profiles
    set
      ai_scan_credits_bonus = coalesce(ai_scan_credits_bonus, 0) + v_order.credits_amount,
      updated_at = timezone('utc', now())
    where id = v_order.user_id;
  end if;

  return v_order;
end;
$$;

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
) from public;
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
) from anon;
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
) from authenticated;
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

comment on function public.grant_ai_credit_purchase(
  text,
  text,
  text,
  uuid,
  text,
  integer,
  integer,
  text,
  jsonb
) is 'Accredita in modo idempotente un acquisto crediti Stripe e aggiorna il saldo compatibile con il client attuale.';

commit;
