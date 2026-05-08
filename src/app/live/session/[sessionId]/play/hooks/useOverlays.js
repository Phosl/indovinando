import {useState, useCallback, useMemo, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {supabaseClient} from '@/lib/supabaseClient'

/**
 * Manages leaderboard + exit-modal state, sorted leaderboard computation,
 * and the exit handler.
 */
export function useOverlays({
  sessionId,
  playerData,
  allPlayers,
  setAllPlayers,
  isHostUser,
  playerStorageKey,
  nicknameStorageKey,
}) {
  const router = useRouter()
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [exitModalOpen, setExitModalOpen] = useState(false)

  const sortedLeaderboard = useMemo(
    () => [...allPlayers].sort((a, b) => (b.total_score || 0) - (a.total_score || 0)),
    [allPlayers],
  )

  const openLeaderboard = useCallback(async () => {
    setLeaderboardOpen(true)
    const {data} = await supabaseClient
      .from('live_players')
      .select('id, nickname, avatar_id, total_score, updated_at, is_host')
      .eq('session_id', sessionId)
      .order('joined_at')
    if (data) setAllPlayers(data)
  }, [sessionId, setAllPlayers])

  // While the overlay is open, poll every 3s so scores stay in sync
  useEffect(() => {
    if (!leaderboardOpen) return
    const interval = setInterval(async () => {
      const {data} = await supabaseClient
        .from('live_players')
        .select('id, nickname, avatar_id, total_score, updated_at, is_host')
        .eq('session_id', sessionId)
        .order('joined_at')
      if (data) setAllPlayers(data)
    }, 3000)
    return () => clearInterval(interval)
  }, [leaderboardOpen, sessionId, setAllPlayers])

  const kickPlayer = useCallback(
    async (playerId) => {
      if (!isHostUser) return
      await supabaseClient.from('live_players').delete().eq('id', playerId)
      setAllPlayers((prev) => prev.filter((p) => p.id !== playerId))
    },
    [isHostUser, setAllPlayers],
  )

  const openExit = useCallback(() => {
    setLeaderboardOpen(false)
    setExitModalOpen(true)
  }, [])

  const exitGame = useCallback(() => {
    localStorage.removeItem(playerStorageKey)
    localStorage.removeItem(nicknameStorageKey)
    setExitModalOpen(false)
    const shouldGoDashboard = isHostUser || Boolean(playerData?.is_host)
    router.push(shouldGoDashboard ? '/dashboard' : `/live/session/${sessionId}`)
  }, [isHostUser, nicknameStorageKey, playerData, playerStorageKey, router, sessionId])

  return {
    leaderboardOpen,
    setLeaderboardOpen,
    exitModalOpen,
    setExitModalOpen,
    sortedLeaderboard,
    openLeaderboard,
    kickPlayer,
    openExit,
    exitGame,
  }
}
