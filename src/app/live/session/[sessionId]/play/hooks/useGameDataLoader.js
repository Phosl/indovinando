import {useState, useEffect} from 'react'
import {supabaseClient} from '@/lib/supabaseClient'

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
}) {
  const [liveQuestions, setLiveQuestions] = useState(initialQuestions || [])
  const [liveBottles, setLiveBottles] = useState(initialBottles || [])
  const [currentBottleIndex, setCurrentBottleIndex] = useState(initialQuestionIndex)
  const [roundStatus, setRoundStatus] = useState(initialStatus)
  const [loadingGameData, setLoadingGameData] = useState((initialQuestions || []).length === 0)
  const [allPlayers, setAllPlayers] = useState([])
  const [sessionFinished, setSessionFinished] = useState(false)

  // Load player list on mount
  useEffect(() => {
    const loadPlayers = async () => {
      const {data} = await supabaseClient
        .from('live_players')
        .select('id, nickname, avatar_id, total_score, updated_at, is_host')
        .eq('session_id', sessionId)
        .order('joined_at')
      if (data) setAllPlayers(data)
    }
    loadPlayers()
  }, [sessionId])

  // Bootstrap game data when not pre-loaded from server
  useEffect(() => {
    const bootstrap = async () => {
      if (liveQuestions.length > 0) {
        setLoadingGameData(false)
        return
      }

      const {data: session} = await supabaseClient
        .from('live_sessions')
        .select('game_id, current_question_index, round_status, status')
        .eq('id', sessionId)
        .maybeSingle()

      if (!session?.game_id) {
        setLoadingGameData(false)
        return
      }

      setCurrentBottleIndex(session.current_question_index || 0)
      setRoundStatus(session.round_status || 'waiting_answers')
      if (session.status === 'finished') setSessionFinished(true)

      const [{data: questionsData}, {data: bottlesData}, {data: playersData}] = await Promise.all([
        supabaseClient
          .from('game_questions')
          .select('id, text, display_order, game_question_options (id, text, option_order)')
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

      setLiveQuestions(questionsData || [])
      setLiveBottles(bottlesData || [])
      setAllPlayers(playersData || [])
      setLoadingGameData(false)
    }

    bootstrap()
  }, [liveQuestions.length, sessionId])

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
