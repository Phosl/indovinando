'use client'

import {useState, useEffect, useCallback, useMemo, useRef} from 'react'
import {useRouter} from 'next/navigation'
import Loader from '@/components/Loader'
import {supabaseClient} from '@/lib/supabaseClient'
import styles from './playerLive.module.scss'

import {useGameAudio} from './hooks/useGameAudio'
import {useLiveRealtime} from './hooks/useLiveRealtime'
import {GameOverlays} from './components/GameOverlays'
import {BottleTransitionScreen} from './components/BottleTransitionScreen'
import {ResultsScreen} from './components/ResultsScreen'
import {QuestionSlideScreen} from './components/QuestionSlideScreen'

const APPLE_AVATARS = ['👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀', '🧑‍🍳', '👨‍⚕️']

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

  // ── Game data ──────────────────────────────────────────────────────────────
  const [liveQuestions, setLiveQuestions] = useState(questions || [])
  const [liveBottles, setLiveBottles] = useState(bottles || [])
  const [currentBottleIndex, setCurrentBottleIndex] = useState(initialQuestionIndex)
  const [roundStatus, setRoundStatus] = useState(initialStatus)
  const [loadingGameData, setLoadingGameData] = useState((questions || []).length === 0)

  // ── Player ─────────────────────────────────────────────────────────────────
  const [playerData, setPlayerData] = useState(null)
  const [resolvingPlayer, setResolvingPlayer] = useState(true)
  const [allPlayers, setAllPlayers] = useState([])
  const playerStorageKey = `live_player_id_${sessionId}`
  const nicknameStorageKey = `live_player_nickname_${sessionId}`

  // ── Session ────────────────────────────────────────────────────────────────
  const [sessionFinished, setSessionFinished] = useState(false)

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

  // ── Audio ──────────────────────────────────────────────────────────────────
  const {audioEnabled, toggleAudio, playSound} = useGameAudio()
  const playedBottleSoundRef = useRef(null)

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentBottle = liveBottles[currentBottleIndex]
  const isLastBottle = currentBottleIndex >= liveBottles.length - 1

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

  // ── Load players on mount ──────────────────────────────────────────────────
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

  // ── Bootstrap game data when not pre-loaded ────────────────────────────────
  useEffect(() => {
    const bootstrapGameData = async () => {
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
          .select(`id, text, display_order, game_question_options (id, text, option_order)`)
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

    bootstrapGameData()
  }, [liveQuestions.length, sessionId])

  // ── Resolve current player from localStorage / DB ──────────────────────────
  const resolvePlayer = useCallback(async () => {
    const storedPlayerId = localStorage.getItem(playerStorageKey)
    const storedNickname = localStorage.getItem(nicknameStorageKey)

    if (storedPlayerId) {
      const {data: byId} = await supabaseClient
        .from('live_players')
        .select('id, nickname, avatar_id, user_id')
        .eq('id', storedPlayerId)
        .eq('session_id', sessionId)
        .maybeSingle()

      if (byId) {
        if (userId && !byId.user_id) {
          await supabaseClient.from('live_players').update({user_id: userId}).eq('id', byId.id)
          byId.user_id = userId
        }
        localStorage.setItem(nicknameStorageKey, byId.nickname)
        setPlayerData(byId)
        setResolvingPlayer(false)
        return
      }
    }

    if (userId) {
      const {data: byUser} = await supabaseClient
        .from('live_players')
        .select('id, nickname, avatar_id, user_id, is_host')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      if (byUser) {
        localStorage.setItem(playerStorageKey, byUser.id)
        localStorage.setItem(nicknameStorageKey, byUser.nickname)
        setPlayerData(byUser)
        setResolvingPlayer(false)
        return
      }
    }

    if (storedNickname) {
      const {data: byNickname} = await supabaseClient
        .from('live_players')
        .select('id, nickname, avatar_id, user_id, is_host')
        .eq('session_id', sessionId)
        .eq('nickname', storedNickname)
        .order('joined_at', {ascending: false})
        .limit(1)
        .maybeSingle()

      if (byNickname) {
        if (userId && !byNickname.user_id) {
          await supabaseClient
            .from('live_players')
            .update({user_id: userId})
            .eq('id', byNickname.id)
          byNickname.user_id = userId
        }
        localStorage.setItem(playerStorageKey, byNickname.id)
        setPlayerData(byNickname)
      }
    }

    if (isHostUser) {
      const {data: created, error: createErr} = await supabaseClient
        .from('live_players')
        .insert({session_id: sessionId, nickname: 'Host', avatar_id: 1, user_id: userId, is_host: true})
        .select('id, nickname, avatar_id, user_id, is_host')
        .maybeSingle()

      if (!createErr && created) {
        localStorage.setItem(playerStorageKey, created.id)
        localStorage.setItem(nicknameStorageKey, created.nickname)
        setPlayerData(created)
      }
    }

    setResolvingPlayer(false)
  }, [isHostUser, nicknameStorageKey, playerStorageKey, sessionId, userId])

  useEffect(() => {
    resolvePlayer()
  }, [resolvePlayer])

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

  // ── Helper to reset round state between bottles ────────────────────────────
  const resetRoundState = useCallback((nextIndex, nextRoundStatus) => {
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
  }, [])

  // ── Realtime callbacks ─────────────────────────────────────────────────────
  const handleSessionUpdate = useCallback(
    (updated) => {
      if (updated?.status === 'finished') {
        setSessionFinished(true)
        setTimeout(() => router.push(`/live/session/${sessionId}/leaderboard`), 900)
      }
      if (updated?.current_question_index !== currentBottleIndex) {
        resetRoundState(updated?.current_question_index || 0, updated?.round_status || 'waiting_answers')
      }
      if (updated?.round_status) {
        setRoundStatus(updated.round_status)
      }
    },
    [currentBottleIndex, resetRoundState, router, sessionId],
  )

  const handlePlayersUpdate = useCallback((players) => setAllPlayers(players), [])

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

  // ── Poll for all-players-done after player marks ready ─────────────────────
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
  }, [clickedReady, sessionId, liveQuestions, currentBottleIndex, resetRoundState, router])

  // ── Score sync (host only) ─────────────────────────────────────────────────
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

  // ── Advance to next bottle or finish session ───────────────────────────────
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

  const handleContinue = useCallback(
    async (questionId) => {
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
    },
    [currentSlideIndex, liveQuestions.length, playerData, clickedReady, slideMotion, currentBottleIndex],
  )

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
  }, [sessionId])

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

  // ── Shared UI atoms ────────────────────────────────────────────────────────
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

  const renderTopActions = () => (
    <div className={styles.topActions}>
      <button className={styles.audioButton} onClick={toggleAudio}>
        {audioEnabled ? '🔊 ON' : '🔇 OFF'}
      </button>
      <button className={styles.leaderboardButton} onClick={handleOpenLeaderboard}>
        Classifica
      </button>
      <button
        className={styles.exitButton}
        onClick={() => {
          setLeaderboardOpen(false)
          setExitModalOpen(true)
        }}
        aria-label="Esci dal gioco">
        X
      </button>
    </div>
  )

  const renderTopBar = ({withProgress = false} = {}) => (
    <div className={styles.topBar}>
      <div className={styles.playerInfo}>
        <span className={styles.avatar}>{APPLE_AVATARS[playerData.avatar_id - 1] || '👤'}</span>
        <span className={styles.nickname}>{playerData.nickname}</span>
      </div>
      {withProgress && (
        <div className={styles.progressPills}>
          {liveQuestions.map((_, idx) => (
            <span
              key={idx}
              className={`${styles.pill} ${idx < currentSlideIndex ? styles.pillDone : ''} ${
                idx === currentSlideIndex ? styles.pillActive : ''
              }`}
            />
          ))}
        </div>
      )}
      {renderTopActions()}
    </div>
  )

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
    const isLastNextBottle = currentBottleIndex + 2 > liveBottles.length
    return (
      <BottleTransitionScreen
        currentBottleIndex={currentBottleIndex}
        totalBottles={liveBottles.length}
        isHostUser={isHostUser}
        isLastNextBottle={isLastNextBottle}
        onAdvance={advanceToNextBottleOrFinish}
        onViewLeaderboard={() => router.push(`/live/session/${sessionId}/leaderboard`)}
        topBar={renderTopBar()}
        overlays={overlays}
      />
    )
  }

  // Intermediate prompt to open results
  if (roundStatus === 'showing_results' && resultsOpenedBottleIndex !== currentBottleIndex) {
    return (
      <div className={styles.fullPage}>
        {renderTopBar()}
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

  // Full results screen (showing_results or waiting_answers + player ready)
  if (
    roundStatus === 'showing_results' ||
    (roundStatus === 'waiting_answers' && clickedReady && resultsOpenedBottleIndex === currentBottleIndex)
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
        topBar={renderTopBar()}
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
      topBar={renderTopBar({withProgress: true})}
      overlays={overlays}
    />
  )
}
