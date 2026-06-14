import {notFound, redirect} from 'next/navigation'
import Link from 'next/link'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getGameAvatarOptions} from '@/lib/gameAvatarOptions'
import {getLocaleText} from '@/lib/i18n/getLocaleText'
import {getServerLanguage} from '@/lib/i18n/server'
import GamePlayPageClient from './GamePlayPageClient'
import {deleteGame} from './actions'
import styles from './GamePlayPage.module.scss'

export default async function GamePlayPage({params}) {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const pageText = getLocaleText(lang, 'gamePlayPage', {})
  const resolvedParams = typeof params?.then === 'function' ? await params : params
  const gameId = resolvedParams?.id

  if (!gameId) notFound()

  const {data: game, error: gameError} = await supabase
    .from('games')
    .select('id, name, status, created_by, cover_index, created_at')
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

  const {data: rawQuestions, error: questionsError} = await supabase
    .from('game_questions')
    .select('id, text, kind, is_neutral, display_order, game_question_options(id, text, option_order)')
    .eq('game_id', gameId)
    .order('display_order', {ascending: true})

  const {data: rawBottles, error: bottlesError} = await supabase
    .from('game_bottles')
    .select(
      'id, name, producer, year, wine_type, bottle_order, game_bottle_answers(question_id, option_id)',
    )
    .eq('game_id', gameId)
    .order('bottle_order', {ascending: true})

  const {data: historySessions} = isOwner
    ? await supabase
        .from('live_session_results')
        .select('id, game_name, played_at, player_count, players')
        .eq('host_user_id', user.id)
        .eq('game_id', game.id)
        .order('played_at', {ascending: false})
        .limit(100)
    : {data: []}

  const {data: enotecaHistory} = isOwner
    ? await supabase
        .from('enoteca_tasting_sessions')
        .select('id, nickname, table_name, total_score, completed_at')
        .eq('game_id', game.id)
        .eq('status', 'completed')
        .order('completed_at', {ascending: false})
        .limit(100)
    : {data: []}

  const {data: hostedTableEvents} = isOwner
    ? await supabase
        .from('table_live_events')
        .select('id, game_id')
        .eq('created_by', user.id)
        .eq('game_id', game.id)
        .limit(250)
    : {data: []}

  const tableEventIds = (hostedTableEvents || []).map((event) => event.id)
  const {data: tableSessions} =
    isOwner && tableEventIds.length
      ? await supabase
          .from('table_live_sessions')
          .select('id, event_id, status, created_at, updated_at')
          .in('event_id', tableEventIds)
          .eq('status', 'finished')
          .order('updated_at', {ascending: false})
          .limit(250)
      : {data: []}

  const tableSessionIds = (tableSessions || []).map((session) => session.id)
  const {data: tableResults} =
    isOwner && tableSessionIds.length
      ? await supabase
          .from('table_live_event_results')
          .select('session_id, player_id, score, rank_in_session, captured_at')
          .in('session_id', tableSessionIds)
      : {data: []}

  const tablePlayerIds = Array.from(
    new Set((tableResults || []).map((row) => row.player_id).filter(Boolean)),
  )
  const {data: tablePlayers} =
    isOwner && tablePlayerIds.length
      ? await supabase.from('table_live_players').select('id, nickname').in('id', tablePlayerIds)
      : {data: []}
  const avatarOptions = await getGameAvatarOptions()

  if (questionsError || bottlesError) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.emptyCard}>
            <h1 className={styles.emptyTitle}>{pageText.loadErrorTitle}</h1>
            <p className={styles.emptyText}>{questionsError?.message || bottlesError?.message}</p>
            <div className={styles.emptyActions}>
              <Link href="/miei-giochi" className="btn neutral btn-small">
                {pageText.backToGames}
              </Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  const questions = (rawQuestions || []).map((q) => ({
    id: q.id,
    text: q.text,
    kind: q.kind || null,
    isNeutral: q.is_neutral === true,
    options: [...(q.game_question_options || [])].sort((a, b) => a.option_order - b.option_order),
  }))

  const bottles = (rawBottles || []).map((b) => ({
    id: b.id,
    name: b.name,
    producer: b.producer,
    year: b.year,
    wineType: b.wine_type || '',
    answers: b.game_bottle_answers || [],
  }))

  const avatarFromNickname = (nickname = '') => {
    let hash = 0
    for (let i = 0; i < nickname.length; i += 1) {
      hash = (hash * 31 + nickname.charCodeAt(i)) >>> 0
    }
    return (hash % 10) + 1
  }

  const normalizedLiveHistory = (historySessions || []).map((session) => ({
    ...session,
    mode: 'live',
    modeLabel: 'Live',
  }))

  const normalizedEnotecaHistory = (enotecaHistory || []).map((session) => ({
    id: `enoteca-${session.id}`,
    game_name: game.name,
    played_at: session.completed_at,
    player_count: 1,
    mode: 'enoteca',
    modeLabel: 'Enoteca',
    players: [
      {
        id: session.id,
        nickname: session.nickname || (lang === 'en' ? 'Player' : 'Giocatore'),
        avatar_id: avatarFromNickname(session.nickname || ''),
        total_score: Number(session.total_score || 0),
      },
    ],
  }))

  const tablePlayersById = new Map((tablePlayers || []).map((player) => [player.id, player]))
  const tableRowsBySession = new Map()
  for (const row of tableResults || []) {
    if (!tableRowsBySession.has(row.session_id)) tableRowsBySession.set(row.session_id, [])
    tableRowsBySession.get(row.session_id).push(row)
  }

  const normalizedTableHistory = (tableSessions || []).map((session) => {
    const rows = [...(tableRowsBySession.get(session.id) || [])].sort((a, b) => {
      const rankA = Number.isFinite(a.rank_in_session) ? a.rank_in_session : Number.MAX_SAFE_INTEGER
      const rankB = Number.isFinite(b.rank_in_session) ? b.rank_in_session : Number.MAX_SAFE_INTEGER
      if (rankA !== rankB) return rankA - rankB
      return Number(b.score || 0) - Number(a.score || 0)
    })

    return {
      id: `table-${session.id}`,
      game_name: game.name,
      played_at:
        rows.reduce((latest, row) => {
          const ts = new Date(row.captured_at || 0).getTime()
          return ts > latest ? ts : latest
        }, 0) || session.updated_at || session.created_at || null,
      player_count: rows.length,
      mode: 'table-live',
      modeLabel: lang === 'en' ? 'Table' : 'Tavolo',
      players: rows.map((row) => {
        const player = tablePlayersById.get(row.player_id)
        const nickname = player?.nickname || (lang === 'en' ? 'Player' : 'Giocatore')
        return {
          id: row.player_id,
          nickname,
          avatar_id: avatarFromNickname(nickname),
          total_score: Number(row.score || 0),
        }
      }),
    }
  })

  const mergedHistorySessions = [
    ...normalizedLiveHistory,
    ...normalizedTableHistory,
    ...normalizedEnotecaHistory,
  ]
    .filter((session) => session.played_at)
    .sort((a, b) => new Date(b.played_at || 0).getTime() - new Date(a.played_at || 0).getTime())
    .slice(0, 100)

  return (
    <GamePlayPageClient
      game={game}
      questions={questions}
      bottles={bottles}
      historySessions={mergedHistorySessions}
      avatarOptions={avatarOptions}
      isOwner={isOwner}
      onDelete={deleteGame}
    />
  )
}
