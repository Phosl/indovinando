-- =====================================================
-- INDOVINANDO - Game Tables (SOLO GIOCHI)
-- =====================================================
-- ⚠️ ATTENZIONE: Esegui SOLO questo
-- auth.users e profiles già esistono
-- =====================================================

-- 1. Tabella GAMES (i giochi che crei)
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabella GAME_QUESTIONS (le domande del gioco)
CREATE TABLE IF NOT EXISTS game_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabella GAME_QUESTION_OPTIONS (le opzioni di risposta)
CREATE TABLE IF NOT EXISTS game_question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES game_questions(id) ON DELETE CASCADE,
  text VARCHAR(255) NOT NULL,
  option_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabella GAME_BOTTLES (le bottiglie del gioco)
CREATE TABLE IF NOT EXISTS game_bottles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  producer VARCHAR(255),
  year VARCHAR(4),
  bottle_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabella GAME_BOTTLE_ANSWERS (le risposte corrette delle bottiglie)
CREATE TABLE IF NOT EXISTS game_bottle_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bottle_id UUID NOT NULL REFERENCES game_bottles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES game_questions(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES game_question_options(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDICI PER PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_games_created_by ON games(created_by);
CREATE INDEX IF NOT EXISTS idx_game_questions_game_id ON game_questions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_question_options_question_id ON game_question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_game_bottles_game_id ON game_bottles(game_id);
CREATE INDEX IF NOT EXISTS idx_game_bottle_answers_bottle_id ON game_bottle_answers(bottle_id);
CREATE INDEX IF NOT EXISTS idx_game_bottle_answers_question_id ON game_bottle_answers(question_id);

-- =====================================================
-- ROW LEVEL SECURITY (Protezione)
-- =====================================================

-- Abilita RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_bottles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_bottle_answers ENABLE ROW LEVEL SECURITY;

-- Policy: Chiunque può leggere i giochi pubblicati o i propri
CREATE POLICY "Games are readable by everyone"
  ON games FOR SELECT
  USING (status = 'published' OR created_by = auth.uid());

-- Policy: Solo il creatore può modificare i propri giochi
CREATE POLICY "Games are editable by creator"
  ON games FOR UPDATE
  USING (created_by = auth.uid());

-- Policy: Solo il creatore può eliminare i propri giochi
CREATE POLICY "Games are deletable by creator"
  ON games FOR DELETE
  USING (created_by = auth.uid());

-- Policy: Solo l'utente loggato può inserire giochi
CREATE POLICY "Games are creatable by auth users"
  ON games FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Questions readable if game is readable
CREATE POLICY "Questions readable if game is readable"
  ON game_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games WHERE games.id = game_id
      AND (games.status = 'published' OR games.created_by = auth.uid())
    )
  );

-- Options readable if game is readable
CREATE POLICY "Options readable if game is readable"
  ON game_question_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_questions
      JOIN games ON games.id = game_questions.game_id
      WHERE game_questions.id = question_id
      AND (games.status = 'published' OR games.created_by = auth.uid())
    )
  );

-- Bottles readable if game is readable
CREATE POLICY "Bottles readable if game is readable"
  ON game_bottles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games WHERE games.id = game_id
      AND (games.status = 'published' OR games.created_by = auth.uid())
    )
  );

-- Answers readable if game is readable
CREATE POLICY "Answers readable if game is readable"
  ON game_bottle_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_bottles
      JOIN games ON games.id = game_bottles.game_id
      WHERE game_bottles.id = bottle_id
      AND (games.status = 'published' OR games.created_by = auth.uid())
    )
  );

-- Creazione/modifica solo per il creatore del gioco
CREATE POLICY "Questions creatable by game creator"
  ON game_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games WHERE games.id = game_id AND games.created_by = auth.uid()
    )
  );

CREATE POLICY "Options creatable by game creator"
  ON game_question_options FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_questions
      JOIN games ON games.id = game_questions.game_id
      WHERE game_questions.id = question_id AND games.created_by = auth.uid()
    )
  );

CREATE POLICY "Bottles creatable by game creator"
  ON game_bottles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games WHERE games.id = game_id AND games.created_by = auth.uid()
    )
  );

CREATE POLICY "Answers creatable by game creator"
  ON game_bottle_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_bottles
      JOIN games ON games.id = game_bottles.game_id
      WHERE games.created_by = auth.uid()
    )
  );
