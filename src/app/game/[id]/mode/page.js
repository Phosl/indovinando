import {notFound, redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'

export default async function GameModePage({params}) {
  const supabase = await createServerSupabase()
  const resolvedParams = typeof params?.then === 'function' ? await params : params
  const gameId = resolvedParams?.id

  if (!gameId) notFound()

  const {data: game, error: gameError} = await supabase
    .from('games')
    .select('id, name, status, created_by')
    .eq('id', gameId)
    .single()

  if (gameError || !game) {
    notFound()
  }

  const {
    data: {user},
  } = await supabase.auth.getUser()

  const isOwner = user?.id === game.created_by

  if (game.status !== 'published' && !isOwner) {
    redirect('/auth')
  }

  const [{count: questionsCount}, {count: bottlesCount}] = await Promise.all([
    supabase.from('game_questions').select('id', {count: 'exact', head: true}).eq('game_id', gameId),
    supabase.from('game_bottles').select('id', {count: 'exact', head: true}).eq('game_id', gameId),
  ])

  if (!questionsCount || !bottlesCount) {
    redirect(`/game/${gameId}`)
  }

  redirect(`/game/${gameId}/table-live`)
}
