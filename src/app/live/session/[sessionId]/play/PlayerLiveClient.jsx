'use client'

import {useState, useEffect, useCallback, useMemo, useRef} from 'react'
import {useRouter} from 'next/navigation'
import Loader from '@/components/Loader'
import {supabaseClient} from '@/lib/supabaseClient'
import styles from './playerLive.module.scss'

import {useGameAudio} from './hooks/useGameAudio'
import {useLiveRealtime} from './hooks/useLiveRealtime'
import {usePlayerResolver} from './hooks/usePlayerResolver'
import {useGameDataLoader} from './hooks/useGameDataLoader'
import {useSessionAdvance} from './hooks/useSessionAdvance'
import {TopBar} from './components/TopBar'
import {GameOverlays} from './components/GameOverlays'
import {BottleTransitionScreen} from './components/BottleTransitionScreen'
import {ResultsScreen} from './components/ResultsScreen'
import {QuestionSlideScreen} from './components/QuestionSlideScreen'

export default function PlayerLiveClient({
  sessionId,
  questions,
  bottles,
  initialStatus,
  initialQuestionIndex,
  hostUserId,
  userId,
}) {
  const router = useRouter()
  const isHostUser = Boolean(userId && hostUserId && userId === hostUserId)

  // ── Audio ──────────────────────────────────────────────────────────────────
  const {audioEnabled, toggleAudio, playSound} = useGameAudio()
  const playedBottleSoundRef = useRef(null)

  // ── Game data & players ────────────────────────────────────────────────────
  const {
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
  } = useGameDataLoader({
    sessionId,
    initialQuestions: questions,
    initialBottles: bottles,
    initialStatus,
    initialQuestionIndex,
  })

  // ── Player identity ────────────────────────────────────────────────────────
  const {
    playerData,
    resolvingPlayer,
    resolvePlayer,
    playerStorageKey,
    nicknameStorageKey,
  } = usePlayerResolver({sessionId, userId, isHostUser})

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentBottle = liveBottles[currentBottleIndex]
  const isLastBottle = currentBottleIndex >= liveBottles.length - 1

  // ── Round state ────────────────────────────────────────────────────────────
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [roundAnswersByPlayer, setRoundAnswersByPlayer] = useState({})
  const [roundAnswers, setRoundAnswers] = useState({})
  const [correctOptionByQuestion, setCorrectOptionByQuestion] = useState({})
  const [clickedReady, setClickedReady] = useState(false)
  const [allPlayersCompletedThisRound, setAllPlayersCompletedThisRound] = useState(false)
  const [playerMarkedNext, setPlayerMarkedNext] = useState(false)
  const [resultsOpenedBottleIndex, setResultsOpenedBottleIndex] = useState(null)
  const [showBottleTransition, setShowBottleTransition] = useState(false)

  // ── Combo ──────────────────────────────────────────────────────────────────
  const [comboCount, setComboCount] = useState(0)
  const comboRef = useRef(0)

  // ── Slide navigation ───────────────────────────────────────────────────────
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [checkedQuestions, setCheckedQuestions] = useState({})
  const [slideMotion, setSlideMotion] = useState('idle')
  const slideTimerRef = useRef(null)
  const slideTransitionMs = 220

  // ── UI overlays ────────────────────────────────────────────────────────────
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [exitModalOpen, setExitModalOpen] = useState(false)

  // ── Cleanup slide timer on unmount ─────────────────────────────────────────
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
      const nextMap = {}
      ;(data || []).forEach((row) => {
        nextMap[row.question_id] = row.option_id
      })
      setCorrectOptionByQuestion(nextMap)
    }
    load()
  }, [currentBottle?.id])

  // ── Reset round state between bottles ─────────────────────────────────────
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

  // ── Realtime callbacks ─────────────────────────────────────────────────────
  const handleSessionUpdate = useCallback(
    (updated) => {
      if (updated?.status === 'finished') {
        setSessionFinished(true)
        setTimeout(() => router.push(`/live/session/${sessionId}/leaderboard`), 900)
      }
      if (updated?.current_question_index !== currentBottleIndex) {
        resetRoundState(
          updated?.current_question_index || 0,
          updated?.round_status || 'waiting_answers',
        )
      }
      if (updated?.round_status) setRoundStatus(updated.round_status)
    },
    [currentBottleIndex, resetRoundState, router, sessionId, setRoundStatus, setSessionFinished],
  )

  const handlePlayersUpdate = useCallback((players) => setAllPlayers(players), [setAllPlayers])

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

  useLiveRealtime({
    sessionId,
    playerData,
    currentBottleIndex,
    resolvePlayer,
    onSessionUpdate: handleSessionUpdate,
    onPlayersUpdate: handlePlayersUpdate,
    onAnswerInsert: handleAnswerInsert,
  })

  // ── Poll until all players have answered ───────────────────────────────────
  useEffect(() => {
    if (!clickedReady || liveQuestions.length === 0) {
      setAllPlayersCompletedThisRound(false)
      return
    }

    const questionIds = liveQuestions.map((q) => q.id)

    const checkAll = async () => {
      const [{data: session}, {data: players}, {data: answers}] = await Promise.all([
        supabaseClient
          .from('live_sessions')
          .select('current_question_index, round_status, status')
          .eq('id', sessionId)
          .maybeSingle(),
        supabaseClient
          .from('live_players')
          .select('id, nickname, avatar_id, total_score, updated_at, is_host')
          .eq('session_id', sessionId)
          .order('joined_at'),
        supabaseClient
          .from('live_round_answers')
          .select('player_id, question_id, selected_option_id, is_correct, points')
          .eq('session_id', sessionId)
          .in('question_id', questionIds),
      ])

      if (session?.status === 'finished') {
        setSessionFinished(true)
        router.push(`/live/session/${sessionId}/leaderboard`)
        return
      }

      if (session && session.current_question_index !== currentBottleIndex) {
        resetRoundState(session.current_question_index ?? 0, session.round_status || 'waiting_answers')
        return
      }

      if (players) setAllPlayers(players)

      if (answers) {
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

      const answerSet = new Set((answers || []).map((a) => `${a.player_id}:${a.question_id}`))
      const allDone =
        (players || []).length > 0 &&
        (players || []).every((p) => questionIds.every((qId) => answerSet.has(`${p.id}:${qId}`)))
      setAllPlayersCompletedThisRound(allDone)
    }

    checkAll()
    const interval = setInterval(checkAll, 2000)
    return () => clearInterval(interval)
  }, [
    clickedReady,
    sessionId,
    liveQuestions,
    currentBottleIndex,
    resetRoundState,
    router,
    setAllPlayers,
    setSessionFinished,
  ])

  // ── Session advance ────────────────────────────────────────────────────────
  const {syncScoresFromAnswers, advanceToNextBottleOrFinish} = useSessionAdvance({
    sessionId,
    currentBottleIndex,
    isLastBottle,
    isHostUser,
    resetRoundState,
    setShowBottleTransition,
  })

  // ── Answer handlers ────────────────────────────────────────────────────────
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

        setRoundAnswers((prev) => ({...prev, [questionId]: {optionId, isCorrect, points, comboBonus, newCombo}}))
        setRoundAnswersByPlayer((prev) => {
          const updated = {...prev}
          if (!updated[playerData.id]) updated[playerData.id] = {}
          updated[playerData.id] = {...updated[playerData.id], [questionId]: {optionId, isCorrect, points}}
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
        slideTimerRef.current = setTimeout(() => setSlideMotion('idle'), slideTransitionMs)
      }, slideTransitionMs)
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
  }, [currentSlideIndex, liveQuestions.length, playerData, clickedReady, slideMotion, currentBottleIndex])

  const handleNextBottleClick = async () => {
    if (!allPlayersCompletedThisRound) return
    if (isHostUser) {
      await syncScoresFromAnswers(roundAnswersByPlayer)
      setResultsOpenedBottleIndex(null)
      setShowBottleTransition(true)
    } else {
      setPlayerMarkedNext(true)
    }
  }

  const handleOpenLeaderboard = useCallback(async () => {
    setLeaderboardOpen(true)
    const {data} = await supabaseClient
      .from('live_players')
      .select('id, nickname, avatar_id, total_score, updated_at, is_host')
      .eq('session_id', sessionId)
      .order('joined_at')
    if (data) setAllPlayers(data)
  }, [sessionId, setAllPlayers])

  const handleExitGame = useCallback(() => {
    localStorage.removeItem(playerStorageKey)
    localStorage.removeItem(nicknameStorageKey)
    setExitModalOpen(false)
    const shouldGoDashboard = isHostUser || Boolean(playerData?.is_host)
    router.push(shouldGoDashboard ? '/dashboard' : `/live/session/${sessionId}`)
  }, [isHostUser, nicknameStorageKey, playerData, playerStorageKey, router, sessionId])

  // ── Sorted leaderboard (memoised) ─────────────────────────────────────────
  const sortedLeaderboard = useMemo(
    () => [...allPlayers].sort((a, b) => (b.total_score || 0) - (a.total_score || 0)),
    [allPlayers],
  )

  // ── Shared render atoms ────────────────────────────────────────────────────
  const overlays = (
    <GameOverlays
      leaderboardOpen={leaderboardOpen}
      exitModalOpen={exitModalOpen}
      sortedLeaderboard={sortedLeaderboard}
      playerData={playerData}
      onCloseLeaderboard={() => setLeaderboardOpen(false)}
      onCloseExit={() => setExitModalOpen(false)}
      onExitGame={handleExitGame}
    />
  )

  // TopBar props shared across all screens
  const topBarProps = playerData
    ? {
        playerData,
        liveQuestions,
        currentSlideIndex,
        audioEnabled,
        onToggleAudio: toggleAudio,
        onOpenLeaderboard: handleOpenLeaderboard,
        onOpenExit: () => {
          setLeaderboardOpen(false)
          setExitModalOpen(true)
        },
      }
    : null

  // ── Loading / error guards ─────────────────────────────────────────────────
  if (sessionFinished) {
    return (
      <div className={styles.fullPage}>
        <div className={styles.centeredCard}>
          <h2>🎉 Gioco Terminato!</h2>
          <p>Redirezione alla classifica...</p>
        </div>
      </div>
    )
  }

  if (resolvingPlayer || loadingGameData) {
    return (
      <div className={styles.fullPage}>
        <Loader label="Caricamento partita" />
      </div>
    )
  }

  if (!playerData) {
    return (
      <div className={styles.fullPage}>
        <div className={styles.centeredCard}>
          <h2>👤 Partecipante non trovato</h2>
          <p>Rientra dalla pagina di accesso alla sessione con il tuo nickname.</p>
          <button
            className={styles.checkButton}
            onClick={() => router.push(`/live/session/${sessionId}`)}>
            Torna al Join
          </button>
        </div>
      </div>
    )
  }

  if (!currentBottle || liveQuestions.length === 0) {
    return (
      <div className={styles.fullPage}>
        <div className={styles.centeredCard}>
          <h2>🕒 Sessione non pronta</h2>
          <p>Attendi l&apos;avvio del gioco.</p>
        </div>
      </div>
    )
  }

  // ── Screens ────────────────────────────────────────────────────────────────

  if (showBottleTransition) {
    return (
      <BottleTransitionScreen
        currentBottleIndex={currentBottleIndex}
        totalBottles={liveBottles.length}
        isHostUser={isHostUser}
        isLastNextBottle={currentBottleIndex + 2 > liveBottles.length}
        onAdvance={advanceToNextBottleOrFinish}
        onViewLeaderboard={() => router.push(`/live/session/${sessionId}/leaderboard`)}
        topBar={<TopBar {...topBarProps} />}
        overlays={overlays}
      />
    )
  }

  // Prompt to open the results panel
  if (roundStatus === 'showing_results' && resultsOpenedBottleIndex !== currentBottleIndex) {
    return (
      <div className={styles.fullPage}>
        <TopBar {...topBarProps} />
        <div className={styles.slideContent}>
          <div className={styles.bottleBadge}>
            Bottiglia {currentBottleIndex + 1}/{liveBottles.length}
          </div>
          <h2 className={styles.waitTitle}>Tutte le risposte sono arrivate</h2>
          <p className={styles.readyHint}>Quando vuoi, apri il riepilogo della bottiglia.</p>
        </div>
        <div className={styles.bottomPanel}>
          <button
            className={styles.continueButton}
            onClick={() => setResultsOpenedBottleIndex(currentBottleIndex)}>
            Vedi risultati
          </button>
        </div>
        {overlays}
      </div>
    )
  }

  // Full results (after showing_results OR player marked ready)
  if (
    roundStatus === 'showing_results' ||
    (roundStatus === 'waiting_answers' &&
      clickedReady &&
      resultsOpenedBottleIndex === currentBottleIndex)
  ) {
    const title = roundStatus === 'showing_results' ? 'Bottiglia completata!' : 'Risultati bottiglia'
    const subtitle =
      roundStatus === 'showing_results'
        ? isLastBottle
          ? 'Tra poco vedrai la classifica finale.'
          : `Passiamo alla bottiglia ${currentBottleIndex + 2}.`
        : null

    return (
      <ResultsScreen
        title={title}
        subtitle={subtitle}
        currentBottle={currentBottle}
        currentBottleIndex={currentBottleIndex}
        totalBottles={liveBottles.length}
        questions={liveQuestions}
        roundAnswers={roundAnswers}
        correctOptionByQuestion={correctOptionByQuestion}
        isLastBottle={isLastBottle}
        allPlayersCompletedThisRound={allPlayersCompletedThisRound}
        isHostUser={isHostUser}
        playerMarkedNext={playerMarkedNext}
        onNextBottle={handleNextBottleClick}
        onViewLeaderboard={() => router.push(`/live/session/${sessionId}/leaderboard`)}
        topBar={<TopBar {...topBarProps} />}
        overlays={overlays}
      />
    )
  }

  // Main question slide
  const currentQuestion = liveQuestions[currentSlideIndex]
  const isLastSlide = currentSlideIndex >= liveQuestions.length - 1
  const slideMotionClass =
    slideMotion === 'exiting'
      ? styles.slideExitLeft
      : slideMotion === 'entering'
        ? styles.slideEnterRight
        : ''

  return (
    <QuestionSlideScreen
      currentQuestion={currentQuestion}
      currentBottleIndex={currentBottleIndex}
      totalBottles={liveBottles.length}
      currentSlideIndex={currentSlideIndex}
      totalSlides={liveQuestions.length}
      slideMotionClass={slideMotionClass}
      isChecked={Boolean(checkedQuestions[currentQuestion?.id])}
      isSlideTransitioning={slideMotion !== 'idle'}
      selectedOption={selectedAnswers[currentQuestion?.id]}
      checkResult={roundAnswers[currentQuestion?.id]}
      correctOptionByQuestion={correctOptionByQuestion}
      clickedReady={clickedReady}
      isLastSlide={isLastSlide}
      onSelect={handleSelect}
      onCheck={handleCheck}
      onContinue={handleContinue}
      topBar={<TopBar {...topBarProps} withProgress />}
      overlays={overlays}
    />
  )
}
