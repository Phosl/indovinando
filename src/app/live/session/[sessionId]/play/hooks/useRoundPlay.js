import {useState, useEffect, useCallback, useMemo, useRef} from 'react'

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
  // audio
  playSound,
  onPlayerRemoved,
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [roundAnswersByPlayer, setRoundAnswersByPlayer] = useState({})
  const [roundAnswers, setRoundAnswers] = useState({})
  const [correctOptionByQuestion, setCorrectOptionByQuestion] = useState(
    () => currentBottle?._correctAnswers || {},
  )
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
  const pendingAnswerSavesRef = useRef(new Map())

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

  // ── Sync correct answers from server-preloaded data when bottle changes ──
  useEffect(() => {
    if (currentBottle?._correctAnswers) {
      setCorrectOptionByQuestion(currentBottle._correctAnswers)
    }
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
  // The host never calls handleContinue so clickedReady stays false for them.
  // For guests, clickedReady is still required so we don't show results before
  // the player has finished their last slide.
  const allPlayersCompletedThisRound = useMemo(() => {
    if (participantIds.length === 0 || questionIds.length === 0) return false
    if (!isHostUser && !clickedReady) return false
    return participantIds.every((playerId) =>
      questionIds.every((qId) => Boolean(roundAnswersByPlayer[playerId]?.[qId])),
    )
  }, [clickedReady, isHostUser, participantIds, roundAnswersByPlayer, questionIds])

  // How many players have answered every question in the current round
  const playersReadyCount = useMemo(() => {
    if (questionIds.length === 0) return 0
    return participantIds.filter((playerId) =>
      questionIds.every((qId) => Boolean(roundAnswersByPlayer[playerId]?.[qId])),
    ).length
  }, [participantIds, roundAnswersByPlayer, questionIds])

  // Scores, answer deletion, and session advance all use tables with auth.uid()
  // RLS policies that cause GoTrueClient init hang in @supabase/ssr. Use the
  // server route /api/live/advance-bottle instead (admin client, bypasses RLS).
  const advanceToNextBottleOrFinish = useCallback(async () => {
    try {
      const res = await fetch('/api/live/advance-bottle', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sessionId}),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to advance bottle')
      }
      const {nextIndex} = await res.json()
      resetRoundState(nextIndex, 'waiting_answers')
    } catch (err) {
      console.error('Errore in advanceToNextBottleOrFinish:', err)
      setShowBottleTransition(false)
    }
  }, [sessionId, resetRoundState])

  // ── Realtime answer insert handler (consumed by useLiveRealtime) ───────────
  // NOTE: We intentionally ignore payload.new because Supabase RLS may strip it
  // for other players' rows. Re-fetch all answers from DB instead (same pattern
  // as the players channel), so roundAnswersByPlayer is always authoritative.
  //
  // NOTE: We use a server API route (/api/live/round-answers) instead of a
  // direct supabaseClient query. The live_round_answers RLS policies all call
  // auth.uid(), which hangs when createBrowserClient (from @supabase/ssr) has
  // not yet completed its GoTrueClient init. Tables with simple RLS (TRUE /
  // status IN (...)) work fine; tables using auth.uid() do not. The server
  // route bypasses RLS via the service-role key and always returns all answers.
  const handleAnswerInsert = useCallback(async () => {
    if (liveQuestions.length === 0) return
    const questionIds = liveQuestions.map((q) => q.id)
    try {
      const res = await fetch(`/api/live/round-answers?sessionId=${sessionId}`)
      if (!res.ok) return
      const {answers} = await res.json()
      if (!Array.isArray(answers)) return
      const rebuilt = {}
      answers
        .filter((a) => questionIds.includes(a.question_id))
        .forEach((a) => {
          if (!rebuilt[a.player_id]) rebuilt[a.player_id] = {}
          rebuilt[a.player_id][a.question_id] = {
            optionId: a.selected_option_id,
            isCorrect: a.is_correct,
            points: a.points,
          }
        })
      // Merge onto existing state instead of replacing.
      // This preserves optimistic local updates (from handleCheck) in case
      // the background POST /api/live/round-answer is still in flight or
      // temporarily failed. Without this, each poll would wipe the local
      // player's own answers, keeping allPlayersCompletedThisRound = false.
      setRoundAnswersByPlayer((prev) => {
        const merged = {...prev}
        Object.entries(rebuilt).forEach(([pid, qs]) => {
          merged[pid] = {...(merged[pid] || {}), ...qs}
        })
        return merged
      })
    } catch (_) {
      // Network error — retry on next poll
    }
  }, [sessionId, liveQuestions])

  // ── Re-sync answers while waiting for all players to complete ─────────────
  // Polls DB every 2s once the local player has marked ready and the round is
  // not yet complete. This is the authoritative fallback: it works whether or
  // not the live_players / live_round_answers Realtime channels are publishing.
  // The realtime-triggered paths (handleAnswerInsert / onPlayersUpdate) act as
  // a speed-up but are not required for correctness.
  // ── Poll answers when results screen is visible ───────────────────────────
  // This covers the host (who never sets clickedReady) and catches Realtime gaps.
  // Gates on resultsOpenedBottleIndex so it only runs while showing that screen.
  useEffect(() => {
    const onResultsScreen = resultsOpenedBottleIndex === currentBottleIndex
    if (!onResultsScreen || allPlayersCompletedThisRound) return
    handleAnswerInsert()
    const interval = setInterval(handleAnswerInsert, 2000)
    return () => clearInterval(interval)
  }, [
    resultsOpenedBottleIndex,
    currentBottleIndex,
    allPlayersCompletedThisRound,
    handleAnswerInsert,
  ])

  // ── Poll answers while waiting (guest path) ───────────────────────────────
  useEffect(() => {
    if (!clickedReady || allPlayersCompletedThisRound) return
    handleAnswerInsert()
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

  const persistAnswerWithRetry = useCallback(
    async ({questionId, selectedOptionId, isCorrect, points}) => {
      if (!playerData?.id) return true

      const saveKey = `${playerData.id}:${questionId}`
      const payload = {
        sessionId,
        playerId: playerData.id,
        questionId,
        selectedOptionId,
        isCorrect,
        points,
      }

      pendingAnswerSavesRef.current.set(saveKey, payload)

      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          const res = await fetch('/api/live/round-answer', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
          })

          if (res.ok) {
            pendingAnswerSavesRef.current.delete(saveKey)
            return true
          }

          const data = await res.json().catch(() => ({}))
          if (res.status === 403 && data?.error === 'Player not found in session') {
            pendingAnswerSavesRef.current.clear()
            if (typeof onPlayerRemoved === 'function') onPlayerRemoved()
            return false
          }
          if (data?.error) {
            console.error('Error saving answer:', data.error)
          }
        } catch (err) {
          console.error('Network error saving answer:', err)
        }

        const waitMs = 250 * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, waitMs))
      }

      return false
    },
    [onPlayerRemoved, sessionId, playerData?.id],
  )

  // Retry unsaved answers in the background. This is essential on unstable
  // mobile networks where the first POST may fail but the user proceeds anyway.
  useEffect(() => {
    if (pendingAnswerSavesRef.current.size === 0) return

    const flushPending = async () => {
      const pending = Array.from(pendingAnswerSavesRef.current.values())
      for (const answer of pending) {
        await persistAnswerWithRetry({
          questionId: answer.questionId,
          selectedOptionId: answer.selectedOptionId,
          isCorrect: answer.isCorrect,
          points: answer.points,
        })
      }
    }

    flushPending()
    const interval = setInterval(flushPending, 2000)
    return () => clearInterval(interval)
  }, [clickedReady, resultsOpenedBottleIndex, currentBottleIndex, persistAnswerWithRetry])

  const handleCheck = useCallback(
    async (questionId, optionId) => {
      if (!playerData || roundStatus !== 'waiting_answers') return
      if (checkedQuestions[questionId] || !optionId) return
      if (isCheckingAnswer) return

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

        // ── 1. Resolve correct option from server-preloaded cache ─────────────
        const resolvedCorrectOptionId = correctOptionByQuestion[questionId]

        // Answers not loaded yet (should be rare since page.js preloads them)
        if (!resolvedCorrectOptionId) {
          console.warn('Correct option not in cache for question', questionId)
          return
        }

        // ── 2. Compute result locally ──────────────────────────────────────────
        const isCorrect = resolvedCorrectOptionId === optionId
        const newCombo = isCorrect ? comboRef.current + 1 : 0
        const comboBonus = isCorrect && newCombo >= 2 ? Math.min(newCombo - 1, 3) * 5 : 0
        const points = isCorrect ? 10 + comboBonus : 0

        // ── 3. Apply UI feedback immediately (before any DB write) ─────────────
        applyLocalAnswerResult({isCorrect, points, comboBonus, newCombo})

        // ── 4. Persist via server route with retries ────────────────────────
        // Duplicate inserts (23505) are safe and handled server-side.
        await persistAnswerWithRetry({
          questionId,
          selectedOptionId: optionId,
          isCorrect,
          points,
        })
      } catch (err) {
        console.error('Error evaluating answer:', err?.message ?? err)
      } finally {
        setIsCheckingAnswer(false)
      }
    },
    [
      playerData,
      roundStatus,
      checkedQuestions,
      isCheckingAnswer,
      correctOptionByQuestion,
      sessionId,
      playSound,
      persistAnswerWithRetry,
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
      // Score sync is handled by /api/live/advance-bottle (called from BottleTransitionScreen)
      setResultsOpenedBottleIndex(null)
      setShowBottleTransition(true)
    } else {
      setPlayerMarkedNext(true)
    }
  }, [allPlayersCompletedThisRound, isHostUser])

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
    advanceToNextBottleOrFinish,
    // progress
    playersReadyCount,
    participantsCount: participantIds.length,
  }
}
