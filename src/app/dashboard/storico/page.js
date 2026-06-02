import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import TopBarBack from '@/components/TopBarBack'
import StoricoClient from './StoricoClient'
import styles from './storico.module.scss'
import it from '@/lib/i18n/locales/it.json'
import en from '@/lib/i18n/locales/en.json'

export const metadata = {title: 'Storico Partite'}

export default async function StoricoPage() {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const locale = lang === 'en' ? en : it
  const t = locale.dashboard?.storico || it.dashboard.storico

  const {
    data: {user},
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const {data: liveSessions} = await supabase
    .from('live_session_results')
    .select('id, game_name, played_at, player_count, players')
    .eq('host_user_id', user.id)
    .order('played_at', {ascending: false})
    .limit(100)

  const avatarFromNickname = (nickname = '') => {
    let hash = 0
    for (let i = 0; i < nickname.length; i += 1) {
      hash = (hash * 31 + nickname.charCodeAt(i)) >>> 0
    }
    return (hash % 10) + 1
  }

  const {data: hostedEvents} = await supabase
    .from('table_live_events')
    .select('id, game_id')
    .eq('created_by', user.id)
    .limit(250)

  const eventIds = (hostedEvents || []).map((event) => event.id)
  const eventById = new Map((hostedEvents || []).map((event) => [event.id, event]))

  const {data: tableSessions} = eventIds.length
    ? await supabase
        .from('table_live_sessions')
        .select('id, event_id, status, created_at, updated_at')
        .in('event_id', eventIds)
        .eq('status', 'finished')
        .order('updated_at', {ascending: false})
        .limit(250)
    : {data: []}

  const tableSessionIds = (tableSessions || []).map((session) => session.id)

  const {data: tableResults} = tableSessionIds.length
    ? await supabase
        .from('table_live_event_results')
        .select('session_id, player_id, score, rank_in_session, captured_at')
        .in('session_id', tableSessionIds)
    : {data: []}

  const playerIds = Array.from(
    new Set((tableResults || []).map((row) => row.player_id).filter(Boolean)),
  )
  const {data: tablePlayers} = playerIds.length
    ? await supabase.from('table_live_players').select('id, nickname').in('id', playerIds)
    : {data: []}

  const gameIds = Array.from(
    new Set((hostedEvents || []).map((event) => event.game_id).filter(Boolean)),
  )
  const {data: games} = gameIds.length
    ? await supabase.from('games').select('id, name').in('id', gameIds)
    : {data: []}

  const playerById = new Map((tablePlayers || []).map((player) => [player.id, player]))
  const gameNameById = new Map((games || []).map((game) => [game.id, game.name]))

  const rowsBySession = new Map()
  for (const row of tableResults || []) {
    if (!rowsBySession.has(row.session_id)) rowsBySession.set(row.session_id, [])
    rowsBySession.get(row.session_id).push(row)
  }

  const tableMappedSessions = (tableSessions || []).map((session) => {
    const rows = [...(rowsBySession.get(session.id) || [])].sort((a, b) => {
      const rankA = Number.isFinite(a.rank_in_session) ? a.rank_in_session : Number.MAX_SAFE_INTEGER
      const rankB = Number.isFinite(b.rank_in_session) ? b.rank_in_session : Number.MAX_SAFE_INTEGER
      if (rankA !== rankB) return rankA - rankB
      return Number(b.score || 0) - Number(a.score || 0)
    })

    const players = rows.map((row) => {
      const player = playerById.get(row.player_id)
      const nickname = player?.nickname || 'Giocatore'
      return {
        id: row.player_id,
        nickname,
        total_score: Number(row.score || 0),
        avatar_id: avatarFromNickname(nickname),
      }
    })

    const event = eventById.get(session.event_id)
    return {
      id: `table-${session.id}`,
      game_name: gameNameById.get(event?.game_id) || 'Partita Tavolo',
      played_at:
        rows.reduce((latest, row) => {
          const ts = new Date(row.captured_at || 0).getTime()
          return ts > latest ? ts : latest
        }, 0) || new Date(session.updated_at || session.created_at || 0).getTime(),
      player_count: players.length,
      players,
    }
  })

  const sessions = [...(liveSessions || []), ...tableMappedSessions]
    .sort((a, b) => new Date(b.played_at || 0).getTime() - new Date(a.played_at || 0).getTime())
    .slice(0, 100)

  return (
    <main className={styles.page}>
      <TopBarBack title={t.title} href="/dashboard" />
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.subtitle}>{t.subtitle}</p>
        </div>
        <StoricoClient sessions={sessions} t={t} lang={lang} />
      </div>
    </main>
  )
}
