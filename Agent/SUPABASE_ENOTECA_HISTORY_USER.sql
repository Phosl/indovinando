begin;

alter table if exists public.enoteca_tasting_sessions
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_enoteca_sessions_user
  on public.enoteca_tasting_sessions(user_id);

commit;
