import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {profileAvatarToGameId} from '@/lib/avatarUtils'
import {getGameAvatarOptions} from '@/lib/gameAvatarOptions'
import it from '@/lib/i18n/locales/it.json'
import en from '@/lib/i18n/locales/en.json'
import PartiteClient from './PartiteClient'

export const metadata = {
  title: 'Le mie partite',
}

export default async function ProfileMatchesPage() {
  const supabase = await createServerSupabase()
  const [lang, authResult] = await Promise.all([getServerLanguage(), supabase.auth.getUser()])
  const locale = lang === 'en' ? en : it
  const t = locale.profile || it.profile

  const {
    data: {user},
  } = authResult

  if (!user) redirect('/auth?next=/profilo/partite')

  const [profileResult, gameAvatarOptions] = await Promise.all([
    supabase.from('profiles').select('username, avatar_emoji').eq('id', user.id).single(),
    getGameAvatarOptions(),
  ])

  const profile = profileResult.data

  const profileName = String(profile?.username || '').trim()
  const myAvatarId = profileAvatarToGameId(profile?.avatar_emoji || '')

  const loadEnotecaSessions = async () => {
    const byUser = await supabase
      .from('enoteca_tasting_sessions')
      .select('id, game_id, nickname, total_score, status, completed_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', {ascending: false})
      .limit(250)

    if (!byUser.error) return byUser.data || []

    if (profileName) {
      const byNickname = await supabase
        .from('enoteca_tasting_sessions')
        .select('id, game_id, nickname, total_score, status, completed_at')
        .eq('nickname', profileName)
        .eq('status', 'completed')
        .order('completed_at', {ascending: false})
        .limit(250)
      return byNickname.data || []
    }

    return []
  }

  const [liveMineResult, allLiveScoresResult, enotecaRows] = await Promise.all([
    supabase
      .from('live_players')
      .select('id, session_id, user_id, nickname, avatar_id, total_score, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', {ascending: false})
      .limit(250),
    supabase.from('live_players').select('user_id, total_score').not('user_id', 'is', null).limit(50000),
    loadEnotecaSessions(),
  ])

  const myLiveRows = liveMineResult.data || []
  const sessionIds = Array.from(new Set(myLiveRows.map((row) => row.session_id).filter(Boolean)))

  const [liveSessionsResult, liveSessionPlayersResult] = await Promise.all([
    sessionIds.length
      ? supabase.from('live_sessions').select('id, game_id, created_at').in('id', sessionIds)
      : Promise.resolve({data: []}),
    sessionIds.length
      ? supabase
          .from('live_players')
          .select('id, session_id, user_id, nickname, avatar_id, total_score, updated_at')
          .in('session_id', sessionIds)
      : Promise.resolve({data: []}),
  ])

  const liveSessions = liveSessionsResult.data || []
  const livePlayers = liveSessionPlayersResult.data || []
  const sessionsById = new Map(liveSessions.map((row) => [row.id, row]))

  const gameIdsLive = Array.from(new Set(liveSessions.map((row) => row.game_id).filter(Boolean)))
  const gameIdsEnoteca = Array.from(
    new Set((enotecaRows || []).map((row) => row.game_id).filter(Boolean)),
  )
  const allGameIds = Array.from(new Set([...gameIdsLive, ...gameIdsEnoteca]))
  const gamesResult = allGameIds.length
    ? await supabase.from('games').select('id, name, cover_index').in('id', allGameIds)
    : {data: []}
  const gamesById = new Map((gamesResult.data || []).map((row) => [row.id, row]))

  const playersBySession = new Map()
  for (const player of livePlayers) {
    if (!playersBySession.has(player.session_id)) playersBySession.set(player.session_id, [])
    playersBySession.get(player.session_id).push(player)
  }

  const liveMatches = myLiveRows.map((myRow) => {
    const allPlayers = (playersBySession.get(myRow.session_id) || []).sort(
      (a, b) => Number(b.total_score || 0) - Number(a.total_score || 0),
    )
    const session = sessionsById.get(myRow.session_id)
    const maxScore = allPlayers.length
      ? Math.max(...allPlayers.map((p) => Number(p.total_score || 0)))
      : Number(myRow.total_score || 0)

    const opponents = allPlayers
      .filter((p) => p.id !== myRow.id)
      .map((p) => ({
        id: p.id,
        nickname: p.nickname || (lang === 'en' ? 'Player' : 'Giocatore'),
        avatarId: p.avatar_id || 1,
        score: Number(p.total_score || 0),
      }))

    return {
      id: `live-${myRow.session_id}`,
      mode: 'live',
      gameName: gamesById.get(session?.game_id)?.name || (lang === 'en' ? 'Live Match' : 'Partita Live'),
      gameAvatar:
        Number.isInteger(gamesById.get(session?.game_id)?.cover_index) &&
        gamesById.get(session?.game_id)?.cover_index >= 0
          ? gameAvatarOptions[gamesById.get(session?.game_id)?.cover_index] || ''
          : '',
      playedAt: myRow.updated_at || session?.created_at || null,
      score: Number(myRow.total_score || 0),
      myNickname: myRow.nickname || (lang === 'en' ? 'You' : 'Tu'),
      isWin: Number(myRow.total_score || 0) >= maxScore && maxScore > 0,
      myAvatarId: myRow.avatar_id || myAvatarId || 1,
      opponents,
    }
  })

  const enotecaMatches = (enotecaRows || []).map((row) => ({
    id: `enoteca-${row.id}`,
    mode: 'enoteca',
    gameName:
      gamesById.get(row.game_id)?.name || (lang === 'en' ? 'Enoteca Tasting' : 'Degustazione Enoteca'),
    gameAvatar:
      Number.isInteger(gamesById.get(row.game_id)?.cover_index) &&
      gamesById.get(row.game_id)?.cover_index >= 0
        ? gameAvatarOptions[gamesById.get(row.game_id)?.cover_index] || ''
        : '',
    playedAt: row.completed_at || null,
    score: Number(row.total_score || 0),
    myNickname: row.nickname || (lang === 'en' ? 'You' : 'Tu'),
    isWin: false,
    myAvatarId: myAvatarId || 1,
    opponents: [],
  }))

  const matches = [...liveMatches, ...enotecaMatches].sort(
    (a, b) => new Date(b.playedAt || 0).getTime() - new Date(a.playedAt || 0).getTime(),
  )

  const totalMatches = matches.length
  const totalWins = liveMatches.filter((match) => match.isWin).length
  const totalScore = matches.reduce((sum, match) => sum + Number(match.score || 0), 0)

  const scoreByUser = new Map()
  for (const row of allLiveScoresResult.data || []) {
    if (!row?.user_id) continue
    scoreByUser.set(row.user_id, (scoreByUser.get(row.user_id) || 0) + Number(row.total_score || 0))
  }

  const ranking = Array.from(scoreByUser.entries())
    .map(([uid, score]) => ({uid, score}))
    .sort((a, b) => b.score - a.score)
  const rank = ranking.findIndex((row) => row.uid === user.id) + 1

  return (
    <PartiteClient
      lang={lang}
      t={t}
      matches={matches}
      summary={{
        totalMatches,
        totalWins,
        totalScore,
        rank: rank || null,
        totalUsers: ranking.length,
      }}
    />
  )
}
