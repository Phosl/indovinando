import {useState, useEffect, useCallback, useMemo, useRef} from 'react'
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
  roundAnchorAt,
  // setters from useGameDataLoader
  setCurrentBottleIndex,
  setRoundStatus,
  setAllPlayers,
  // audio
  playSound,
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [roundAnswersByPlayer, setRoundAnswersByPlayer] = useState({})
  const [roundAnswers, setRoundAnswers] = useState({})
  const [correctOptionByQuestion, setCorrectOptionByQuestion] = useState({})
  const [isCorrectOptionsLoaded, setIsCorrectOptionsLoaded] = useState(false)
  const [clickedReady, setClickedReady] = useState(false)
  const [playerMarkedNext, setPlayerMarkedNext] = useState(false)
  const [resultsOpenedBottleIndex, setResultsOpenedBottleIndex] = useState(null)
  const [showBottleTransition, setShowBottleTransition] = useState(false)
  const [comboCount, setComboCount] = useState(0)
  const comboRef = useRef(0)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [checkedQuestions, setCheckedQuestions] = useState({})
  const [slideMotion, setSlideMotion] = useState('idle')
  const [isCheckingAnswer, setIsCheckingAnswer] = useState(false)
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
    setIsCorrectOptionsLoaded(false)
    if (!currentBottle?.id) return
    const load = async () => {
      try {
        const {data, error} = await supabaseClient
          .from('game_bottle_answers')
          .select('question_id, option_id')
          .eq('bottle_id', currentBottle.id)
        if (error) throw error
        const map = {}
        ;(data || []).forEach((row) => {
          map[row.question_id] = row.option_id
        })
        setCorrectOptionByQuestion(map)
        setIsCorrectOptionsLoaded(true)
      } catch (err) {
        console.error('Failed to load correct options:', err)
        // Avoid keeping the Check button blocked forever if preload fails.
        setIsCorrectOptionsLoaded(true)
      }
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
      setIsCorrectOptionsLoaded(false)
      setClickedReady(false)
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

  // ── Shared questionIds memo (avoids recomputing in two separate memos) ─────
  const questionIds = useMemo(() => liveQuestions.map((q) => q.id), [liveQuestions])

  const participantIds = useMemo(() => {
    if (allPlayers.length > 0) {
      return allPlayers.map((player) => player.id)
    }
    return playerData?.id ? [playerData.id] : []
  }, [allPlayers, playerData?.id])

  // ── Derive allPlayersCompleted + per-player progress from local state ──────
  const allPlayersCompletedThisRound = useMemo(() => {
    if (!clickedReady || participantIds.length === 0 || questionIds.length === 0) return false
    return participantIds.every((playerId) =>
      questionIds.every((qId) => Boolean(roundAnswersByPlayer[playerId]?.[qId])),
    )
  }, [clickedReady, participantIds, roundAnswersByPlayer, questionIds])

  // How many players have answered every question in the current round
  const playersReadyCount = useMemo(() => {
    if (questionIds.length === 0) return 0
    return participantIds.filter((playerId) =>
      questionIds.every((qId) => Boolean(roundAnswersByPlayer[playerId]?.[qId])),
    ).length
  }, [participantIds, roundAnswersByPlayer, questionIds])
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
        // Opportunistic cleanup: delete sessions finished more than 24h ago
        supabaseClient
          .from('live_sessions')
          .delete()
          .eq('status', 'finished')
          .lt('finished_at', new Date(Date.now() - 86_400_000).toISOString())
          .then(() => {})
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
  // NOTE: We intentionally ignore payload.new because Supabase RLS may strip it
  // for other players' rows. Re-fetch all answers from DB instead (same pattern
  // as the players channel), so roundAnswersByPlayer is always authoritative.
  const handleAnswerInsert = useCallback(async () => {
    if (liveQuestions.length === 0) return
    const questionIds = liveQuestions.map((q) => q.id)
    let answersQuery = supabaseClient
      .from('live_round_answers')
      .select('player_id, question_id, selected_option_id, is_correct, points')
      .eq('session_id', sessionId)
      .in('question_id', questionIds)

    if (roundAnchorAt) {
      answersQuery = answersQuery.gte('answered_at', roundAnchorAt)
    }

    const {data: answers} = await answersQuery

    if (!answers) return
    const rebuilt = {}
    answers.forEach((a) => {
      if (!rebuilt[a.player_id]) rebuilt[a.player_id] = {}
      rebuilt[a.player_id][a.question_id] = {
        optionId: a.selected_option_id,
        isCorrect: a.is_correct,
        points: a.points,
      }
    })
    setRoundAnswersByPlayer(rebuilt)
  }, [sessionId, liveQuestions, roundAnchorAt])

  // ── Re-sync answers while waiting for all players to complete ─────────────
  // Polls DB every 2s once the local player has marked ready and the round is
  // not yet complete. This is the authoritative fallback: it works whether or
  // not the live_players / live_round_answers Realtime channels are publishing.
  // The realtime-triggered paths (handleAnswerInsert / onPlayersUpdate) act as
  // a speed-up but are not required for correctness.
  useEffect(() => {
    if (!clickedReady || allPlayersCompletedThisRound) return
    handleAnswerInsert() // immediate fetch on entry
    const interval = setInterval(handleAnswerInsert, 2000)
    return () => clearInterval(interval)
  }, [clickedReady, allPlayersCompletedThisRound, handleAnswerInsert])

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
      if (isCheckingAnswer) return
      if (!isCorrectOptionsLoaded) return

      const applyLocalAnswerResult = ({isCorrect, points, comboBonus, newCombo}) => {
        comboRef.current = newCombo
        setComboCount(newCombo)

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
      }

      try {
        setIsCheckingAnswer(true)

        let resolvedCorrectOptionId = correctOptionByQuestion[questionId]
        if (!resolvedCorrectOptionId && currentBottle?.id) {
          const {data: answerRow, error: answerError} = await supabaseClient
            .from('game_bottle_answers')
            .select('option_id')
            .eq('bottle_id', currentBottle.id)
            .eq('question_id', questionId)
            .maybeSingle()

          if (answerError) {
            console.error('Error loading correct option on demand:', answerError)
          }

          resolvedCorrectOptionId = answerRow?.option_id || null
          if (resolvedCorrectOptionId) {
            setCorrectOptionByQuestion((prev) => ({
              ...prev,
              [questionId]: resolvedCorrectOptionId,
            }))
          }
        }

        if (!resolvedCorrectOptionId) {
          if (isHostUser) {
            const response = await fetch('/api/live/round-answer/host-submit', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                sessionId,
                playerId: playerData.id,
                questionId,
                selectedOptionId: optionId,
                comboCount: comboRef.current,
              }),
            })

            const payload = await response.json().catch(() => ({}))
            if (!response.ok) {
              throw new Error(payload?.error || 'Failed to submit host answer')
            }

            const isCorrect = Boolean(payload?.isCorrect)
            const points = Number(payload?.points || 0)
            const comboBonus = Number(payload?.comboBonus || 0)
            const newCombo = Number(payload?.newCombo || 0)

            if (payload?.correctOptionId) {
              setCorrectOptionByQuestion((prev) => ({
                ...prev,
                [questionId]: payload.correctOptionId,
              }))
            }

            applyLocalAnswerResult({isCorrect, points, comboBonus, newCombo})
            return
          }

          throw new Error('Correct option not available for this question')
        }

        const isCorrect = resolvedCorrectOptionId === optionId
        const newCombo = isCorrect ? comboRef.current + 1 : 0
        const comboBonus = isCorrect && newCombo >= 2 ? Math.min(newCombo - 1, 3) * 5 : 0
        const points = isCorrect ? 10 + comboBonus : 0

        const {error} = await supabaseClient.from('live_round_answers').insert({
          session_id: sessionId,
          player_id: playerData.id,
          question_id: questionId,
          selected_option_id: optionId,
          is_correct: isCorrect,
          points,
        })

        // If the answer already exists, treat it as already submitted for this round.
        if (error && error.code !== '23505') throw error

        applyLocalAnswerResult({isCorrect, points, comboBonus, newCombo})
      } catch (err) {
        console.error(
          'Error evaluating answer:',
          err?.message ?? err?.code ?? JSON.stringify(err),
          err,
        )
      } finally {
        setIsCheckingAnswer(false)
      }
    },
    [
      playerData,
      roundStatus,
      checkedQuestions,
      isCheckingAnswer,
      isCorrectOptionsLoaded,
      correctOptionByQuestion,
      currentBottle?.id,
      sessionId,
      playSound,
      isHostUser,
    ],
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
    setClickedReady(true)
    setResultsOpenedBottleIndex(currentBottleIndex)

    supabaseClient
      .from('live_players')
      .update({updated_at: new Date().toISOString()})
      .eq('id', playerData.id)
      .then(({error}) => {
        if (error) {
          console.error('Error setting ready status:', error)
        }
      })
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
    isCorrectOptionsLoaded,
    clickedReady,
    allPlayersCompletedThisRound, // derived via useMemo
    playerMarkedNext,
    resultsOpenedBottleIndex,
    setResultsOpenedBottleIndex,
    showBottleTransition,
    setShowBottleTransition,
    comboCount,
    isCheckingAnswer,
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
    syncScoresFromAnswers,
    advanceToNextBottleOrFinish,
    // progress
    playersReadyCount,
    participantsCount: participantIds.length,
  }
}
