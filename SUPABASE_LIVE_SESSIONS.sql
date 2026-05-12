-- ============================================================================
-- LIVE SESSIONS SCHEMA - Wine Game Multiplayer
-- ============================================================================

-- 1. LIVE SESSIONS - Una sessione di gioco live
CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'playing', 'finished')),
  current_question_index INT DEFAULT 0,
  round_status TEXT NOT NULL DEFAULT 'waiting_players' CHECK (round_status IN ('waiting_players', 'waiting_answers', 'showing_results')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. LIVE PLAYERS - Partecipanti alla sessione
CREATE TABLE IF NOT EXISTS live_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,

  nickname TEXT NOT NULL,
  avatar_id INT NOT NULL CHECK (avatar_id >= 1 AND avatar_id <= 16), -- 1-10 emoji, 11-16 SVG avatars

  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- opzionale (anonimo o loggato)

  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_host BOOLEAN DEFAULT FALSE,

  -- Punteggio totale nella sessione
  total_score INT DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique nickname per sessione
  UNIQUE(session_id, nickname)
);

-- 3. LIVE ROUND ANSWERS - Le risposte dei giocatori
CREATE TABLE IF NOT EXISTS live_round_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES live_players(id) ON DELETE CASCADE,

  question_id UUID NOT NULL REFERENCES game_questions(id) ON DELETE CASCADE,
  selected_option_id UUID NOT NULL REFERENCES game_question_options(id) ON DELETE CASCADE,

  is_correct BOOLEAN DEFAULT FALSE,
  points INT DEFAULT 0,

  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Un giocatore risponde una volta per domanda
  UNIQUE(session_id, player_id, question_id)
);

-- 4. LIVE ROUND STATUS - Traccia lo stato di ogni round/bottiglia
CREATE TABLE IF NOT EXISTS live_round_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES game_questions(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'waiting_answers' CHECK (status IN ('waiting_answers', 'showing_results')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Una riga per sessione+domanda
  UNIQUE(session_id, question_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_round_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_round_status ENABLE ROW LEVEL SECURITY;

-- LIVE_SESSIONS RLS
-- Host can view/create/update own sessions
CREATE POLICY "Host can view own live sessions"
  ON live_sessions FOR SELECT
  USING (auth.uid() = host_user_id);

CREATE POLICY "Host can create live sessions for own games"
  ON live_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = host_user_id AND
    EXISTS (SELECT 1 FROM games WHERE id = game_id AND created_by = auth.uid())
  );

CREATE POLICY "Host can update own session status"
  ON live_sessions FOR UPDATE
  USING (auth.uid() = host_user_id)
  WITH CHECK (auth.uid() = host_user_id);

-- Players can view session they joined
CREATE POLICY "Players can view session they joined"
  ON live_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM live_players
      WHERE session_id = live_sessions.id
      AND user_id = auth.uid()
    )
  );

-- LIVE_PLAYERS RLS
-- Anyone can view players in session (for lobby display)
CREATE POLICY "Anyone can view players in session"
  ON live_players FOR SELECT
  USING (TRUE);

-- Players can insert themselves (join)
CREATE POLICY "Player can join session"
  ON live_players FOR INSERT
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
  );

-- Players can update own avatar/nickname before game starts
CREATE POLICY "Player can view own player record"
  ON live_players FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- LIVE_ROUND_ANSWERS RLS
-- Players can insert own answers
CREATE POLICY "Player can submit own answers"
  ON live_round_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM live_players
      WHERE id = player_id
      AND (user_id = auth.uid() OR user_id IS NULL)
    )
  );

-- Players can view own answers + all answers after round ends
CREATE POLICY "Players can view answers when round shows results"
  ON live_round_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM live_players
      WHERE session_id = session_id
      AND (user_id = auth.uid() OR user_id IS NULL)
    )
  );

-- LIVE_ROUND_STATUS RLS
-- Anyone in session can view round status
CREATE POLICY "Session participants can view round status"
  ON live_round_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM live_players
      WHERE session_id = session_id
      AND (user_id = auth.uid() OR user_id IS NULL)
    )
  );

-- Host can update round status
CREATE POLICY "Host can update round status"
  ON live_round_status FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM live_sessions
      WHERE id = session_id
      AND host_user_id = auth.uid()
    )
  );

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_live_sessions_host ON live_sessions(host_user_id);
CREATE INDEX idx_live_sessions_game ON live_sessions(game_id);
CREATE INDEX idx_live_sessions_status ON live_sessions(status);

CREATE INDEX idx_live_players_session ON live_players(session_id);
CREATE INDEX idx_live_players_user ON live_players(user_id);

CREATE INDEX idx_live_round_answers_session ON live_round_answers(session_id);
CREATE INDEX idx_live_round_answers_player ON live_round_answers(player_id);
CREATE INDEX idx_live_round_answers_question ON live_round_answers(question_id);

CREATE INDEX idx_live_round_status_session ON live_round_status(session_id);
CREATE INDEX idx_live_round_status_question ON live_round_status(question_id);

-- ============================================================================
-- INSERIMENTI TEST (opzionale - commenta se non vuoi)
-- ============================================================================
-- INSERT INTO live_sessions (game_id, host_user_id, status)
-- SELECT id, created_by, 'lobby' FROM games LIMIT 1;
