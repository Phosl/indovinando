-- Wine Course Progress Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS wine_course_progress (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id    text        NOT NULL,
  lesson_id   text        NOT NULL,
  completed   boolean     NOT NULL DEFAULT false,
  score       integer     NOT NULL DEFAULT 0,
  attempts    integer     NOT NULL DEFAULT 0,
  completed_at timestamptz,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, level_id, lesson_id)
);

-- RLS
ALTER TABLE wine_course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own progress"
  ON wine_course_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own progress"
  ON wine_course_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own progress"
  ON wine_course_progress FOR UPDATE
  USING (auth.uid() = user_id);
