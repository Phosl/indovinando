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
import {useLanguage} from '@/components/i18n/LanguageProvider'

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
  const {lang} = useLanguage()
  const isEnglish = lang === 'en'

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const {audioEnabled, toggleAudio, playSound} = useGameAudio()

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

  const {playerData, resolvingPlayer, resolvePlayer, playerStorageKey, nicknameStorageKey} =
    usePlayerResolver({sessionId, userId, isHostUser})

  const currentBottle = liveBottles[currentBottleIndex]
  const isLastBottle = currentBottleIndex >= liveBottles.length - 1

  const {
    selectedAnswers,
    roundAnswers,
    roundAnswersByPlayer,
    correctOptionByQuestion,
    clickedReady,
    allPlayersCompletedThisRound,
    playerMarkedNext,
    resultsOpenedBottleIndex,
    setResultsOpenedBottleIndex,
    showBottleTransition,
    currentSlideIndex,
    checkedQuestions,
    slideMotion,
    comboCount,
    resetRoundState,
    handleAnswerInsert,
    handleSelect,
    handleCheck,
    handleContinue,
    handleNextBottleClick,
    syncScoresFromAnswers,
    advanceToNextBottleOrFinish,
    playersReadyCount,
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
        resetRoundState(
          updated?.current_question_index || 0,
          updated?.round_status || 'waiting_answers',
        )
      }
      if (updated?.round_status) setRoundStatus(updated.round_status)
    },
    onPlayersUpdate: setAllPlayers,
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
          <h2>{isEnglish ? '🎉 Game Over!' : '🎉 Gioco Terminato!'}</h2>
          <p>{isEnglish ? 'Redirecting to leaderboard...' : 'Redirezione alla classifica...'}</p>
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
          <h2>{isEnglish ? '👤 Participant not found' : '👤 Partecipante non trovato'}</h2>
          <p>
            {isEnglish
              ? 'Rejoin from the session entry page using your nickname.'
              : 'Rientra dalla pagina di accesso alla sessione con il tuo nickname.'}
          </p>
          <button
            className={styles.checkButton}
            onClick={() => router.push(`/live/session/${sessionId}`)}>
            {isEnglish ? 'Back to join' : 'Torna al join'}
          </button>
        </div>
      </div>
    )
  }

  if (!currentBottle || liveQuestions.length === 0) {
    return (
      <div className={styles.fullPage}>
        <div className={styles.centeredCard}>
          <h2>{isEnglish ? '🕒 Session not ready' : '🕒 Sessione non pronta'}</h2>
          <p>{isEnglish ? 'Wait for the game to start.' : "Attendi l'avvio del gioco."}</p>
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

  if (roundStatus === 'showing_results' && resultsOpenedBottleIndex !== currentBottleIndex) {
    return (
      <div className={styles.fullPage}>
        <TopBar {...topBarProps} />
        <div className={styles.slideContent}>
          <div className={styles.bottleBadge}>
            Bottle {currentBottleIndex + 1}/{liveBottles.length}
          </div>
          <h2 className={styles.waitTitle}>
            {isEnglish ? 'All answers are in' : 'Tutte le risposte sono arrivate'}
          </h2>
          <p className={styles.readyHint}>
            {isEnglish
              ? 'Open the bottle summary whenever you are ready.'
              : 'Quando vuoi, apri il riepilogo della bottiglia.'}
          </p>
        </div>
        <div className={styles.bottomPanel}>
          <button
            className={styles.continueButton}
            onClick={() => setResultsOpenedBottleIndex(currentBottleIndex)}>
            See results
          </button>
        </div>
        {overlays}
      </div>
    )
  }

  if (
    roundStatus === 'showing_results' ||
    (roundStatus === 'waiting_answers' &&
      clickedReady &&
      resultsOpenedBottleIndex === currentBottleIndex)
  ) {
    const title =
      roundStatus === 'showing_results'
        ? isEnglish
          ? 'Bottle complete!'
          : 'Bottiglia completata!'
        : isEnglish
          ? 'Bottle results'
          : 'Risultati bottiglia'
    const subtitle =
      roundStatus === 'showing_results'
        ? isLastBottle
          ? 'You will see the final leaderboard shortly.'
          : `Moving to bottle ${currentBottleIndex + 2}.`
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
        allPlayers={allPlayers}
        roundAnswersByPlayer={roundAnswersByPlayer}
        playersReadyCount={playersReadyCount}
        currentPlayerData={playerData}
        onNextBottle={handleNextBottleClick}
        onViewLeaderboard={
          isLastBottle
            ? async () => {
                if (isHostUser) {
                  try {
                    await syncScoresFromAnswers(roundAnswersByPlayer)
                    await advanceToNextBottleOrFinish()
                  } catch (err) {
                    console.error('Error finishing session:', err?.message ?? err)
                  }
                }
                router.push(`/live/session/${sessionId}/leaderboard`)
              }
            : () => router.push(`/live/session/${sessionId}/leaderboard`)
        }
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
      onSelect={handleSelect}
      onCheck={handleCheck}
      onContinue={handleContinue}
      topBar={<TopBar {...topBarProps} withProgress />}
      overlays={overlays}
    />
  )
}
