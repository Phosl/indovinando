import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getLocaleText} from '@/lib/i18n/getLocaleText'
import {getServerLanguage} from '@/lib/i18n/server'
import LeaderboardClient from './LeaderboardClient'

export async function generateMetadata() {
  const lang = await getServerLanguage()
  return {
    title: lang === 'en' ? 'Final Leaderboard' : 'Classifica finale',
  }
}

export default async function LeaderboardPage({params}) {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const pageText = getLocaleText(lang, 'gamePlayPage', {})
  const resolvedParams = await Promise.resolve(params)
  const sessionId = resolvedParams.sessionId
  const {
    data: {user},
  } = await supabase.auth.getUser()
  let isHostUser = false

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

  if (user?.id) {
    const {data: me} = await supabase
      .from('live_players')
      .select('is_host')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle()
    isHostUser = Boolean(me?.is_host)
  }

  return (
    <LeaderboardClient
      sessionId={sessionId}
      gameName={session.games?.name || pageText.gameFallback}
      players={players || []}
      isAuthenticated={Boolean(user)}
      isHostUser={isHostUser}
    />
  )
}
