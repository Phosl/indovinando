'use client'

import {useEffect, useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import Icon from '@/components/Icon'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {useT} from '@/lib/i18n/useT'
import {getQuickTemplateQuestions} from '@/app/game/create/autoTastingHelpers'
import {QuestionSlideScreen} from '@/app/live/session/[sessionId]/play/components/QuestionSlideScreen'
import {ResultsScreen} from '@/app/live/session/[sessionId]/play/components/ResultsScreen'
import {TopBar as LiveTopBar} from '@/app/live/session/[sessionId]/play/components/TopBar'
import {GameOverlays} from '@/app/live/session/[sessionId]/play/components/GameOverlays'
import {useGameAudio} from '@/app/live/session/[sessionId]/play/hooks/useGameAudio'
import liveStyles from '@/app/live/session/[sessionId]/play/playerLive.module.scss'
import styles from './demo.module.scss'

const POINTS_PER_ANSWER = 10
const CORRECT_OPTION_INDEX_BY_QUESTION = {
  'quick-country': 0,
  'quick-region': 0,
  'quick-grape': 1,
  'quick-vintage': 4,
  'quick-price': 2,
}
const DEMO_OPPONENTS = [
  {
    id: 'demo-luca',
    nickname: 'Luca',
    avatar_id: 2,
    total_score: 40,
    scoreSteps: [10, 10, 20, 30, 30, 40],
  },
  {
    id: 'demo-giulia',
    nickname: 'Giulia',
    avatar_id: 3,
    total_score: 30,
    scoreSteps: [0, 10, 20, 20, 20, 30],
  },
  {
    id: 'demo-marco',
    nickname: 'Marco',
    avatar_id: 4,
    total_score: 30,
    scoreSteps: [10, 10, 10, 20, 20, 30],
  },
  {
    id: 'demo-sara',
    nickname: 'Sara',
    avatar_id: 5,
    total_score: 20,
    scoreSteps: [0, 0, 10, 10, 10, 20],
  },
  {
    id: 'demo-anna',
    nickname: 'Anna',
    avatar_id: 6,
    total_score: 10,
    scoreSteps: [0, 0, 0, 10, 10, 10],
  },
]

function emptyOpponentScores() {
  return Object.fromEntries(DEMO_OPPONENTS.map((player) => [player.id, 0]))
}

export default function DemoGameClient() {
  const router = useRouter()
  const t = useT('demo')
  const gameCreateT = useT('gameCreate')
  const {lang} = useLanguage()
  const questions = useMemo(() => {
    return getQuickTemplateQuestions(gameCreateT, lang).map((question) => {
      const gameQuestionOptions = question.options.map((option, optionIndex) => ({
        id: `${question.id}-option-${optionIndex}`,
        text: option,
        option_order: optionIndex,
      }))
      const isNeutral = question.isNeutral === true || question.kind === 'rating'
      const correctOptionIndex = CORRECT_OPTION_INDEX_BY_QUESTION[question.id]

      return {
        ...question,
        text: `${t('tastingClue')}\n${question.text}`,
        is_neutral: isNeutral,
        game_question_options: gameQuestionOptions,
        correctId:
          !isNeutral && Number.isInteger(correctOptionIndex)
            ? gameQuestionOptions[correctOptionIndex]?.id || null
            : null,
      }
    })
  }, [gameCreateT, lang, t])
  const correctOptionByQuestion = useMemo(
    () =>
      Object.fromEntries(
        questions.filter((question) => question.correctId).map((question) => [question.id, question.correctId]),
      ),
    [questions],
  )
  const playerData = useMemo(
    () => ({id: 'demo-player', nickname: t('playerName'), avatar_id: 1, total_score: 0}),
    [t],
  )
  const [screen, setScreen] = useState('intro')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState('')
  const [answers, setAnswers] = useState({})
  const [checkResult, setCheckResult] = useState(null)
  const [isChecked, setIsChecked] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [exitModalOpen, setExitModalOpen] = useState(false)
  const [opponentScores, setOpponentScores] = useState(emptyOpponentScores)
  const {audioEnabled, toggleAudio, playSound} = useGameAudio()

  const currentQuestion = questions[questionIndex]
  const correctAnswers = Object.values(answers).filter((answer) => answer.isCorrect).length
  const objectiveQuestionCount = questions.filter((question) => !question.is_neutral).length
  const demoPlayers = useMemo(() => [playerData, ...DEMO_OPPONENTS], [playerData])
  const answersByPlayer = useMemo(
    () =>
      Object.fromEntries(
        demoPlayers.map((player) => [player.id, player.id === playerData.id ? answers : {}]),
      ),
    [answers, demoPlayers, playerData.id],
  )
  const liveLeaderboard = useMemo(() => {
    const playerScore = Object.values(answers).reduce(
      (total, answer) => total + Number(answer.points || 0) + Number(answer.comboBonus || 0),
      0,
    )
    const playerRoundPoints = currentQuestion ? Number(answers[currentQuestion.id]?.points || 0) : 0
    const opponentRows = DEMO_OPPONENTS.map((player) => {
      const currentScore = screen === 'results' ? player.total_score : opponentScores[player.id] || 0
      const previousScore = questionIndex > 0 ? player.scoreSteps[questionIndex - 1] || 0 : 0
      return {
        ...player,
        liveTotalScore: currentScore,
        roundPoints: Math.max(0, currentScore - previousScore),
      }
    })

    return [
      {
        ...playerData,
        liveTotalScore: playerScore,
        roundPoints: screen === 'playing' ? playerRoundPoints : 0,
      },
      ...opponentRows,
    ].sort(
      (firstPlayer, secondPlayer) =>
        secondPlayer.liveTotalScore - firstPlayer.liveTotalScore ||
        firstPlayer.nickname.localeCompare(secondPlayer.nickname),
    )
  }, [answers, currentQuestion, opponentScores, playerData, questionIndex, screen])

  useEffect(() => {
    if (screen !== 'playing') return undefined

    const timers = DEMO_OPPONENTS.map((player, playerIndex) =>
      window.setTimeout(
        () => {
          setOpponentScores((currentScores) => ({
            ...currentScores,
            [player.id]: player.scoreSteps[questionIndex] ?? player.total_score,
          }))
        },
        550 + playerIndex * 280,
      ),
    )

    return () => timers.forEach((timerId) => window.clearTimeout(timerId))
  }, [questionIndex, screen])

  const startDemo = () => {
    setScreen('playing')
    setQuestionIndex(0)
    setSelectedOption('')
    setAnswers({})
    setCheckResult(null)
    setIsChecked(false)
    setLeaderboardOpen(false)
    setExitModalOpen(false)
    setOpponentScores(emptyOpponentScores())
  }

  const selectOption = (questionId, optionId) => {
    if (questionId !== currentQuestion?.id || isChecked) return
    setSelectedOption(optionId)
  }

  const checkAnswer = (questionId, optionId) => {
    if (!optionId || questionId !== currentQuestion?.id || isChecked) return
    const isNeutral = currentQuestion.is_neutral === true
    const isCorrect = isNeutral ? null : correctOptionByQuestion[questionId] === optionId
    const answer = {
      optionId,
      isCorrect,
      points: isCorrect ? POINTS_PER_ANSWER : 0,
      comboBonus: 0,
      newCombo: 0,
    }

    setAnswers((currentAnswers) => ({...currentAnswers, [questionId]: answer}))
    setCheckResult(answer)
    setIsChecked(true)
    if (isCorrect === true) playSound('correct')
    else if (isCorrect === false) playSound('wrong')
  }

  const continueDemo = () => {
    if (questionIndex >= questions.length - 1) {
      playSound('bottleCompleted')
      setScreen('results')
      return
    }

    setQuestionIndex((currentIndex) => currentIndex + 1)
    setSelectedOption('')
    setCheckResult(null)
    setIsChecked(false)
  }

  const topBar = (
    <LiveTopBar
      playerData={playerData}
      audioEnabled={audioEnabled}
      onToggleAudio={toggleAudio}
      onOpenLeaderboard={() => setLeaderboardOpen(true)}
      onOpenExit={() => setExitModalOpen(true)}
    />
  )
  const overlays = (
    <GameOverlays
      leaderboardOpen={leaderboardOpen}
      exitModalOpen={exitModalOpen}
      sortedLeaderboard={liveLeaderboard}
      isLoadingStandings={false}
      playerData={playerData}
      isHostUser={false}
      onKickPlayer={() => {}}
      onCloseLeaderboard={() => setLeaderboardOpen(false)}
      onCloseExit={() => setExitModalOpen(false)}
      onExitGame={() => router.push('/')}
    />
  )

  if (screen === 'playing' && currentQuestion) {
    return (
      <QuestionSlideScreen
        currentQuestion={currentQuestion}
        currentBottleIndex={0}
        totalBottles={1}
        currentSlideIndex={questionIndex}
        totalSlides={questions.length}
        slideMotionClass=""
        isChecked={isChecked}
        isSlideTransitioning={false}
        selectedOption={selectedOption}
        checkResult={checkResult}
        correctOptionByQuestion={correctOptionByQuestion}
        shouldRevealAnswersInstantly
        clickedReady={false}
        isLastSlide={questionIndex === questions.length - 1}
        comboCount={0}
        isCheckingAnswer={false}
        finalRevealLabel={t('playing.showResult')}
        confirmLabel={t('playing.confirm')}
        onSelect={selectOption}
        onCheck={checkAnswer}
        onConfirmAndContinue={checkAnswer}
        onContinue={continueDemo}
        topBar={topBar}
        overlays={overlays}
      />
    )
  }

  if (screen === 'results') {
    return (
      <ResultsScreen
        sessionId="demo"
        title={
          correctAnswers === objectiveQuestionCount ? t('result.perfectTitle') : t('result.title')
        }
        subtitle={t('result.description')}
        currentBottle={{
          name: t('result.wineName'),
          producer: t('result.wineDetails'),
          year: null,
        }}
        currentBottleIndex={0}
        totalBottles={1}
        questions={questions}
        roundAnswers={answers}
        correctOptionByQuestion={correctOptionByQuestion}
        isLastBottle
        allPlayersCompletedThisRound
        isHostUser
        playerMarkedNext={false}
        allPlayers={demoPlayers}
        roundAnswersByPlayer={answersByPlayer}
        playersReadyCount={demoPlayers.length}
        participantsCount={demoPlayers.length}
        currentPlayerData={playerData}
        onNextBottle={() => {}}
        onViewLeaderboard={() => router.push('/auth?next=/game/create')}
        standingsPollingEnabled={false}
        finalActionLabel={t('result.primaryCta')}
        secondaryActionLabel={t('result.replay')}
        onSecondaryAction={startDemo}
        topBar={topBar}
        overlays={overlays}
      />
    )
  }

  return (
    <main className={liveStyles.fullPage}>
      {topBar}
      <div className={`${liveStyles.slideContent} ${liveStyles.centeredCard} ${styles.introContent}`}>
        <span className={styles.eyebrow}>{t('intro.eyebrow')}</span>
        <div className={styles.introIcon} aria-hidden="true">
          <Icon name="tasting" size={48} />
        </div>
        <h1>{t('intro.title')}</h1>
        <p className={styles.lead}>{t('intro.description')}</p>
        <div className={styles.quickFacts}>
          <span>{t('intro.duration')}</span>
          <span>{t('intro.noAccount')}</span>
          <span>{t('intro.questions')}</span>
        </div>
        <div className={styles.demoNotice}>
          <Icon name="question" size={24} />
          <p>{t('intro.notice')}</p>
        </div>
      </div>
      {overlays}
      <div className={liveStyles.bottomPanel}>
        <button type="button" className={liveStyles.continueButton} onClick={startDemo}>
          {t('intro.start')}
        </button>
      </div>
    </main>
  )
}
