-- Add max_score column to wine_course_progress
-- Run this ONCE in Supabase SQL Editor

ALTER TABLE wine_course_progress
  ADD COLUMN IF NOT EXISTS max_score integer NOT NULL DEFAULT 0;

-- Add player_level column to profiles (1-6, matches PLAYER_LEVELS)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS player_level integer NOT NULL DEFAULT 1;
