import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import LeaderboardClient from './LeaderboardClient'

export const metadata = {
  title: 'Leaderboard Finale',
}

export default async function LeaderboardPage({params}) {
  const supabase = await createServerSupabase()
  const resolvedParams = await Promise.resolve(params)
  const sessionId = resolvedParams.sessionId

  // Load session
  const {data: session, error: sessionError} = await supabase
    .from('live_sessions')
    .select('id, game_id, status, games(name)')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    redirect('/dashboard')
  }

  if (session.status !== 'finished') {
    redirect(`/live/session/${sessionId}/play`)
  }

  // Load all players sorted by score
  const {data: players} = await supabase
    .from('live_players')
    .select('id, nickname, avatar_id, total_score')
    .eq('session_id', sessionId)
    .order('total_score', {ascending: false})

  return (
    <LeaderboardClient
      sessionId={sessionId}
      gameName={session.games?.name || 'Gioco'}
      players={players || []}
    />
  )
}
