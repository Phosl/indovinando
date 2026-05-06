import {createServerSupabase} from '@/lib/supabaseServer'
import PlayerJoinClient from './PlayerJoinClient'

export const metadata = {
  title: 'Accedi al Gioco',
}

export default async function PlayerJoinPage({params}) {
  const supabase = await createServerSupabase()
  const resolvedParams = await Promise.resolve(params)
  const sessionId = resolvedParams.sessionId

  const {data: session} = await supabase
    .from('live_sessions')
    .select(
      `
      id,
      status,
      game_id,
      games(name),
      host_user_id
    `,
    )
    .eq('id', sessionId)
    .maybeSingle()

  // Load existing players per mostrare gli avatar scelti
  const {data: players} = await supabase
    .from('live_players')
    .select('nickname, avatar_id')
    .eq('session_id', sessionId)
    .order('joined_at')

  const {
    data: {user},
  } = await supabase.auth.getUser()

  return (
    <PlayerJoinClient
      sessionId={sessionId}
      gameName={session?.games?.name || 'Gioco'}
      existingPlayers={players || []}
      userId={user?.id || null}
    />
  )
}
