'use server'

import {createServerSupabase} from '@/lib/supabaseServer'
import {createAdminSupabase} from '@/lib/supabaseAdmin'

export async function toggleGameStatus(gameId, nextStatus) {
  if (!gameId || !nextStatus) return

  const supabase = await createServerSupabase()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase
    .from('games')
    .update({status: nextStatus})
    .eq('id', gameId)
    .eq('created_by', user.id)

  redirect(`/game/${gameId}`)
}

export async function deleteGame(gameId) {
  if (!gameId) {
    return {ok: false, error: 'Missing game id'}
  }

  const supabase = await createServerSupabase()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    return {ok: false, error: 'Not authenticated'}
  }

  const {data: ownedGame, error: ownershipError} = await supabase
    .from('games')
    .select('id')
    .eq('id', gameId)
    .eq('created_by', user.id)
    .maybeSingle()

  if (ownershipError) {
    return {ok: false, error: ownershipError.message}
  }

  if (!ownedGame) {
    return {ok: false, error: 'Game not found or not owned by user'}
  }

  let db = supabase
  try {
    db = createAdminSupabase()
  } catch {
    db = supabase
  }

  const {error: deleteSessionsError} = await db
    .from('table_live_sessions')
    .delete()
    .eq('game_id', gameId)

  if (deleteSessionsError) {
    return {ok: false, error: deleteSessionsError.message}
  }

  const {error: deleteEventsError} = await db.from('table_live_events').delete().eq('game_id', gameId)

  if (deleteEventsError) {
    return {ok: false, error: deleteEventsError.message}
  }

  const {error: deleteGameError, count} = await db
    .from('games')
    .delete({count: 'exact'})
    .eq('id', gameId)
    .eq('created_by', user.id)

  if (deleteGameError) {
    return {ok: false, error: deleteGameError.message}
  }

  if (!count) {
    return {ok: false, error: 'Game not found or not owned by user'}
  }

  return {ok: true}
}
