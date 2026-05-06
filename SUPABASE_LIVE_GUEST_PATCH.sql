-- ============================================================================
-- PATCH: Guest participants in live sessions (no mandatory login)
-- Date: 2026-03-04
-- Apply in Supabase SQL Editor once.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) LIVE_SESSIONS: allow public read for live links (lobby/playing/finished)
-- ---------------------------------------------------------------------------

drop policy if exists "Players can view session they joined" on live_sessions;

drop policy if exists "Anyone can view public live sessions" on live_sessions;
create policy "Anyone can view public live sessions"
  on live_sessions for select
  using (status in ('lobby', 'playing', 'finished'));

-- ---------------------------------------------------------------------------
-- 2) GAME DATA: allow read when game is attached to a live session
--    (so private games can still be played by invited guests)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 3) Fix live policies that used ambiguous session_id references
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 4) Host permissions needed for scoring flow
-- ---------------------------------------------------------------------------

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

commit;
