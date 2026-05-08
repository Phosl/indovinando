import {useEffect} from 'react'
import {supabaseClient} from '@/lib/supabaseClient'

/**
 * Subscribes to the 3 Supabase Realtime channels needed during a live session.
 * All callbacks are provided by the parent component so this hook owns no state.
 *
 * @param {object} opts
 * @param {string}   opts.sessionId
 * @param {object|null} opts.playerData          - current player record
 * @param {number}   opts.currentBottleIndex
 * @param {Function} opts.resolvePlayer
 * @param {Function} opts.onSessionUpdate        - (updatedSession) => void
 * @param {Function} opts.onPlayersUpdate        - (players[]) => void
 * @param {Function} opts.onAnswerInsert         - (answer) => void
 */
export function useLiveRealtime({
  sessionId,
  playerData,
  currentBottleIndex,
  resolvePlayer,
  onSessionUpdate,
  onPlayersUpdate,
  onAnswerInsert,
}) {
  useEffect(() => {
    const sessionChannel = supabaseClient
      .channel(`live_sessions:${sessionId}`)
      .on(
        'postgres_changes',
        {event: '*', schema: 'public', table: 'live_sessions', filter: `id=eq.${sessionId}`},
        (payload) => onSessionUpdate(payload.new),
      )
      .subscribe()

    const playersChannel = supabaseClient
      .channel(`live_players:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_players',
          filter: `session_id=eq.${sessionId}`,
        },
        async () => {
          const {data: players} = await supabaseClient
            .from('live_players')
            .select('id, nickname, avatar_id, total_score, updated_at, is_host')
            .eq('session_id', sessionId)
            .order('joined_at')
          onPlayersUpdate(players || [])
        },
      )
      .subscribe()

    const answersChannel = supabaseClient
      .channel(`live_round_answers:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_round_answers',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new) onAnswerInsert(payload.new)
        },
      )
      .subscribe()

    // Fallback polling: re-resolve player if still missing
    const pollSession = setInterval(async () => {
      if (!playerData) await resolvePlayer()
    }, 10000)

    return () => {
      clearInterval(pollSession)
      sessionChannel.unsubscribe()
      playersChannel.unsubscribe()
      answersChannel.unsubscribe()
    }
  }, [sessionId, playerData, currentBottleIndex, resolvePlayer, onSessionUpdate, onPlayersUpdate, onAnswerInsert])
}
