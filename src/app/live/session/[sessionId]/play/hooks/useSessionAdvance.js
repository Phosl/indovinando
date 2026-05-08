import {useCallback} from 'react'
import {supabaseClient} from '@/lib/supabaseClient'

/**
 * Handles score synchronisation and bottle/session advancement (host only for sync).
 */
export function useSessionAdvance({
  sessionId,
  currentBottleIndex,
  isLastBottle,
  isHostUser,
  resetRoundState,
  setShowBottleTransition,
}) {
  const syncScoresFromAnswers = useCallback(
    async (answersByPlayer) => {
      if (!isHostUser) return
      const {data: players} = await supabaseClient
        .from('live_players')
        .select('id, total_score')
        .eq('session_id', sessionId)
      if (!players || players.length === 0) return

      const scoreByPlayer = {}
      players.forEach((p) => {
        scoreByPlayer[p.id] = p.total_score || 0
      })
      Object.entries(answersByPlayer).forEach(([playerId, perQuestion]) => {
        Object.values(perQuestion || {}).forEach((answer) => {
          if (scoreByPlayer[playerId] !== undefined) scoreByPlayer[playerId] += answer.points || 0
        })
      })
      await Promise.all(
        players.map((p) =>
          supabaseClient
            .from('live_players')
            .update({total_score: scoreByPlayer[p.id] || 0})
            .eq('id', p.id),
        ),
      )
    },
    [isHostUser, sessionId],
  )

  const advanceToNextBottleOrFinish = useCallback(async () => {
    try {
      if (isLastBottle) {
        await supabaseClient
          .from('live_sessions')
          .update({
            status: 'finished',
            finished_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId)
        return
      }

      await supabaseClient.from('live_round_answers').delete().eq('session_id', sessionId)

      const nextIndex = currentBottleIndex + 1
      await supabaseClient
        .from('live_sessions')
        .update({
          current_question_index: nextIndex,
          round_status: 'waiting_answers',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      resetRoundState(nextIndex, 'waiting_answers')
    } catch (err) {
      console.error('Errore in advanceToNextBottleOrFinish:', err)
      setShowBottleTransition(false)
    }
  }, [currentBottleIndex, isLastBottle, resetRoundState, sessionId, setShowBottleTransition])

  return {syncScoresFromAnswers, advanceToNextBottleOrFinish}
}
