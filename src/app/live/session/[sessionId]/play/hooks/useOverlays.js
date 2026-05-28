import {useState, useCallback, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {supabaseClient} from '@/lib/supabaseClient'

/**
 * Manages leaderboard + exit-modal state, sorted leaderboard computation,
 * and the exit handler.
 *
 * The overlay leaderboard standings are fetched from the server-side API
 * (/api/live/session/standings) so that host (authenticated) and guest
 * (anonymous) always see IDENTICAL data — single source of truth, no RLS
 * differences or client-side race conditions between the two roles.
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
  // Standings fetched from server API — same for all clients at any given moment
  const [overlayStandings, setOverlayStandings] = useState([])
  const [isLoadingStandings, setIsLoadingStandings] = useState(false)

  const fetchStandings = useCallback(async () => {
    setIsLoadingStandings(true)
    try {
      const res = await fetch(`/api/live/session/standings?sessionId=${sessionId}`)
      if (!res.ok) return
      const {standings} = await res.json()
      if (standings?.length) setOverlayStandings(standings)
    } catch (err) {
      console.error('Error fetching standings:', err)
    } finally {
      setIsLoadingStandings(false)
    }
  }, [sessionId])

  const openLeaderboard = useCallback(() => {
    setLeaderboardOpen(true)
    fetchStandings()
    // Also refresh allPlayers so the rest of the UI (ResultsScreen) stays in sync
    supabaseClient
      .from('live_players')
      .select('id, nickname, avatar_id, total_score, updated_at, is_host')
      .eq('session_id', sessionId)
      .order('joined_at')
      .then(({data}) => {
        if (data?.length) setAllPlayers(data)
      })
  }, [sessionId, fetchStandings, setAllPlayers])

  // While the overlay is open, poll every 3s so scores stay live
  useEffect(() => {
    if (!leaderboardOpen) return
    const pollVisibleStandings = () => {
      if (!document.hidden) fetchStandings()
    }
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchStandings()
    }
    const interval = setInterval(pollVisibleStandings, 3000)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [leaderboardOpen, fetchStandings])

  const kickPlayer = useCallback(
    async (playerId) => {
      if (!isHostUser) return
      const res = await fetch('/api/live/session/kick-player', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sessionId, playerId}),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data?.error) console.error('Error removing player:', data.error)
        return
      }
      setAllPlayers((prev) => prev.filter((p) => p.id !== playerId))
      setOverlayStandings((prev) => prev.filter((p) => p.id !== playerId))
    },
    [isHostUser, sessionId, setAllPlayers],
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
    router.push(shouldGoDashboard ? '/miei-giochi' : '/')
  }, [isHostUser, nicknameStorageKey, playerData, playerStorageKey, router])

  return {
    leaderboardOpen,
    setLeaderboardOpen,
    exitModalOpen,
    setExitModalOpen,
    sortedLeaderboard: overlayStandings,
    isLoadingStandings,
    openLeaderboard,
    kickPlayer,
    openExit,
    exitGame,
  }
}
