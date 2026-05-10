'use client'

import {useRouter} from 'next/navigation'
import Loader from '@/components/Loader'
import styles from './playerLive.module.scss'

import {useGameAudio} from './hooks/useGameAudio'
import {useLiveRealtime} from './hooks/useLiveRealtime'
import {usePlayerResolver} from './hooks/usePlayerResolver'
import {useGameDataLoader} from './hooks/useGameDataLoader'
import {useRoundPlay} from './hooks/useRoundPlay'
import {useOverlays} from './hooks/useOverlays'
import {TopBar} from './components/TopBar'
import {GameOverlays} from './components/GameOverlays'
import {BottleTransitionScreen} from './components/BottleTransitionScreen'
import {ResultsScreen} from './components/ResultsScreen'
import {QuestionSlideScreen} from './components/QuestionSlideScreen'
import {useT} from '@/lib/i18n/useT'

export default function PlayerLiveClient({
  sessionId,
  questions,
  bottles,
  initialStatus,
  initialQuestionIndex,
  initialUpdatedAt,
  hostUserId,
  userId,
  initialPlayerData,
}) {
  const router = useRouter()
  const isHostUser = Boolean(userId && hostUserId && userId === hostUserId)
  const t = useT('live.playerLive')

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const {audioEnabled, toggleAudio, playSound} = useGameAudio()

  const {
    playerData,
    setPlayerData,
    resolvingPlayer,
    resolvePlayer,
    playerStorageKey,
    nicknameStorageKey,
  } = usePlayerResolver({
    sessionId,
    userId,
    isHostUser,
    initialPlayerData,
  })

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
    roundAnchorAt,
    setRoundAnchorAt,
  } = useGameDataLoader({
    sessionId,
    initialQuestions: questions,
    initialBottles: bottles,
    initialStatus,
    initialQuestionIndex,
    initialUpdatedAt,
  })

  const currentBottle = liveBottles?.[currentBottleIndex] || null
  const isLastBottle = currentBottleIndex === (liveBottles?.length || 0) - 1

  const {
    currentSlideIndex,
    checkedQuestions,
    isCheckingAnswer,
    correctOptionByQuestion,
    roundAnswers,
    roundAnswersByPlayer,
    selectedAnswers,
    comboCount,
    clickedReady,
    allPlayersCompletedThisRound,
    playerMarkedNext,
    resultsOpenedBottleIndex,
    setResultsOpenedBottleIndex,
    showBottleTransition,
    setShowBottleTransition,
    slideMotion,
    resetRoundState,
    handleSelect,
    handleCheck,
    handleContinue,
    handleNextBottleClick,
    handleAnswerInsert,
    playersReadyCount,
    participantsCount,
  } = useRoundPlay({
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
    setCurrentBottleIndex,
    setRoundStatus,
    setAllPlayers,
    playSound,
  })

  const {
    leaderboardOpen,
    setLeaderboardOpen,
    exitModalOpen,
    setExitModalOpen,
    sortedLeaderboard,
    openLeaderboard,
    kickPlayer,
    openExit,
    exitGame,
  } = useOverlays({
    sessionId,
    playerData,
    allPlayers,
    roundAnswersByPlayer,
    roundStatus,
    setAllPlayers,
    isHostUser,
    playerStorageKey,
    nicknameStorageKey,
  })

  useLiveRealtime({
    sessionId,
    playerData,
    resolvePlayer,
    onSessionUpdate: (updated) => {
      if (updated?.status === 'finished') {
        setSessionFinished(true)
        setTimeout(() => router.push(`/live/session/${sessionId}/leaderboard`), 900)
      }
      if (updated?.current_question_index !== currentBottleIndex) {
        setRoundAnchorAt(updated?.updated_at || new Date().toISOString())
        resetRoundState(
          updated?.current_question_index || 0,
          updated?.round_status || 'waiting_answers',
        )
      }
      if (updated?.round_status) setRoundStatus(updated.round_status)
    },
    onPlayersUpdate: (incomingPlayers) => {
      setAllPlayers((prevPlayers) => {
        if (incomingPlayers?.length) return incomingPlayers
        return prevPlayers
      })
    },
    onAnswerInsert: handleAnswerInsert,
  })

  // ── Shared UI atoms ────────────────────────────────────────────────────────
  const topBarProps = playerData
    ? {
        playerData,
        liveQuestions,
        currentSlideIndex,
        audioEnabled,
        onToggleAudio: toggleAudio,
        onOpenLeaderboard: openLeaderboard,
        onOpenExit: openExit,
      }
    : null

  const overlays = playerData ? (
    <GameOverlays
      leaderboardOpen={leaderboardOpen}
      exitModalOpen={exitModalOpen}
      sortedLeaderboard={sortedLeaderboard}
      playerData={playerData}
      isHostUser={isHostUser}
      onKickPlayer={kickPlayer}
      onCloseLeaderboard={() => setLeaderboardOpen(false)}
      onCloseExit={() => setExitModalOpen(false)}
      onExitGame={exitGame}
    />
  ) : null

  // ── Loading / error guards ─────────────────────────────────────────────────
  if (sessionFinished) {
    return (
      <div className={styles.fullPage}>
        <div className={styles.centeredCard}>
          <h2>{t('gameOverTitle')}</h2>
          <p>{t('redirecting')}</p>
        </div>
      </div>
    )
  }

  if (resolvingPlayer || loadingGameData) {
    return (
      <div className={styles.fullPage}>
        <Loader label="Loading game" />
      </div>
    )
  }

  if (!playerData) {
    return (
      <div className={styles.fullPage}>
        <div className={styles.centeredCard}>
          <h2>{t('participantNotFound')}</h2>
          <p>{t('participantNotFoundDesc')}</p>
          <button
            className={styles.checkButton}
            onClick={() => router.push(`/live/session/${sessionId}`)}>
            {t('backToJoin')}
          </button>
        </div>
      </div>
    )
  }

  if (!currentBottle || liveQuestions.length === 0) {
    return (
      <div className={styles.fullPage}>
        <div className={styles.centeredCard}>
          <h2>{t('sessionNotReadyTitle')}</h2>
          <p>{t('sessionNotReadyDesc')}</p>
        </div>
      </div>
    )
  }

  // ── Shared results title/subtitle ──────────────────────────────────────────
  const resultsTitle = roundStatus === 'showing_results' ? t('bottleComplete') : t('bottleResults')
  const resultsSubtitle =
    roundStatus === 'showing_results'
      ? isLastBottle
        ? t('finalLeaderboardSoon')
        : t('movingToBottle', {index: currentBottleIndex + 2})
      : null

  const navigateToLeaderboard = async () => {
    // Server-side guard: leaderboard is available only after all players complete the round.
    setSessionFinished(true)
    try {
      const response = await fetch('/api/live/session/finish', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sessionId}),
      })
      if (!response.ok) {
        setSessionFinished(false)
        return
      }
    } catch (_) {
      setSessionFinished(false)
      return
    }
    router.push(`/live/session/${sessionId}/leaderboard`)
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

  if (roundStatus === 'showing_results' && resultsOpenedBottleIndex !== currentBottleIndex) {
    return (
      <ResultsScreen
        title={resultsTitle}
        subtitle={resultsSubtitle}
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
        allPlayers={allPlayers}
        roundAnswersByPlayer={roundAnswersByPlayer}
        playersReadyCount={playersReadyCount}
        participantsCount={participantsCount}
        currentPlayerData={playerData}
        onNextBottle={handleNextBottleClick}
        onViewLeaderboard={navigateToLeaderboard}
        topBar={<TopBar {...topBarProps} />}
        overlays={overlays}
      />
    )
  }

  if (
    roundStatus === 'showing_results' ||
    (roundStatus === 'waiting_answers' &&
      clickedReady &&
      resultsOpenedBottleIndex === currentBottleIndex)
  ) {
    return (
      <ResultsScreen
        title={resultsTitle}
        subtitle={resultsSubtitle}
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
        allPlayers={allPlayers}
        roundAnswersByPlayer={roundAnswersByPlayer}
        playersReadyCount={playersReadyCount}
        participantsCount={participantsCount}
        currentPlayerData={playerData}
        onNextBottle={handleNextBottleClick}
        onViewLeaderboard={navigateToLeaderboard}
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
      comboCount={comboCount}
      isCheckingAnswer={isCheckingAnswer}
      onSelect={handleSelect}
      onCheck={handleCheck}
      onContinue={handleContinue}
      topBar={<TopBar {...topBarProps} withProgress />}
      overlays={overlays}
    />
  )
}
