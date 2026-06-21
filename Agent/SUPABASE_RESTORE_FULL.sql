-- ============================================================================
-- INDOVINANDO - FULL SUPABASE RESTORE (post reset schema public)
-- ============================================================================
-- Use case:
--   After running:
--     drop schema public cascade;
--     create schema public;
--
-- This script restores:
--   - schema grants
--   - required extensions
--   - app tables
--   - indexes
--   - RLS + policies
--
-- Safe to run on empty schema. Mostly idempotent on repeated runs.
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- 0) Schema + extension bootstrap
-- --------------------------------------------------------------------------

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

grant usage on schema public to anon, authenticated, service_role;
grant create on schema public to postgres, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
grant all on tables to anon, authenticated, service_role;

alter default privileges in schema public
grant all on sequences to anon, authenticated, service_role;

alter default privileges in schema public
grant all on functions to anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- 1) Profiles
-- --------------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  preferred_language text not null default 'it' check (preferred_language in ('it', 'en')),
  avatar_emoji text,
  onboarding boolean default true,
  profile_type text check (profile_type in ('enthusiast', 'wine_shop', 'restaurant', 'educator', 'other_business')),
  experience_level text check (experience_level in ('beginner', 'amateur', 'enthusiast', 'expert', 'sommelier', 'professional')),
  favorite_wine_types text[] not null default '{}',
  favorite_countries text[] not null default '{}',
  city text,
  province text,
  newsletter_opt_in boolean not null default false,
  business_name text,
  business_type text,
  business_description text,
  business_website text,
  business_phone text,
  business_address text,
  business_latitude double precision,
  business_longitude double precision,
  ai_scan_credits_total integer not null default 30,
  ai_scan_credits_bonus integer not null default 0,
  ai_scan_credits_used integer not null default 0,
  profile_completed_at timestamptz,
  profile_prompt_dismissed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'username', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do update
  set username = coalesce(public.profiles.username, excluded.username);

  return new;
end;
$$;

revoke execute on function public.handle_new_user_profile() from public;
revoke execute on function public.handle_new_user_profile() from anon;
revoke execute on function public.handle_new_user_profile() from authenticated;

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

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

alter table profiles enable row level security;

drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke execute on function public.consume_ai_scan_credits(uuid, integer) from public;
revoke execute on function public.consume_ai_scan_credits(uuid, integer) from anon;
revoke execute on function public.consume_ai_scan_credits(uuid, integer) from authenticated;
grant execute on function public.consume_ai_scan_credits(uuid, integer) to service_role;

-- --------------------------------------------------------------------------
-- 2) Core game tables
-- --------------------------------------------------------------------------

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  name varchar(255) not null,
  status varchar(20) default 'draft',
  cover_index integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table games
  add column if not exists cover_index integer;

create table if not exists game_questions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  text text not null,
  display_order integer not null,
  created_at timestamptz default now()
);

create table if not exists game_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references game_questions(id) on delete cascade,
  text varchar(255) not null,
  option_order integer not null,
  created_at timestamptz default now()
);

create table if not exists game_bottles (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  name varchar(255) not null,
  producer varchar(255),
  year varchar(4),
  wine_type text,
  bottle_order integer not null,
  created_at timestamptz default now()
);

alter table game_bottles
  add column if not exists wine_type text,
  add column if not exists canonical_wine_key text,
  add column if not exists wine_vintage_id uuid,
  add column if not exists price_value numeric(10,2),
  add column if not exists price_min numeric(10,2),
  add column if not exists price_max numeric(10,2),
  add column if not exists price_currency text,
  add column if not exists price_band text,
  add column if not exists region_label text,
  add column if not exists appellation_label text;

create table if not exists game_bottle_answers (
  id uuid primary key default gen_random_uuid(),
  bottle_id uuid not null references game_bottles(id) on delete cascade,
  question_id uuid not null references game_questions(id) on delete cascade,
  option_id uuid not null references game_question_options(id) on delete cascade,
  created_at timestamptz default now()
);

create index if not exists idx_games_created_by on games(created_by);
create index if not exists idx_game_questions_game_id on game_questions(game_id);
create index if not exists idx_game_question_options_question_id on game_question_options(question_id);
create index if not exists idx_game_bottles_game_id on game_bottles(game_id);
create index if not exists idx_game_bottles_canonical_wine_key on game_bottles(canonical_wine_key);
create index if not exists idx_game_bottles_wine_vintage_id on game_bottles(wine_vintage_id);
create index if not exists idx_game_bottle_answers_bottle_id on game_bottle_answers(bottle_id);
create index if not exists idx_game_bottle_answers_question_id on game_bottle_answers(question_id);

alter table games enable row level security;
alter table game_questions enable row level security;
alter table game_question_options enable row level security;
alter table game_bottles enable row level security;
alter table game_bottle_answers enable row level security;

drop policy if exists "Games are readable by everyone" on games;
create policy "Games are readable by everyone"
  on games for select
  using (status = 'published' or created_by = auth.uid());

drop policy if exists "Games are editable by creator" on games;
create policy "Games are editable by creator"
  on games for update
  using (created_by = auth.uid());

drop policy if exists "Games are deletable by creator" on games;
create policy "Games are deletable by creator"
  on games for delete
  using (created_by = auth.uid());

drop policy if exists "Games are creatable by auth users" on games;
create policy "Games are creatable by auth users"
  on games for insert
  with check (auth.uid() = created_by);

drop policy if exists "Questions readable if game is readable" on game_questions;
create policy "Questions readable if game is readable"
  on game_questions for select
  using (
    exists (
      select 1
      from games
      where games.id = game_id
        and (games.status = 'published' or games.created_by = auth.uid())
    )
  );

drop policy if exists "Options readable if game is readable" on game_question_options;
create policy "Options readable if game is readable"
  on game_question_options for select
  using (
    exists (
      select 1
      from game_questions
      join games on games.id = game_questions.game_id
      where game_questions.id = question_id
        and (games.status = 'published' or games.created_by = auth.uid())
    )
  );

drop policy if exists "Bottles readable if game is readable" on game_bottles;
create policy "Bottles readable if game is readable"
  on game_bottles for select
  using (
    exists (
      select 1
      from games
      where games.id = game_id
        and (games.status = 'published' or games.created_by = auth.uid())
    )
  );

drop policy if exists "Answers readable if game is readable" on game_bottle_answers;
create policy "Answers readable if game is readable"
  on game_bottle_answers for select
  using (
    exists (
      select 1
      from game_bottles
      join games on games.id = game_bottles.game_id
      where game_bottles.id = bottle_id
        and (games.status = 'published' or games.created_by = auth.uid())
    )
  );

drop policy if exists "Questions creatable by game creator" on game_questions;
create policy "Questions creatable by game creator"
  on game_questions for insert
  with check (
    exists (
      select 1
      from games
      where games.id = game_id
        and games.created_by = auth.uid()
    )
  );

drop policy if exists "Options creatable by game creator" on game_question_options;
create policy "Options creatable by game creator"
  on game_question_options for insert
  with check (
    exists (
      select 1
      from game_questions
      join games on games.id = game_questions.game_id
      where game_questions.id = question_id
        and games.created_by = auth.uid()
    )
  );

drop policy if exists "Bottles creatable by game creator" on game_bottles;
create policy "Bottles creatable by game creator"
  on game_bottles for insert
  with check (
    exists (
      select 1
      from games
      where games.id = game_id
        and games.created_by = auth.uid()
    )
  );

drop policy if exists "Answers creatable by game creator" on game_bottle_answers;
create policy "Answers creatable by game creator"
  on game_bottle_answers for insert
  with check (
    exists (
      select 1
      from game_bottles
      join games on games.id = game_bottles.game_id
      where games.created_by = auth.uid()
    )
  );

drop policy if exists "Questions deletable by game creator" on game_questions;
create policy "Questions deletable by game creator"
  on game_questions for delete
  using (
    exists (
      select 1
      from games
      where games.id = game_id
        and games.created_by = auth.uid()
    )
  );

drop policy if exists "Options deletable by game creator" on game_question_options;
create policy "Options deletable by game creator"
  on game_question_options for delete
  using (
    exists (
      select 1
      from game_questions
      join games on games.id = game_questions.game_id
      where game_questions.id = question_id
        and games.created_by = auth.uid()
    )
  );

drop policy if exists "Bottles deletable by game creator" on game_bottles;
create policy "Bottles deletable by game creator"
  on game_bottles for delete
  using (
    exists (
      select 1
      from games
      where games.id = game_id
        and games.created_by = auth.uid()
    )
  );

drop policy if exists "Answers deletable by game creator" on game_bottle_answers;
create policy "Answers deletable by game creator"
  on game_bottle_answers for delete
  using (
    exists (
      select 1
      from game_bottles
      join games on games.id = game_bottles.game_id
      where games.created_by = auth.uid()
    )
  );

-- Guest patch policies on game data (for live sessions)
-- NOTE: applied later, after live_sessions table is created.

-- --------------------------------------------------------------------------
-- 3) Live multiplayer tables
-- --------------------------------------------------------------------------

create table if not exists live_sessions (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid not null references games(id) on delete cascade,
  host_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  current_question_index int default 0,
  round_status text not null default 'waiting_players' check (round_status in ('waiting_players', 'waiting_answers', 'showing_results')),
  created_at timestamptz default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists live_players (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references live_sessions(id) on delete cascade,
  nickname text not null,
  avatar_id int not null check (avatar_id >= 1 and avatar_id <= 16),
  user_id uuid references auth.users(id) on delete set null,
  joined_at timestamptz default now(),
  is_host boolean default false,
  total_score int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(session_id, nickname)
);

create table if not exists live_round_answers (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references live_sessions(id) on delete cascade,
  player_id uuid not null references live_players(id) on delete cascade,
  question_id uuid not null references game_questions(id) on delete cascade,
  selected_option_id uuid not null references game_question_options(id) on delete cascade,
  is_correct boolean default false,
  points int default 0,
  answered_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(session_id, player_id, question_id)
);

create table if not exists live_round_status (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references live_sessions(id) on delete cascade,
  question_id uuid not null references game_questions(id) on delete cascade,
  status text not null default 'waiting_answers' check (status in ('waiting_answers', 'showing_results')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(session_id, question_id)
);

create index if not exists idx_live_sessions_host on live_sessions(host_user_id);
create index if not exists idx_live_sessions_game on live_sessions(game_id);
create index if not exists idx_live_sessions_status on live_sessions(status);
create index if not exists idx_live_players_session on live_players(session_id);
create index if not exists idx_live_players_user on live_players(user_id);
create index if not exists idx_live_round_answers_session on live_round_answers(session_id);
create index if not exists idx_live_round_answers_player on live_round_answers(player_id);
create index if not exists idx_live_round_answers_question on live_round_answers(question_id);
create index if not exists idx_live_round_status_session on live_round_status(session_id);
create index if not exists idx_live_round_status_question on live_round_status(question_id);

-- Guest patch policies on game data (for live sessions)
drop policy if exists "Games readable in live session" on games;
create policy "Games readable in live session"
  on games for select
  using (
    exists (
      select 1
      from live_sessions
      where live_sessions.game_id = games.id
    )
  );

drop policy if exists "Questions readable in live session" on game_questions;
create policy "Questions readable in live session"
  on game_questions for select
  using (
    exists (
      select 1
      from live_sessions
      where live_sessions.game_id = game_questions.game_id
    )
  );

drop policy if exists "Options readable in live session" on game_question_options;
create policy "Options readable in live session"
  on game_question_options for select
  using (
    exists (
      select 1
      from game_questions
      join live_sessions on live_sessions.game_id = game_questions.game_id
      where game_questions.id = game_question_options.question_id
    )
  );

drop policy if exists "Bottles readable in live session" on game_bottles;
create policy "Bottles readable in live session"
  on game_bottles for select
  using (
    exists (
      select 1
      from live_sessions
      where live_sessions.game_id = game_bottles.game_id
    )
  );

drop policy if exists "Bottle answers readable in live session" on game_bottle_answers;
create policy "Bottle answers readable in live session"
  on game_bottle_answers for select
  using (
    exists (
      select 1
      from game_bottles
      join live_sessions on live_sessions.game_id = game_bottles.game_id
      where game_bottles.id = game_bottle_answers.bottle_id
    )
  );

alter table live_sessions enable row level security;
alter table live_players enable row level security;
alter table live_round_answers enable row level security;
alter table live_round_status enable row level security;

drop policy if exists "Host can view own live sessions" on live_sessions;
create policy "Host can view own live sessions"
  on live_sessions for select
  using (auth.uid() = host_user_id);

drop policy if exists "Host can create live sessions for own games" on live_sessions;
create policy "Host can create live sessions for own games"
  on live_sessions for insert
  with check (
    auth.uid() = host_user_id
    and exists (
      select 1
      from games
      where id = game_id
        and created_by = auth.uid()
    )
  );

drop policy if exists "Host can update own session status" on live_sessions;
create policy "Host can update own session status"
  on live_sessions for update
  using (auth.uid() = host_user_id)
  with check (auth.uid() = host_user_id);

-- Guest patch replacement for session read
drop policy if exists "Players can view session they joined" on live_sessions;
drop policy if exists "Anyone can view public live sessions" on live_sessions;
create policy "Anyone can view public live sessions"
  on live_sessions for select
  using (status in ('lobby', 'playing', 'finished'));

drop policy if exists "Anyone can view players in session" on live_players;
create policy "Anyone can view players in session"
  on live_players for select
  using (true);

drop policy if exists "Player can join session" on live_players;
create policy "Player can join session"
  on live_players for insert
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "Player can view own player record" on live_players;
create policy "Player can view own player record"
  on live_players for update
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);

drop policy if exists "Player can submit own answers" on live_round_answers;
create policy "Player can submit own answers"
  on live_round_answers for insert
  with check (
    exists (
      select 1
      from live_players
      where id = player_id
        and (user_id = auth.uid() or user_id is null)
    )
  );

drop policy if exists "Players can view answers when round shows results" on live_round_answers;
create policy "Players can view answers when round shows results"
  on live_round_answers for select
  using (
    exists (
      select 1
      from live_players
      where live_players.session_id = live_round_answers.session_id
        and (live_players.user_id = auth.uid() or live_players.user_id is null)
    )
  );

drop policy if exists "Session participants can view round status" on live_round_status;
create policy "Session participants can view round status"
  on live_round_status for select
  using (
    exists (
      select 1
      from live_players
      where live_players.session_id = live_round_status.session_id
        and (live_players.user_id = auth.uid() or live_players.user_id is null)
    )
  );

drop policy if exists "Host can update round status" on live_round_status;
create policy "Host can update round status"
  on live_round_status for update
  using (
    exists (
      select 1
      from live_sessions
      where id = session_id
        and host_user_id = auth.uid()
    )
  );

drop policy if exists "Host can score round answers" on live_round_answers;
create policy "Host can score round answers"
  on live_round_answers for update
  using (
    exists (
      select 1
      from live_sessions
      where live_sessions.id = live_round_answers.session_id
        and live_sessions.host_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from live_sessions
      where live_sessions.id = live_round_answers.session_id
        and live_sessions.host_user_id = auth.uid()
    )
  );

drop policy if exists "Host can reset round answers" on live_round_answers;
create policy "Host can reset round answers"
  on live_round_answers for delete
  using (
    exists (
      select 1
      from live_sessions
      where live_sessions.id = live_round_answers.session_id
        and live_sessions.host_user_id = auth.uid()
    )
  );

drop policy if exists "Host can update player scores" on live_players;
create policy "Host can update player scores"
  on live_players for update
  using (
    exists (
      select 1
      from live_sessions
      where live_sessions.id = live_players.session_id
        and live_sessions.host_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from live_sessions
      where live_sessions.id = live_players.session_id
        and live_sessions.host_user_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------------
-- 4) Wine course progress
-- --------------------------------------------------------------------------

create table if not exists wine_course_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  level_id text not null,
  lesson_id text not null,
  completed boolean not null default false,
  score integer not null default 0,
  max_score integer not null default 0,
  attempts integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, level_id, lesson_id)
);

alter table wine_course_progress enable row level security;

drop policy if exists "Users read own progress" on wine_course_progress;
create policy "Users read own progress"
  on wine_course_progress for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own progress" on wine_course_progress;
create policy "Users insert own progress"
  on wine_course_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own progress" on wine_course_progress;
create policy "Users update own progress"
  on wine_course_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 5) Enoteca minimal tables
-- --------------------------------------------------------------------------

create table if not exists enoteca_tasting_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  nickname text not null,
  table_name text,
  current_bottle_index integer not null default 0,
  status text not null default 'in_progress',
  total_score integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists enoteca_answers (
  id uuid primary key default gen_random_uuid(),
  tasting_session_id uuid not null references enoteca_tasting_sessions(id) on delete cascade,
  bottle_id uuid not null references game_bottles(id) on delete cascade,
  question_id uuid not null references game_questions(id) on delete cascade,
  selected_option_id uuid references game_question_options(id),
  is_correct boolean,
  points integer not null default 0,
  answered_at timestamptz not null default now(),
  unique (tasting_session_id, bottle_id, question_id)
);

create index if not exists idx_enoteca_sessions_game on enoteca_tasting_sessions(game_id);
create index if not exists idx_enoteca_sessions_user on enoteca_tasting_sessions(user_id);
create index if not exists idx_enoteca_answers_session on enoteca_answers(tasting_session_id);
create index if not exists idx_enoteca_answers_bottle on enoteca_answers(bottle_id);

alter table enoteca_tasting_sessions enable row level security;
alter table enoteca_answers enable row level security;

drop policy if exists "anon insert session" on enoteca_tasting_sessions;
create policy "anon insert session"
  on enoteca_tasting_sessions for insert
  with check (true);

drop policy if exists "anon read session" on enoteca_tasting_sessions;
create policy "anon read session"
  on enoteca_tasting_sessions for select
  using (true);

drop policy if exists "anon update session" on enoteca_tasting_sessions;
create policy "anon update session"
  on enoteca_tasting_sessions for update
  using (true)
  with check (true);

drop policy if exists "anon manage answers" on enoteca_answers;
create policy "anon manage answers"
  on enoteca_answers for all
  using (true)
  with check (true);

commit;

-- ============================================================================
-- Optional post-run checks
-- ============================================================================
-- select table_name from information_schema.tables where table_schema = 'public' order by table_name;
-- select schemaname, tablename, policyname from pg_policies where schemaname='public' order by tablename, policyname;
