-- ============================================================
-- ENOTECA MODE — Async Solo Tasting Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Tasting menus (created by authenticated users / hosts)
CREATE TABLE IF NOT EXISTS enoteca_menus (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bottles in a menu
CREATE TABLE IF NOT EXISTS enoteca_bottles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id      UUID NOT NULL REFERENCES enoteca_menus ON DELETE CASCADE,
  -- Revealed info (shown AFTER player answers all questions for this bottle)
  name         TEXT NOT NULL,
  producer     TEXT,
  year         INTEGER,
  region       TEXT,
  varietal     TEXT,
  description  TEXT,
  bottle_order INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Questions for each bottle
CREATE TABLE IF NOT EXISTS enoteca_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bottle_id      UUID NOT NULL REFERENCES enoteca_bottles ON DELETE CASCADE,
  text           TEXT NOT NULL,
  question_order INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Answer options for each question
CREATE TABLE IF NOT EXISTS enoteca_options (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id    UUID NOT NULL REFERENCES enoteca_questions ON DELETE CASCADE,
  text           TEXT NOT NULL,
  is_correct     BOOLEAN NOT NULL DEFAULT FALSE,
  option_order   INTEGER NOT NULL DEFAULT 0
);

-- 5. Anonymous tasting sessions (one per player per visit)
CREATE TABLE IF NOT EXISTS enoteca_tasting_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id              UUID NOT NULL REFERENCES enoteca_menus ON DELETE CASCADE,
  nickname             TEXT NOT NULL,
  table_name           TEXT,
  current_bottle_index INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress' | 'completed'
  total_score          INTEGER NOT NULL DEFAULT 0,
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Player answers (one per question per session)
CREATE TABLE IF NOT EXISTS enoteca_answers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tasting_session_id  UUID NOT NULL REFERENCES enoteca_tasting_sessions ON DELETE CASCADE,
  question_id         UUID NOT NULL REFERENCES enoteca_questions ON DELETE CASCADE,
  selected_option_id  UUID REFERENCES enoteca_options,
  is_correct          BOOLEAN,
  points              INTEGER NOT NULL DEFAULT 0,
  answered_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tasting_session_id, question_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE enoteca_menus            ENABLE ROW LEVEL SECURITY;
ALTER TABLE enoteca_bottles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE enoteca_questions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE enoteca_options          ENABLE ROW LEVEL SECURITY;
ALTER TABLE enoteca_tasting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enoteca_answers          ENABLE ROW LEVEL SECURITY;

-- enoteca_menus: owner can do anything; anyone can read published menus
CREATE POLICY "owner manage menus"      ON enoteca_menus FOR ALL            USING (auth.uid() = user_id);
CREATE POLICY "public read published"   ON enoteca_menus FOR SELECT         USING (is_published = TRUE);

-- Bottles, questions, options: readable if menu is published or user owns the menu
CREATE POLICY "public read bottles"     ON enoteca_bottles    FOR SELECT    USING (EXISTS (SELECT 1 FROM enoteca_menus m WHERE m.id = menu_id AND (m.is_published OR m.user_id = auth.uid())));
CREATE POLICY "owner manage bottles"    ON enoteca_bottles    FOR ALL       USING (EXISTS (SELECT 1 FROM enoteca_menus m WHERE m.id = menu_id AND m.user_id = auth.uid()));

CREATE POLICY "public read questions"   ON enoteca_questions  FOR SELECT    USING (EXISTS (SELECT 1 FROM enoteca_bottles b JOIN enoteca_menus m ON m.id = b.menu_id WHERE b.id = bottle_id AND (m.is_published OR m.user_id = auth.uid())));
CREATE POLICY "owner manage questions"  ON enoteca_questions  FOR ALL       USING (EXISTS (SELECT 1 FROM enoteca_bottles b JOIN enoteca_menus m ON m.id = b.menu_id WHERE b.id = bottle_id AND m.user_id = auth.uid()));

CREATE POLICY "public read options"     ON enoteca_options    FOR SELECT    USING (EXISTS (SELECT 1 FROM enoteca_questions q JOIN enoteca_bottles b ON b.id = q.bottle_id JOIN enoteca_menus m ON m.id = b.menu_id WHERE q.id = question_id AND (m.is_published OR m.user_id = auth.uid())));
CREATE POLICY "owner manage options"    ON enoteca_options    FOR ALL       USING (EXISTS (SELECT 1 FROM enoteca_questions q JOIN enoteca_bottles b ON b.id = q.bottle_id JOIN enoteca_menus m ON m.id = b.menu_id WHERE q.id = question_id AND m.user_id = auth.uid()));

-- Tasting sessions: only the session owner (via anon key; no auth.uid) can read/write
-- We allow anon INSERT and then SELECT/UPDATE by ID (handled in app via session ID)
CREATE POLICY "anon insert session"     ON enoteca_tasting_sessions FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "anon read own session"   ON enoteca_tasting_sessions FOR SELECT USING (TRUE);
CREATE POLICY "anon update own session" ON enoteca_tasting_sessions FOR UPDATE USING (TRUE);
-- Host can read all sessions for their menus
CREATE POLICY "owner read all sessions" ON enoteca_tasting_sessions FOR SELECT USING (EXISTS (SELECT 1 FROM enoteca_menus m WHERE m.id = menu_id AND m.user_id = auth.uid()));

-- Answers: anon insert/update/select
CREATE POLICY "anon manage answers"     ON enoteca_answers FOR ALL USING (TRUE);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_enoteca_bottles_menu      ON enoteca_bottles(menu_id, bottle_order);
CREATE INDEX IF NOT EXISTS idx_enoteca_questions_bottle  ON enoteca_questions(bottle_id, question_order);
CREATE INDEX IF NOT EXISTS idx_enoteca_options_question  ON enoteca_options(question_id, option_order);
CREATE INDEX IF NOT EXISTS idx_enoteca_sessions_menu     ON enoteca_tasting_sessions(menu_id);
CREATE INDEX IF NOT EXISTS idx_enoteca_answers_session   ON enoteca_answers(tasting_session_id);
