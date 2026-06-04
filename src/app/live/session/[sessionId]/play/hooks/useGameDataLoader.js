import {useState, useEffect} from 'react'
import {supabaseClient} from '@/lib/supabaseClient'

const withTimeout = async (task, label, timeoutMs = 5000) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout bootstrapping game data (${label})`)), timeoutMs)
  })
  return Promise.race([task, timeoutPromise])
}

/**
 * Loads game questions, bottles and players.
 * Falls back to fetching from Supabase when initial props are empty (e.g. late join).
 */
export function useGameDataLoader({
  sessionId,
  initialQuestions,
  initialBottles,
  initialStatus,
  initialQuestionIndex,
  initialUpdatedAt,
  initialPlayers,
}) {
  const [liveQuestions, setLiveQuestions] = useState(initialQuestions || [])
  const [liveBottles, setLiveBottles] = useState(initialBottles || [])
  const [currentBottleIndex, setCurrentBottleIndex] = useState(initialQuestionIndex)
  const [roundStatus, setRoundStatus] = useState(initialStatus)
  const [loadingGameData, setLoadingGameData] = useState((initialQuestions || []).length === 0)
  const [allPlayers, setAllPlayers] = useState(initialPlayers || [])
  const [sessionFinished, setSessionFinished] = useState(false)

  // Load player list on mount
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const {data} = await supabaseClient
          .from('live_players')
          .select('id, nickname, avatar_id, total_score, updated_at, is_host')
          .eq('session_id', sessionId)
          .order('joined_at')
        if (data) setAllPlayers(data)
      } catch (error) {
        console.error('Error loading players:', error)
      }
    }
    loadPlayers()
  }, [sessionId])

  // Bootstrap game data when not pre-loaded from server
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await withTimeout(
          (async () => {
            if (liveQuestions.length > 0) {
              return
            }

            const {data: session} = await supabaseClient
              .from('live_sessions')
              .select('game_id, current_question_index, round_status, status, updated_at')
              .eq('id', sessionId)
              .maybeSingle()

            if (!session?.game_id) {
              return
            }

            setCurrentBottleIndex(session.current_question_index || 0)
            setRoundStatus(session.round_status || 'waiting_answers')
            if (session.status === 'finished') setSessionFinished(true)

            const [{data: questionsData}, {data: bottlesData}, {data: playersData}] =
              await Promise.all([
                supabaseClient
                  .from('game_questions')
                  .select('id, text, kind, is_neutral, display_order, game_question_options (id, text, option_order)')
                  .eq('game_id', session.game_id)
                  .order('display_order'),
                supabaseClient
                  .from('game_bottles')
                  .select('*')
                  .eq('game_id', session.game_id)
                  .order('bottle_order'),
                supabaseClient
                  .from('live_players')
                  .select('id, nickname, avatar_id, total_score, updated_at, is_host')
                  .eq('session_id', sessionId)
                  .order('joined_at'),
              ])

            // Fetch correct answers for all bottles and embed them
            const bottles = bottlesData || []
            if (bottles.length > 0) {
              const {data: answersData} = await supabaseClient
                .from('game_bottle_answers')
                .select('bottle_id, question_id, option_id')
                .in(
                  'bottle_id',
                  bottles.map((b) => b.id),
                )
              const answersMap = {}
              ;(answersData || []).forEach((a) => {
                if (!answersMap[a.bottle_id]) answersMap[a.bottle_id] = {}
                answersMap[a.bottle_id][a.question_id] = a.option_id
              })
              setLiveBottles(bottles.map((b) => ({...b, _correctAnswers: answersMap[b.id] || {}})))
            } else {
              setLiveBottles([])
            }

            setLiveQuestions(questionsData || [])
            setAllPlayers(playersData || [])
          })(),
          'bootstrap',
        )
      } catch (error) {
        console.error('Error bootstrapping game data:', error)
      } finally {
        setLoadingGameData(false)
      }
    }

    bootstrap()
  }, [liveQuestions.length, sessionId, initialUpdatedAt])

  return {
    liveQuestions,
    liveBottles,
    currentBottleIndex,
    setCurrentBottleIndex,
    roundStatus,
    setRoundStatus,
    loadingGameData,
    allPlayers,
    setAllPlayers,
    sessionFinished,
    setSessionFinished,
  }
}
