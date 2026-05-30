import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import TableLiveLeaderboardClient from './TableLiveLeaderboardClient'

export const metadata = {
  title: 'Classifica Tavolo',
}

export default async function TableLiveLeaderboardPage({params}) {
  const supabase = await createServerSupabase()
  const resolvedParams = await Promise.resolve(params)
  const sessionId = resolvedParams.sessionId

  const {
    data: {user},
  } = await supabase.auth.getUser()

  const {data: session} = await supabase
    .from('table_live_sessions')
    .select('id, status, game_id, games(name)')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) {
    redirect('/')
  }

  const {data: players} = await supabase
    .from('table_live_players')
    .select('id, nickname, total_score, joined_at')
    .eq('session_id', sessionId)
    .order('total_score', {ascending: false})
    .order('joined_at', {ascending: true})

  let isHostUser = false
  if (user?.id) {
    const {data: myPlayer} = await supabase
      .from('table_live_players')
      .select('id, joined_at')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('joined_at', {ascending: true})
      .limit(1)
      .maybeSingle()

    const host = [...(players || [])]
      .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
      .at(0)
    isHostUser = Boolean(host?.id && myPlayer?.id && host.id === myPlayer.id)
  }

  return (
    <TableLiveLeaderboardClient
      sessionId={sessionId}
      gameName={session.games?.name || 'Gioco'}
      players={players || []}
      isAuthenticated={Boolean(user)}
      isHostUser={isHostUser}
    />
  )
}

