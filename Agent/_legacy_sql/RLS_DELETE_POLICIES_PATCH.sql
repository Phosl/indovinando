-- =====================================================
-- RLS DELETE POLICIES PATCH
-- =====================================================
-- Run this in Supabase SQL Editor to fix game edit/publish
-- These policies allow the game creator to delete questions,
-- options, bottles, and answers when editing a game
-- =====================================================

CREATE POLICY "Questions deletable by game creator"
  ON game_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM games WHERE games.id = game_id AND games.created_by = auth.uid()
    )
  );

CREATE POLICY "Options deletable by game creator"
  ON game_question_options FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM game_questions
      JOIN games ON games.id = game_questions.game_id
      WHERE game_questions.id = question_id AND games.created_by = auth.uid()
    )
  );

CREATE POLICY "Bottles deletable by game creator"
  ON game_bottles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM games WHERE games.id = game_id AND games.created_by = auth.uid()
    )
  );

CREATE POLICY "Answers deletable by game creator"
  ON game_bottle_answers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM game_bottles
      JOIN games ON games.id = game_bottles.game_id
      WHERE games.created_by = auth.uid()
    )
  );
