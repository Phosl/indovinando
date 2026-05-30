import {createServerSupabase} from '@/lib/supabaseServer'
import {createClient} from '@supabase/supabase-js'
import TableLiveLeaderboardClient from './TableLiveLeaderboardClient'

export const metadata = {
  title: 'Classifica Tavolo',
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function createReadClient(fallback) {
  if (SUPABASE_URL && SERVICE_ROLE_KEY) {
    return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {persistSession: false, autoRefreshToken: false},
    })
  }
  return fallback
}

export default async function TableLiveLeaderboardPage({params}) {
  const supabase = await createServerSupabase()
  const db = createReadClient(supabase)
  const resolvedParams = await Promise.resolve(params)
  const sessionId = resolvedParams.sessionId

  const {
    data: {user},
  } = await supabase.auth.getUser()

  const {data: session} = await db
    .from('table_live_sessions')
    .select('id, status, game_id, games(name)')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) {
    return (
      <TableLiveLeaderboardClient
        sessionId={sessionId}
        gameName="Partita non trovata"
        players={[]}
        isAuthenticated={Boolean(user)}
        isHostUser={false}
      />
    )
  }

  const {data: players} = await db
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
