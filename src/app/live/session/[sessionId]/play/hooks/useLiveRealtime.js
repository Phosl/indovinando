import {useEffect, useRef} from 'react'
import {supabaseClient} from '@/lib/supabaseClient'

/**
 * Subscribes to the 3 Supabase Realtime channels needed during a live session.
 * Channels are created once per sessionId. Callbacks are stored in refs so that
 * stale-closure re-renders never cause a full unsubscribe/resubscribe cycle.
 */
export function useLiveRealtime({
  sessionId,
  playerData,
  resolvePlayer,
  onSessionUpdate,
  onPlayersUpdate,
  onAnswerInsert,
}) {
  // Keep latest callbacks in refs so the effect closure never goes stale
  const onSessionUpdateRef = useRef(onSessionUpdate)
  const onPlayersUpdateRef = useRef(onPlayersUpdate)
  const onAnswerInsertRef = useRef(onAnswerInsert)
  const resolvePlayerRef = useRef(resolvePlayer)
  const playerDataRef = useRef(playerData)

  useEffect(() => { onSessionUpdateRef.current = onSessionUpdate }, [onSessionUpdate])
  useEffect(() => { onPlayersUpdateRef.current = onPlayersUpdate }, [onPlayersUpdate])
  useEffect(() => { onAnswerInsertRef.current = onAnswerInsert }, [onAnswerInsert])
  useEffect(() => { resolvePlayerRef.current = resolvePlayer }, [resolvePlayer])
  useEffect(() => { playerDataRef.current = playerData }, [playerData])

  useEffect(() => {
    const sessionChannel = supabaseClient
      .channel(`live_sessions:${sessionId}`)
      .on(
        'postgres_changes',
        {event: '*', schema: 'public', table: 'live_sessions', filter: `id=eq.${sessionId}`},
        (payload) => onSessionUpdateRef.current(payload.new),
      )
      .subscribe()

    const playersChannel = supabaseClient
      .channel(`live_players:${sessionId}`)
      .on(
        'postgres_changes',
        {event: '*', schema: 'public', table: 'live_players', filter: `session_id=eq.${sessionId}`},
        async () => {
          const {data: players} = await supabaseClient
            .from('live_players')
            .select('id, nickname, avatar_id, total_score, updated_at, is_host')
            .eq('session_id', sessionId)
            .order('joined_at')
          onPlayersUpdateRef.current(players || [])
        },
      )
      .subscribe()

    const answersChannel = supabaseClient
      .channel(`live_round_answers:${sessionId}`)
      .on(
        'postgres_changes',
        {event: 'INSERT', schema: 'public', table: 'live_round_answers', filter: `session_id=eq.${sessionId}`},
        (payload) => {
          if (payload.new) onAnswerInsertRef.current(payload.new)
        },
      )
      .subscribe()

    // Lightweight fallback: re-resolve missing player every 10 s
    const pollPlayer = setInterval(() => {
      if (!playerDataRef.current) resolvePlayerRef.current()
    }, 10000)

    return () => {
      clearInterval(pollPlayer)
      sessionChannel.unsubscribe()
      playersChannel.unsubscribe()
      answersChannel.unsubscribe()
    }
  }, [sessionId]) // ← only remount when sessionId changes
}
