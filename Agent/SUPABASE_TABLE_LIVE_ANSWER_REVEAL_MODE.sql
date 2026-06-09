begin;

alter table if exists public.table_live_sessions
  add column if not exists answer_reveal_mode text not null default 'instant';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'table_live_sessions_answer_reveal_mode_check'
  ) then
    alter table public.table_live_sessions
      add constraint table_live_sessions_answer_reveal_mode_check
      check (answer_reveal_mode in ('instant', 'end'));
  end if;
end $$;

commit;
