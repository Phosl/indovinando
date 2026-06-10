'use server'

import {createServerSupabase} from '@/lib/supabaseServer'

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

  const {error: deleteEventsError} = await supabase
    .from('table_live_events')
    .delete()
    .eq('game_id', gameId)
    .eq('created_by', user.id)

  if (deleteEventsError) {
    return {ok: false, error: deleteEventsError.message}
  }

  const {error: deleteGameError, count} = await supabase
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
