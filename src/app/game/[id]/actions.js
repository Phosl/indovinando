'use server'

import {redirect} from 'next/navigation'
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
  if (!gameId) return

  const supabase = await createServerSupabase()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase.from('games').delete().eq('id', gameId).eq('created_by', user.id)

  redirect('/miei-giochi')
}
