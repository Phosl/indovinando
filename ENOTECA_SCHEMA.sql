-- ============================================================
-- ENOTECA MODE — DB Cleanup & Minimal Schema
-- 
-- Le tabelle enoteca_menus/bottles/questions/options erano
-- ridondanti con games/game_bottles/game_questions/game_question_options.
-- Droppa le 4 ridondanti, ricrea solo le 2 necessarie.
-- ============================================================

-- 1. Drop CASCADE (rimuove anche foreign keys dipendenti)
DROP TABLE IF EXISTS enoteca_answers          CASCADE;
DROP TABLE IF EXISTS enoteca_tasting_sessions CASCADE;
DROP TABLE IF EXISTS enoteca_options          CASCADE;
DROP TABLE IF EXISTS enoteca_questions        CASCADE;
DROP TABLE IF EXISTS enoteca_bottles          CASCADE;
DROP TABLE IF EXISTS enoteca_menus            CASCADE;

-- 2. Sessioni di degustazione anonima
CREATE TABLE IF NOT EXISTS enoteca_tasting_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id              UUID NOT NULL REFERENCES games ON DELETE CASCADE,
  nickname             TEXT NOT NULL,
  table_name           TEXT,
  current_bottle_index INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'in_progress',
  total_score          INTEGER NOT NULL DEFAULT 0,
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Risposte player (UNIQUE per sessione + bottiglia + domanda)
CREATE TABLE IF NOT EXISTS enoteca_answers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tasting_session_id  UUID NOT NULL REFERENCES enoteca_tasting_sessions ON DELETE CASCADE,
  bottle_id           UUID NOT NULL REFERENCES game_bottles ON DELETE CASCADE,
  question_id         UUID NOT NULL REFERENCES game_questions ON DELETE CASCADE,
  selected_option_id  UUID REFERENCES game_question_options,
  is_correct          BOOLEAN,
  points              INTEGER NOT NULL DEFAULT 0,
  answered_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tasting_session_id, bottle_id, question_id)
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE enoteca_tasting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enoteca_answers          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon insert session" ON enoteca_tasting_sessions FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "anon read session"   ON enoteca_tasting_sessions FOR SELECT USING (TRUE);
CREATE POLICY "anon update session" ON enoteca_tasting_sessions FOR UPDATE USING (TRUE);
CREATE POLICY "anon manage answers" ON enoteca_answers FOR ALL USING (TRUE);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_enoteca_sessions_game   ON enoteca_tasting_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_enoteca_answers_session ON enoteca_answers(tasting_session_id);
CREATE INDEX IF NOT EXISTS idx_enoteca_answers_bottle  ON enoteca_answers(bottle_id);
