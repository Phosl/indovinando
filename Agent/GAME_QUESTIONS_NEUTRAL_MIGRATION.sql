alter table public.game_questions
  add column if not exists kind text;

alter table public.game_questions
  add column if not exists is_neutral boolean not null default false;
