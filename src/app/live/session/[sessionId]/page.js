import {createServerSupabase} from '@/lib/supabaseServer'
import {getLocaleText} from '@/lib/i18n/getLocaleText'
import {getServerLanguage} from '@/lib/i18n/server'
import PlayerJoinClient from './PlayerJoinClient'

export async function generateMetadata() {
  const lang = await getServerLanguage()
  return {
    title: lang === 'en' ? 'Join the Game' : 'Entra nella partita',
  }
}

export default async function PlayerJoinPage({params}) {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const pageText = getLocaleText(lang, 'gamePlayPage', {})
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

  const {data: tableLiveSession} = await supabase
    .from('table_live_sessions')
    .select('join_code')
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
      gameName={session?.games?.name || pageText.gameFallback}
      existingPlayers={players || []}
      userId={user?.id || null}
      tableJoinCode={tableLiveSession?.join_code || ''}
    />
  )
}
