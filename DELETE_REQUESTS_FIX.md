# DELETE Requests 400 Bad Request - FIX

## Problem Analysis

When editing a published game and clicking "Pubblica Gioco" (Publish Game), DELETE requests returned
**400 Bad Request** for:

- `DELETE /rest/v1/game_bottle_answers?game_id=eq.{gameId}`
- `DELETE /rest/v1/game_question_options?game_id=eq.{gameId}`

## Root Cause

**Missing RLS (Row-Level Security) DELETE policies** on these tables:

- `game_questions`
- `game_question_options`
- `game_bottles`
- `game_bottle_answers`

The `publishGame()` function in [GameEditor/index.jsx](GameEditor/index.jsx) executes delete
operations on edit (lines 393-398), but Supabase RLS prevented them because no DELETE policies
existed for the game creator.

## Solution

Added 4 DELETE policies to allow the game creator to delete game content during edits:

1. **Questions deletable by game creator** - Allows DELETE on `game_questions` if user owns the game
2. **Options deletable by game creator** - Allows DELETE on `game_question_options` if user owns the
   game
3. **Bottles deletable by game creator** - Allows DELETE on `game_bottles` if user owns the game
4. **Answers deletable by game creator** - Allows DELETE on `game_bottle_answers` if user owns the
   game

All policies follow the pattern:

```sql
CREATE POLICY "X deletable by game creator"
  ON table FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_id -- direct or indirect reference
      AND games.created_by = auth.uid()  -- user must be the game creator
    )
  )
```

## Implementation

### Option 1: Quick Fix (Immediate)

1. Go to Supabase dashboard → SQL Editor
2. Open file: [RLS_DELETE_POLICIES_PATCH.sql](RLS_DELETE_POLICIES_PATCH.sql)
3. Copy-paste entire contents into SQL Editor
4. Click "Run" ✓

### Option 2: Full Database Reset (If Starting Fresh)

1. Go to Supabase dashboard → SQL Editor
2. Open file: [DATABASE_SETUP.sql](DATABASE_SETUP.sql) (now includes DELETE policies)
3. Copy-paste entire contents into SQL Editor
4. Click "Run" ✓

## Testing

After applying the patch:

1. Navigate to an existing published game
2. Click "Modifica" (Edit)
3. Make changes to the game
4. Click "Pubblica Gioco" (Publish)
5. ✅ Should save without 400 errors

## Performance Note

Click handler latency (1300-2300ms) is now explained by:

- 4 sequential DELETE queries (~300-400ms each = 1200-1600ms total)
- 4-5 sequential INSERT queries (~300-500ms total)
- This is acceptable for edit operations and will resolve once policies are applied

## Files Updated

✅ [DATABASE_SETUP.sql](DATABASE_SETUP.sql) - Added DELETE policies at end ✅
[RLS_DELETE_POLICIES_PATCH.sql](RLS_DELETE_POLICIES_PATCH.sql) - Created for direct patching
