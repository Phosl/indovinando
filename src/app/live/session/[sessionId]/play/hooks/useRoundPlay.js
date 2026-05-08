import {useState, useEffect, useCallback, useMemo, useRef} from 'react'
import {useRouter} from 'next/navigation'
import {supabaseClient} from '@/lib/supabaseClient'

const SLIDE_TRANSITION_MS = 220

/**
 * Owns all per-round state (answers, slides, combo, results visibility)
 * plus every action handler that mutates it.
 * Also absorbs score-sync and session-advance (previously in useSessionAdvance).
 */
export function useRoundPlay({
  sessionId,
  playerData,
  liveQuestions,
  allPlayers,
  currentBottleIndex,
  roundStatus,
  isHostUser,
  isLastBottle,
  currentBottle,
  // setters from useGameDataLoader
  setCurrentBottleIndex,
  setRoundStatus,
  setAllPlayers,
  setSessionFinished,
  // audio
  playSound,
}) {
  const router = useRouter()

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [roundAnswersByPlayer, setRoundAnswersByPlayer] = useState({})
  const [roundAnswers, setRoundAnswers] = useState({})
  const [correctOptionByQuestion, setCorrectOptionByQuestion] = useState({})
  const [clickedReady, setClickedReady] = useState(false)
  const [playerMarkedNext, setPlayerMarkedNext] = useState(false)
  const [resultsOpenedBottleIndex, setResultsOpenedBottleIndex] = useState(null)
  const [showBottleTransition, setShowBottleTransition] = useState(false)
  const [comboCount, setComboCount] = useState(0)
  const comboRef = useRef(0)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [checkedQuestions, setCheckedQuestions] = useState({})
  const [slideMotion, setSlideMotion] = useState('idle')
  const slideTimerRef = useRef(null)
  const playedBottleSoundRef = useRef(null)

  // ── Cleanup timer on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current)
    }
  }, [])

  // ── Bottle-transition sound ────────────────────────────────────────────────
  useEffect(() => {
    if (!showBottleTransition) return
    if (playedBottleSoundRef.current === `transition-${currentBottleIndex}`) return
    playedBottleSoundRef.current = `transition-${currentBottleIndex}`
    playSound('bottleCompleted')
  }, [showBottleTransition, currentBottleIndex, playSound])

  // ── Load correct answers for current bottle ────────────────────────────────
  useEffect(() => {
    if (!currentBottle?.id) return
    const load = async () => {
      const {data} = await supabaseClient
        .from('game_bottle_answers')
        .select('question_id, option_id')
        .eq('bottle_id', currentBottle.id)
      const map = {}
      ;(data || []).forEach((row) => {
        map[row.question_id] = row.option_id
      })
      setCorrectOptionByQuestion(map)
    }
    load()
  }, [currentBottle?.id])

  // ── Reset all round state (called on bottle advance or realtime sync) ──────
  const resetRoundState = useCallback(
    (nextIndex, nextRoundStatus) => {
      setShowBottleTransition(false)
      setResultsOpenedBottleIndex(null)
      setPlayerMarkedNext(false)
      setSelectedAnswers({})
      setRoundAnswers({})
      setRoundAnswersByPlayer({})
      setCorrectOptionByQuestion({})
      setClickedReady(false)
      setRoundAnswersByPlayer({})
      setCurrentSlideIndex(0)
      setCheckedQuestions({})
      setSlideMotion('idle')
      setComboCount(0)
      comboRef.current = 0
      if (nextIndex !== undefined) setCurrentBottleIndex(nextIndex)
      if (nextRoundStatus !== undefined) setRoundStatus(nextRoundStatus)
    },
    [setCurrentBottleIndex, setRoundStatus],
  )

  // ── One-time fetch when player marks ready (sync any existing answers) ─────
  useEffect(() => {
    if (!clickedReady || liveQuestions.length === 0) return
    const questionIds = liveQuestions.map((q) => q.id)
    const syncExisting = async () => {
      const {data: answers} = await supabaseClient
        .from('live_round_answers')
        .select('player_id, question_id, selected_option_id, is_correct, points')
        .eq('session_id', sessionId)
        .in('question_id', questionIds)
      if (!answers) return
      setRoundAnswersByPlayer((prev) => {
        const updated = {...prev}
        answers.forEach((a) => {
          if (!updated[a.player_id]) updated[a.player_id] = {}
          updated[a.player_id][a.question_id] = {
            optionId: a.selected_option_id,
            isCorrect: a.is_correct,
            points: a.points,
          }
        })
        return updated
      })
    }
    syncExisting()
  }, [clickedReady, sessionId, liveQuestions])

  // ── Derive allPlayersCompleted from local state (no polling) ───────────────
  const allPlayersCompletedThisRound = useMemo(() => {
    if (!clickedReady || allPlayers.length === 0 || liveQuestions.length === 0) return false
    const questionIds = liveQuestions.map((q) => q.id)
    return allPlayers.every((p) =>
      questionIds.every((qId) => Boolean(roundAnswersByPlayer[p.id]?.[qId])),
    )
  }, [clickedReady, allPlayers, roundAnswersByPlayer, liveQuestions])

  // ── Score sync + session advance (host only) ───────────────────────────────
  const syncScoresFromAnswers = useCallback(
    async (answersByPlayer) => {
      if (!isHostUser) return
      const {data: players} = await supabaseClient
        .from('live_players')
        .select('id, total_score')
        .eq('session_id', sessionId)
      if (!players?.length) return

      const scoreByPlayer = Object.fromEntries(players.map((p) => [p.id, p.total_score || 0]))
      Object.entries(answersByPlayer).forEach(([playerId, perQuestion]) => {
        Object.values(perQuestion || {}).forEach((a) => {
          if (scoreByPlayer[playerId] !== undefined) scoreByPlayer[playerId] += a.points || 0
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
  }, [currentBottleIndex, isLastBottle, resetRoundState, sessionId])

  // ── Realtime answer insert handler (consumed by useLiveRealtime) ───────────
  const handleAnswerInsert = useCallback(
    (answer) => {
      setRoundAnswersByPlayer((prev) => {
        const updated = {...prev}
        if (!updated[answer.player_id]) updated[answer.player_id] = {}
        updated[answer.player_id][answer.question_id] = {
          optionId: answer.selected_option_id,
          isCorrect: answer.is_correct,
          points: answer.points,
        }
        return updated
      })
      if (playerData?.id === answer.player_id) {
        setRoundAnswers((prev) => ({
          ...prev,
          [answer.question_id]: {
            optionId: answer.selected_option_id,
            isCorrect: answer.is_correct,
            points: answer.points,
          },
        }))
        setCheckedQuestions((prev) => ({...prev, [answer.question_id]: true}))
      }
    },
    [playerData?.id],
  )

  // ── Answer interaction handlers ────────────────────────────────────────────
  const handleSelect = useCallback((questionId, optionId) => {
    setSelectedAnswers((prev) => {
      if (prev[questionId] === optionId) return prev
      return {...prev, [questionId]: optionId}
    })
  }, [])

  const handleCheck = useCallback(
    async (questionId, optionId) => {
      if (!playerData || roundStatus !== 'waiting_answers') return
      if (checkedQuestions[questionId] || !optionId) return

      const isCorrect = correctOptionByQuestion[questionId] === optionId
      const newCombo = isCorrect ? comboRef.current + 1 : 0
      const comboBonus = isCorrect && newCombo >= 2 ? Math.min(newCombo - 1, 3) * 5 : 0
      const points = isCorrect ? 10 + comboBonus : 0
      comboRef.current = newCombo
      setComboCount(newCombo)

      try {
        const {error} = await supabaseClient.from('live_round_answers').upsert(
          {
            session_id: sessionId,
            player_id: playerData.id,
            question_id: questionId,
            selected_option_id: optionId,
            is_correct: isCorrect,
            points,
          },
          {onConflict: 'session_id,player_id,question_id'},
        )
        if (error) throw error
        setRoundAnswers((prev) => ({
          ...prev,
          [questionId]: {optionId, isCorrect, points, comboBonus, newCombo},
        }))
        setRoundAnswersByPlayer((prev) => {
          const updated = {...prev}
          if (!updated[playerData.id]) updated[playerData.id] = {}
          updated[playerData.id] = {
            ...updated[playerData.id],
            [questionId]: {optionId, isCorrect, points},
          }
          return updated
        })
        setCheckedQuestions((prev) => ({...prev, [questionId]: true}))
        playSound(isCorrect ? 'correct' : 'wrong')
      } catch (err) {
        console.error('Error evaluating answer:', err)
      }
    },
    [playerData, roundStatus, checkedQuestions, correctOptionByQuestion, sessionId, playSound],
  )

  const handleContinue = useCallback(async () => {
    const isLastSlide = currentSlideIndex >= liveQuestions.length - 1
    if (!isLastSlide) {
      if (slideMotion !== 'idle') return
      setSlideMotion('exiting')
      slideTimerRef.current = setTimeout(() => {
        setCurrentSlideIndex((prev) => prev + 1)
        setSlideMotion('entering')
        slideTimerRef.current = setTimeout(() => setSlideMotion('idle'), SLIDE_TRANSITION_MS)
      }, SLIDE_TRANSITION_MS)
      return
    }
    if (!playerData || clickedReady) return
    try {
      await supabaseClient
        .from('live_players')
        .update({updated_at: new Date().toISOString()})
        .eq('id', playerData.id)
      setClickedReady(true)
      setResultsOpenedBottleIndex(currentBottleIndex)
    } catch (err) {
      console.error('Error setting ready status:', err)
    }
  }, [
    currentSlideIndex,
    liveQuestions.length,
    playerData,
    clickedReady,
    slideMotion,
    currentBottleIndex,
  ])

  const handleNextBottleClick = useCallback(async () => {
    if (!allPlayersCompletedThisRound) return
    if (isHostUser) {
      await syncScoresFromAnswers(roundAnswersByPlayer)
      setResultsOpenedBottleIndex(null)
      setShowBottleTransition(true)
    } else {
      setPlayerMarkedNext(true)
    }
  }, [allPlayersCompletedThisRound, isHostUser, roundAnswersByPlayer, syncScoresFromAnswers])

  return {
    // state
    selectedAnswers,
    roundAnswers,
    roundAnswersByPlayer,
    correctOptionByQuestion,
    clickedReady,
    allPlayersCompletedThisRound, // derived via useMemo
    playerMarkedNext,
    resultsOpenedBottleIndex,
    setResultsOpenedBottleIndex,
    showBottleTransition,
    setShowBottleTransition,
    comboCount,
    currentSlideIndex,
    checkedQuestions,
    slideMotion,
    // handlers
    resetRoundState,
    handleAnswerInsert,
    handleSelect,
    handleCheck,
    handleContinue,
    handleNextBottleClick,
    advanceToNextBottleOrFinish,
  }
}
