'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import {supabaseClient} from '@/lib/supabaseClient'
import {useGameAudio} from '@/app/live/session/[sessionId]/play/hooks/useGameAudio'
import {TopBar} from '@/app/live/session/[sessionId]/play/components/TopBar'
import {QuestionSlideScreen} from '@/app/live/session/[sessionId]/play/components/QuestionSlideScreen'
import {ResultsScreen} from '@/app/live/session/[sessionId]/play/components/ResultsScreen'
import {GameOverlays} from '@/app/live/session/[sessionId]/play/components/GameOverlays'
import {useT} from '@/lib/i18n/useT'
import AvatarDisplay from '@/components/AvatarDisplay'
import Loader from '@/components/Loader'
import {buildPublicAppUrl} from '@/lib/publicAppUrl'
import {scrollPageTop} from '@/lib/scrollPageTop'
import styles from '@/app/live/session/[sessionId]/play/playerLive.module.scss'
import joinStyles from '@/app/live/session/[sessionId]/playerJoin.module.scss'

const isNeutralQuestion = (question) =>
  question?.isNeutral === true ||
  String(question?.kind || '')
    .trim()
    .toLowerCase() === 'neutral'

function getStoredPlayer(sessionId) {
  try {
    const raw = localStorage.getItem(`table_live_player_${sessionId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.playerId || !parsed?.playerToken) return null
    return parsed
  } catch {
    return null
  }
}

function avatarFromNickname(nickname = '') {
  let hash = 0
  for (let i = 0; i < nickname.length; i += 1) {
    hash = (hash * 31 + nickname.charCodeAt(i)) >>> 0
  }
  return (hash % 10) + 1
}

function SessionLoadingScreen({label, hint, topBar = null, overlays = null}) {
  return (
    <div className={styles.fullPage}>
      {topBar}
      <div className={styles.centeredCard}>
        <Loader label={label} />
        {hint ? <p className={styles.loadingHint}>{hint}</p> : null}
      </div>
      {overlays}
    </div>
  )
}

export default function TableLiveSessionClient({sessionId}) {
  const router = useRouter()
  const tJoin = useT('live.playerJoin')
  const tResults = useT('live.results')
  const tPlayerLive = useT('live.playerLive')
  const tLeaderboard = useT('live.leaderboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [playerAuth, setPlayerAuth] = useState(null)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [checkedQuestions, setCheckedQuestions] = useState({})
  const [roundAnswers, setRoundAnswers] = useState({})
  const [slideIndex, setSlideIndex] = useState(0)
  const [clickedReady, setClickedReady] = useState(false)
  const [starting, setStarting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [lastBottleIndexSeen, setLastBottleIndexSeen] = useState(-1)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [exitModalOpen, setExitModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [overlayStandings, setOverlayStandings] = useState([])
  const [isLoadingStandings, setIsLoadingStandings] = useState(false)
  const [playerMarkedNext, setPlayerMarkedNext] = useState(false)
  const [pendingAction, setPendingAction] = useState('')
  const isMountedRef = useRef(true)
  const inFlightRef = useRef(false)
  const ignoreLobbyUntilRef = useRef(0)
  const {audioEnabled, toggleAudio, playSound} = useGameAudio()

  useEffect(() => {
    setPlayerAuth(getStoredPlayer(sessionId))
  }, [sessionId])

  const loadSession = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const params = new URLSearchParams({sessionId})
      if (playerAuth?.playerId && playerAuth?.playerToken) {
        params.set('playerId', playerAuth.playerId)
        params.set('playerToken', playerAuth.playerToken)
      }
      const response = await fetch(`/api/table-live/session/state?${params.toString()}`, {
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.session) {
        if (isMountedRef.current) setError(payload?.error || tJoin('sessionNotFound'))
        return
      }

      if (isMountedRef.current) {
        if (
          payload.session.status === 'lobby' &&
          ignoreLobbyUntilRef.current &&
          Date.now() < ignoreLobbyUntilRef.current
        ) {
          return
        }
        if (payload.session.status !== 'lobby') {
          ignoreLobbyUntilRef.current = 0
        }
        setData(payload)
        setError('')
        const index = payload.session.currentBottleIndex || 0
        if (index !== lastBottleIndexSeen) {
          setLastBottleIndexSeen(index)
          setSlideIndex(0)
          setClickedReady(false)
          setSelectedAnswers({})
          setCheckedQuestions({})
          setRoundAnswers({})
          setPlayerMarkedNext(false)
          setPendingAction('')
        }

        if (payload.session.status === 'finished') {
          setPendingAction('')
        }
      }
    } catch {
      if (isMountedRef.current) setError(tJoin('networkError'))
    } finally {
      if (isMountedRef.current) setLoading(false)
      inFlightRef.current = false
    }
  }, [sessionId, playerAuth?.playerId, playerAuth?.playerToken, lastBottleIndexSeen, tJoin])

  useEffect(() => {
    isMountedRef.current = true
    loadSession()
    const interval = setInterval(() => {
      if (!document.hidden) loadSession()
    }, 2600)
    return () => {
      isMountedRef.current = false
      clearInterval(interval)
    }
  }, [loadSession])

  useEffect(() => {
    const trigger = () => {
      loadSession()
    }

    const sessionChannel = supabaseClient
      .channel(`table_live_sessions:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_live_sessions',
          filter: `id=eq.${sessionId}`,
        },
        trigger,
      )
      .subscribe()

    const playersChannel = supabaseClient
      .channel(`table_live_players:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_live_players',
          filter: `session_id=eq.${sessionId}`,
        },
        trigger,
      )
      .subscribe()

    const answersChannel = supabaseClient
      .channel(`table_live_round_answers:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_live_round_answers',
          filter: `session_id=eq.${sessionId}`,
        },
        trigger,
      )
      .subscribe()

    return () => {
      sessionChannel.unsubscribe()
      playersChannel.unsubscribe()
      answersChannel.unsubscribe()
    }
  }, [sessionId, loadSession])

  const questions = useMemo(
    () =>
      (data?.questions || []).map((q) => ({
        ...q,
        game_question_options: q.options || [],
      })),
    [data?.questions],
  )

  const currentBottleIndex = data?.session?.currentBottleIndex || 0
  const answerRevealMode = data?.session?.answerRevealMode === 'end' ? 'end' : 'instant'
  const shouldRevealAnswersInstantly = answerRevealMode === 'instant'
  const currentBottle = data?.bottles?.[currentBottleIndex] || null
  const isLastBottle = currentBottleIndex >= (data?.bottles?.length || 1) - 1
  const currentQuestion = questions[slideIndex]
  const roundAnswersByPlayer = useMemo(() => {
    const byPlayer = {}
    for (const answer of data?.roundAnswers || []) {
      if (!byPlayer[answer.player_id]) byPlayer[answer.player_id] = {}
      byPlayer[answer.player_id][answer.question_id] = {
        optionId: answer.selected_option_id,
        isCorrect: answer.is_correct,
        points: answer.points || 0,
      }
    }
    return byPlayer
  }, [data?.roundAnswers])

  const playersReadyCount = useMemo(() => {
    const ids = (data?.players || []).map((p) => p.id)
    if (!ids.length || !questions.length) return 0
    return ids.filter((pid) => questions.every((q) => roundAnswersByPlayer[pid]?.[q.id])).length
  }, [data?.players, questions, roundAnswersByPlayer])

  const allPlayersCompletedThisRound = useMemo(() => {
    const totalPlayers = data?.players?.length || 0
    return totalPlayers > 0 && questions.length > 0 && playersReadyCount >= totalPlayers
  }, [data?.players?.length, questions.length, playersReadyCount])

  const topBarPlayer = data?.me
    ? {
        nickname: data.me.nickname,
        avatar_id:
          data.me.avatar_id || playerAuth?.avatarId || avatarFromNickname(data.me.nickname),
      }
    : null
  const sortedLeaderboard = overlayStandings.length
    ? overlayStandings
    : (data?.players || []).map((p) => ({
        ...p,
        avatar_id: p.avatar_id || avatarFromNickname(p.nickname),
        liveTotalScore: p.total_score || 0,
        roundPoints: 0,
      }))

  const fetchStandings = useCallback(async () => {
    setIsLoadingStandings(true)
    try {
      const res = await fetch(`/api/table-live/session/standings?sessionId=${sessionId}`)
      if (!res.ok) return
      const payload = await res.json().catch(() => ({}))
      if (Array.isArray(payload?.standings)) setOverlayStandings(payload.standings)
    } finally {
      setIsLoadingStandings(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (!leaderboardOpen) return
    fetchStandings()
    const id = setInterval(() => {
      if (!document.hidden) fetchStandings()
    }, 2500)
    return () => clearInterval(id)
  }, [leaderboardOpen, fetchStandings])

  useEffect(() => {
    scrollPageTop()
  }, [currentBottleIndex, slideIndex, data?.session?.status, starting, clickedReady])

  useEffect(() => {
    if (!starting) return
    if (data?.session?.status === 'finished') {
      setStarting(false)
      return
    }
    if (data?.session?.status !== 'lobby' && currentQuestion) {
      setStarting(false)
    }
  }, [currentQuestion, data?.session?.status, starting])

  const handleStart = async () => {
    if (!data?.me?.isHost || starting || !playerAuth) return
    ignoreLobbyUntilRef.current = Date.now() + 4000
    setStarting(true)
    try {
      const response = await fetch('/api/table-live/session/start', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          sessionId,
          playerId: playerAuth.playerId,
          playerToken: playerAuth.playerToken,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        ignoreLobbyUntilRef.current = 0
        setError(payload?.error || tJoin('startFailed'))
        setStarting(false)
        return
      }
      // Update status immediately instead of waiting for polling
      if (isMountedRef.current) {
        setData((prevData) => ({
          ...prevData,
          session: {...prevData.session, status: 'playing'},
        }))
      }
    } catch {
      ignoreLobbyUntilRef.current = 0
      setError(tJoin('networkError'))
      setStarting(false)
    }
  }

  const handleCheck = async (questionId, optionId) => {
    if (!playerAuth || !questionId || !optionId || checkedQuestions[questionId] || checking)
      return false
    const currentQuestion = questions.find((question) => question.id === questionId)
    const isNeutral = isNeutralQuestion(currentQuestion)
    setChecking(true)
    const correctOptionId = data?.correctOptionByQuestion?.[questionId]
    const isCorrect = isNeutral ? null : correctOptionId === optionId
    const points = isCorrect === true ? 10 : 0
    if (shouldRevealAnswersInstantly) {
      if (isCorrect === true) playSound('correct')
      else if (isCorrect === false) playSound('wrong')
    }
    setCheckedQuestions((prev) => ({...prev, [questionId]: true}))
    setRoundAnswers((prev) => ({
      ...prev,
      [questionId]: {optionId, isCorrect, points},
    }))
    try {
      const response = await fetch('/api/table-live/round-answer', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          sessionId,
          playerId: playerAuth.playerId,
          playerToken: playerAuth.playerToken,
          questionId,
          selectedOptionId: optionId,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setCheckedQuestions((prev) => {
          const next = {...prev}
          delete next[questionId]
          return next
        })
        setRoundAnswers((prev) => {
          const next = {...prev}
          delete next[questionId]
          return next
        })
        setError(payload?.error || tJoin('answerFailed'))
        return false
      }
      setRoundAnswers((prev) => ({
        ...prev,
        [questionId]: {
          optionId,
          isCorrect: payload?.isCorrect ?? null,
          points: payload?.points || points,
        },
      }))
      loadSession()
      return true
    } catch {
      setCheckedQuestions((prev) => {
        const next = {...prev}
        delete next[questionId]
        return next
      })
      setRoundAnswers((prev) => {
        const next = {...prev}
        delete next[questionId]
        return next
      })
      setError(tJoin('networkError'))
      return false
    } finally {
      setChecking(false)
    }
  }

  const handleConfirmAndContinue = async (questionId, optionId) => {
    await handleCheck(questionId, optionId)
  }

  const handleContinue = () => {
    const isLastSlide = slideIndex >= questions.length - 1
    if (!isLastSlide) {
      setSlideIndex((prev) => prev + 1)
      return
    }
    setClickedReady(true)
  }

  const handleNextBottle = async () => {
    if (!allPlayersCompletedThisRound || pendingAction) return
    if (!data?.me?.isHost) {
      setPlayerMarkedNext(true)
      return
    }
    playSound('bottleCompleted')
    setPendingAction('nextBottle')
    try {
      await fetch('/api/table-live/advance-auto', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sessionId}),
      })
    } catch {
      if (isMountedRef.current) setPendingAction('')
    }
  }

  const handleFinalLeaderboard = async () => {
    if (!allPlayersCompletedThisRound || pendingAction) return
    if (!data?.me?.isHost) {
      setPlayerMarkedNext(true)
      return
    }
    playSound('bottleCompleted')
    setPendingAction('leaderboard')
    try {
      await fetch('/api/table-live/advance-auto', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sessionId}),
      })
    } catch {
      // Fallback to leaderboard anyway so players can continue.
    } finally {
      router.push(`/table-live/session/${sessionId}/leaderboard`)
    }
  }

  useEffect(() => {
    if (data?.session?.status === 'finished') {
      router.replace(`/table-live/session/${sessionId}/leaderboard`)
    }
  }, [data?.session?.status, router, sessionId])

  const goEvent = () => {
    const slug = data?.event?.slug
    router.push(slug ? `/table-live/event/${slug}` : '/')
  }
  const sessionLink = useMemo(
    () => buildPublicAppUrl(`/table-live/session/${sessionId}`),
    [sessionId],
  )

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(sessionLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  const handleShareLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: data?.event?.title || tJoin('shareFallbackTitle'),
          text: `${tJoin('sessionCodeLabel')} ${data?.session?.joinCode || ''}`,
          url: sessionLink,
        })
        return
      }
    } catch {
      return
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        `${data?.event?.title || tJoin('shareFallbackTitle')} · ${sessionLink}`,
      )}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  const exitGame = () => {
    localStorage.removeItem(`table_live_player_${sessionId}`)
    goEvent()
  }

  const overlays = topBarPlayer ? (
    <GameOverlays
      leaderboardOpen={leaderboardOpen}
      exitModalOpen={exitModalOpen}
      sortedLeaderboard={sortedLeaderboard}
      isLoadingStandings={isLoadingStandings}
      playerData={topBarPlayer}
      isHostUser={false}
      onKickPlayer={() => {}}
      onCloseLeaderboard={() => setLeaderboardOpen(false)}
      onCloseExit={() => setExitModalOpen(false)}
      onExitGame={exitGame}
    />
  ) : null

  const pendingOverlay =
    pendingAction === 'nextBottle' ? (
      <div className={styles.blockingOverlay}>
        <Loader label={tPlayerLive('loadingNextBottle')} />
      </div>
    ) : pendingAction === 'leaderboard' ? (
      <div className={styles.blockingOverlay}>
        <Loader label={tPlayerLive('loadingLeaderboard')} />
      </div>
    ) : null

  const mergedOverlays = (
    <>
      {overlays}
      {pendingOverlay}
    </>
  )

  if (loading) {
    return <SessionLoadingScreen label={tPlayerLive('loadingGame')} hint={tJoin('gameStartingDesc')} />
  }

  if (!data) {
    return (
      <div className={styles.fullPage}>
        <div className={styles.centeredCard}>
          <h2>{tPlayerLive('participantNotFound')}</h2>
          <button className={styles.checkButton} onClick={() => router.push('/')}>
            {tResults('home')}
          </button>
        </div>
      </div>
    )
  }

  if (!data.me || !topBarPlayer) {
    return <SessionLoadingScreen label={tJoin('joining')} hint={tJoin('gameStartingDesc')} />
  }

  if (starting || (data.session.status === 'playing' && !currentQuestion)) {
    return (
      <SessionLoadingScreen
        label={tJoin('gameStartingTitle')}
        hint={tJoin('gameStartingDesc')}
        topBar={
          <TopBar
            playerData={topBarPlayer}
            audioEnabled={audioEnabled}
            onToggleAudio={toggleAudio}
            onOpenLeaderboard={() => setLeaderboardOpen(true)}
            onOpenExit={() => setExitModalOpen(true)}
          />
        }
        overlays={mergedOverlays}
      />
    )
  }

  if (data.session.status === 'lobby') {
    return (
      <div className={styles.fullPage}>
        <TopBar
          playerData={topBarPlayer}
          audioEnabled={audioEnabled}
          onToggleAudio={toggleAudio}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onOpenExit={() => setExitModalOpen(true)}
        />
        <div className={`${styles.centeredCard} ${styles.lobbyCard}`}>
          <div className={styles.lobbyCodeBlock}>
            <span className={styles.lobbyCodeLabel}>{tJoin('sessionCodeLabel')}</span>
            <strong className={styles.lobbyCodeValue}>{data.session.joinCode}</strong>
          </div>

          {data.me.isHost ? null : (
            <p className={styles.lobbyWaitingNotice}>{tJoin('waitHostStart')}</p>
          )}
          <div className={joinStyles.shareButtons}>
            <button className="btn neutral btn-small" onClick={handleCopyLink}>
              {copied ? tJoin('copied') : tJoin('copyLink')}
            </button>
            <button className="btn neutral btn-small" onClick={handleShareLink}>
              {tJoin('shareLink')}
            </button>
          </div>
          {data.players.length ? (
            <div className={styles.lobbyPlayersSection}>
              <div className={styles.lobbyPlayersHeader}>
                <h2>{tJoin('connectedPlayers')}</h2>
                <span className={styles.lobbyPlayersCount}>{data.players.length}</span>
              </div>
              <div className={styles.lobbyPlayersGrid}>
                {data.players.map((player) => (
                  <div key={player.id} className={styles.lobbyPlayerCard}>
                    <span className={styles.lobbyPlayerAvatar}>
                      <AvatarDisplay
                        avatarId={player.avatar_id || avatarFromNickname(player.nickname)}
                        size={36}
                      />
                    </span>
                    <div className={styles.lobbyPlayerMeta}>
                      <p className={styles.lobbyPlayerName}>{player.nickname}</p>
                      {player.is_host ? <span className={styles.lobbyPlayerHost}>Host</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {error ? <p>{error}</p> : null}
        </div>
        {data.me.isHost ? (
          <>
            <div className={styles.lobbyBottomSpacer} />
            <div className={styles.lobbyBottomRow}>
              <button className="btn success-filled" onClick={handleStart} disabled={starting}>
                {starting ? tJoin('startingGameAction') : tJoin('startGameAction')}
              </button>
            </div>
          </>
        ) : null}
        {mergedOverlays}
      </div>
    )
  }

  if (data.session.status === 'finished') {
    return (
      <ResultsScreen
        sessionId={sessionId}
        title={tPlayerLive('gameOverTitle').replace('🎉 ', '')}
        subtitle={tLeaderboard('title').replace('🎉 ', '')}
        currentBottle={currentBottle || {}}
        currentBottleIndex={currentBottleIndex}
        totalBottles={data.bottles?.length || 0}
        questions={questions}
        roundAnswers={roundAnswers}
        correctOptionByQuestion={data.correctOptionByQuestion || {}}
        isLastBottle={true}
        allPlayersCompletedThisRound={true}
        isHostUser={!!data.me.isHost}
        playerMarkedNext={playerMarkedNext}
        allPlayers={(data.players || []).map((p) => ({
          ...p,
          avatar_id: p.avatar_id || avatarFromNickname(p.nickname),
        }))}
        roundAnswersByPlayer={roundAnswersByPlayer}
        playersReadyCount={playersReadyCount}
        participantsCount={data.players?.length || 0}
        currentPlayerData={topBarPlayer}
        onNextBottle={() => {}}
        onViewLeaderboard={() => router.push(`/table-live/session/${sessionId}/leaderboard`)}
        topBar={
          <TopBar
            playerData={topBarPlayer}
            liveQuestions={questions}
            currentSlideIndex={slideIndex}
            audioEnabled={audioEnabled}
            onToggleAudio={toggleAudio}
            onOpenLeaderboard={() => setLeaderboardOpen(true)}
            onOpenExit={() => setExitModalOpen(true)}
          />
        }
        overlays={mergedOverlays}
      />
    )
  }

  if (clickedReady) {
    return (
      <ResultsScreen
        sessionId={sessionId}
        title={tPlayerLive('bottleComplete')}
        subtitle={
          isLastBottle
            ? tPlayerLive('finalLeaderboardSoon')
            : tPlayerLive('movingToBottle', {index: currentBottleIndex + 2})
        }
        currentBottle={currentBottle || {}}
        currentBottleIndex={currentBottleIndex}
        totalBottles={data.bottles?.length || 0}
        questions={questions}
        roundAnswers={roundAnswers}
        correctOptionByQuestion={data.correctOptionByQuestion || {}}
        isLastBottle={isLastBottle}
        allPlayersCompletedThisRound={allPlayersCompletedThisRound}
        isHostUser={!!data.me.isHost}
        playerMarkedNext={playerMarkedNext}
        allPlayers={(data.players || []).map((p) => ({
          ...p,
          avatar_id: p.avatar_id || avatarFromNickname(p.nickname),
        }))}
        roundAnswersByPlayer={roundAnswersByPlayer}
        playersReadyCount={playersReadyCount}
        participantsCount={data.players?.length || 0}
        currentPlayerData={topBarPlayer}
        onNextBottle={handleNextBottle}
        onViewLeaderboard={handleFinalLeaderboard}
        isActionPending={Boolean(pendingAction)}
        topBar={
          <TopBar
            playerData={topBarPlayer}
            liveQuestions={questions}
            currentSlideIndex={slideIndex}
            audioEnabled={audioEnabled}
            onToggleAudio={toggleAudio}
            onOpenLeaderboard={() => setLeaderboardOpen(true)}
            onOpenExit={() => setExitModalOpen(true)}
          />
        }
        overlays={mergedOverlays}
      />
    )
  }

  return (
    <QuestionSlideScreen
      currentQuestion={currentQuestion}
      currentBottleIndex={currentBottleIndex}
      totalBottles={data.bottles?.length || 0}
      currentSlideIndex={slideIndex}
      totalSlides={questions.length}
      slideMotionClass=""
      isChecked={Boolean(checkedQuestions[currentQuestion?.id])}
      isSlideTransitioning={false}
      selectedOption={selectedAnswers[currentQuestion?.id]}
      checkResult={roundAnswers[currentQuestion?.id]}
      correctOptionByQuestion={data.correctOptionByQuestion || {}}
      shouldRevealAnswersInstantly={shouldRevealAnswersInstantly}
      clickedReady={clickedReady}
      isLastSlide={slideIndex >= questions.length - 1}
      comboCount={0}
      isCheckingAnswer={checking}
      finalRevealLabel={tPlayerLive('finalRevealAction')}
      confirmLabel={tPlayerLive('confirmAction')}
      onSelect={(questionId, optionId) =>
        setSelectedAnswers((prev) => ({...prev, [questionId]: optionId}))
      }
      onCheck={handleCheck}
      onConfirmAndContinue={handleConfirmAndContinue}
      onContinue={handleContinue}
      topBar={
        <TopBar
          playerData={topBarPlayer}
          liveQuestions={questions}
          currentSlideIndex={slideIndex}
          withProgress
          audioEnabled={audioEnabled}
          onToggleAudio={toggleAudio}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onOpenExit={() => setExitModalOpen(true)}
        />
      }
      overlays={mergedOverlays}
    />
  )
}
