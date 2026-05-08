'use client'

import {useState, useEffect, useCallback, useMemo, useRef} from 'react'
import {useRouter} from 'next/navigation'
import Loader from '@/components/Loader'
import {supabaseClient} from '@/lib/supabaseClient'
import styles from './playerLive.module.scss'

const APPLE_AVATARS = ['👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀', '🧑‍🍳', '👨‍⚕️']
const BOTTLE_ORDINALS = [
  'Prima',
  'Seconda',
  'Terza',
  'Quarta',
  'Quinta',
  'Sesta',
  'Settima',
  'Ottava',
  'Nona',
  'Decima',
]

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

  const [liveQuestions, setLiveQuestions] = useState(questions || [])
  const [liveBottles, setLiveBottles] = useState(bottles || [])
  const [currentBottleIndex, setCurrentBottleIndex] = useState(initialQuestionIndex)
  const [roundStatus, setRoundStatus] = useState(initialStatus)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [playerData, setPlayerData] = useState(null)
  const [allPlayers, setAllPlayers] = useState([])
  const [sessionFinished, setSessionFinished] = useState(false)
  const [roundAnswersByPlayer, setRoundAnswersByPlayer] = useState({})
  const [roundAnswers, setRoundAnswers] = useState({})
  const [correctOptionByQuestion, setCorrectOptionByQuestion] = useState({})
  const [resolvingPlayer, setResolvingPlayer] = useState(true)
  const [loadingGameData, setLoadingGameData] = useState((questions || []).length === 0)
  const [clickedReady, setClickedReady] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [exitModalOpen, setExitModalOpen] = useState(false)
  // Slide-based question navigation
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [checkedQuestions, setCheckedQuestions] = useState({})
  const [slideMotion, setSlideMotion] = useState('idle')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const slideTimerRef = useRef(null)
  const slideTransitionMs = 220
  const [showBottleTransition, setShowBottleTransition] = useState(false)
  const [resultsOpenedBottleIndex, setResultsOpenedBottleIndex] = useState(null)
  const soundsRef = useRef({correct: null, wrong: null, bottleCompleted: null})
  const playedBottleSoundRef = useRef(null)

  const currentBottle = liveBottles[currentBottleIndex]
  const isLastBottle = currentBottleIndex >= liveBottles.length - 1
  const playerStorageKey = `live_player_id_${sessionId}`
  const nicknameStorageKey = `live_player_nickname_${sessionId}`
  const audioPreferenceKey = 'live_audio_enabled'

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev
      localStorage.setItem(audioPreferenceKey, next ? 'on' : 'off')
      return next
    })
  }, [audioPreferenceKey])

  const playSound = useCallback(
    (soundKey) => {
      if (!audioEnabled) return
      const sound = soundsRef.current[soundKey]
      if (!sound) return
      sound.currentTime = 0
      sound.play().catch(() => {})
    },
    [audioEnabled],
  )

  useEffect(() => {
    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const savedPreference = localStorage.getItem(audioPreferenceKey)
    if (savedPreference === 'off') setAudioEnabled(false)

    soundsRef.current = {
      correct: new Audio('/indovianando-correct.mp3'),
      wrong: new Audio('/indovianando-wrong.mp3'),
      bottleCompleted: new Audio('/indovianando-bottle-completed.mp3'),
    }

    Object.values(soundsRef.current).forEach((audio) => {
      if (!audio) return
      audio.preload = 'auto'
      audio.volume = 0.9
    })
  }, [audioPreferenceKey])

  useEffect(() => {
    if (!showBottleTransition) return
    if (playedBottleSoundRef.current === `transition-${currentBottleIndex}`) return
    playedBottleSoundRef.current = `transition-${currentBottleIndex}`
    playSound('bottleCompleted')
  }, [showBottleTransition, currentBottleIndex, playSound])

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

      if (session.status === 'finished') {
        setSessionFinished(true)
      }

      const {data: questionsData} = await supabaseClient
        .from('game_questions')
        .select(
          `
          id,
          text,
          display_order,
          game_question_options (
            id,
            text,
            option_order
          )
        `,
        )
        .eq('game_id', session.game_id)
        .order('display_order')

      const {data: bottlesData} = await supabaseClient
        .from('game_bottles')
        .select('*')
        .eq('game_id', session.game_id)
        .order('bottle_order')

      const {data: playersData} = await supabaseClient
        .from('live_players')
        .select('id, nickname, avatar_id, total_score, updated_at, is_host')
        .eq('session_id', sessionId)
        .order('joined_at')

      setLiveQuestions(questionsData || [])
      setLiveBottles(bottlesData || [])
      setAllPlayers(playersData || [])
      setLoadingGameData(false)
    }

    bootstrapGameData()
  }, [liveQuestions.length, sessionId])

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
      const fallbackNickname = 'Host'
      const {data: created, error: createErr} = await supabaseClient
        .from('live_players')
        .insert({
          session_id: sessionId,
          nickname: fallbackNickname,
          avatar_id: 1,
          user_id: userId,
          is_host: true,
        })
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

  const syncScoresFromAnswers = useCallback(
    async (players, answersByPlayer) => {
      if (!isHostUser || players.length === 0) return

      const scoreByPlayer = {}
      players.forEach((player) => {
        scoreByPlayer[player.id] = 0
      })

      Object.entries(answersByPlayer).forEach(([playerId, perQuestion]) => {
        Object.values(perQuestion || {}).forEach((answer) => {
          scoreByPlayer[playerId] = (scoreByPlayer[playerId] || 0) + (answer.points || 0)
        })
      })

      await Promise.all(
        players.map((player) =>
          supabaseClient
            .from('live_players')
            .update({total_score: scoreByPlayer[player.id] || 0})
            .eq('id', player.id),
        ),
      )
    },
    [isHostUser],
  )

  const transitionToNextBottle = useCallback(async () => {
    setShowBottleTransition(true)
  }, [])

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

      setShowBottleTransition(false)
      setCurrentBottleIndex(nextIndex)
      setRoundStatus('waiting_answers')
      setSelectedAnswers({})
      setRoundAnswers({})
      setRoundAnswersByPlayer({})
      setClickedReady(false)
      setCurrentSlideIndex(0)
      setCheckedQuestions({})
      setSlideMotion('idle')
    } catch (err) {
      console.error('Errore in advanceToNextBottleOrFinish:', err)
      setShowBottleTransition(false)
    }
  }, [currentBottleIndex, isLastBottle, sessionId])

  useEffect(() => {
    // Setup Realtime listeners (primary data source)
    const sessionChannel = supabaseClient
      .channel(`live_sessions:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const updated = payload.new
          if (updated?.status === 'finished') {
            setSessionFinished(true)
            setTimeout(() => router.push(`/live/session/${sessionId}/leaderboard`), 900)
          }
          if (updated?.current_question_index !== currentBottleIndex) {
            setShowBottleTransition(false)
            setResultsOpenedBottleIndex(null)
            setSelectedAnswers({})
            setRoundAnswers({})
            setRoundAnswersByPlayer({})
            setCorrectOptionByQuestion({})
            setClickedReady(false)
            setCurrentSlideIndex(0)
            setCheckedQuestions({})
            setSlideMotion('idle')
            setCurrentBottleIndex(updated?.current_question_index || 0)
          }
          if (updated?.round_status) {
            setRoundStatus(updated.round_status)
          }
        },
      )
      .subscribe()

    const playersChannel = supabaseClient
      .channel(`live_players:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_players',
          filter: `session_id=eq.${sessionId}`,
        },
        async () => {
          const {data: players} = await supabaseClient
            .from('live_players')
            .select('id, nickname, avatar_id, total_score, updated_at, is_host')
            .eq('session_id', sessionId)
            .order('joined_at')
          setAllPlayers(players || [])
        },
      )
      .subscribe()

    const answersChannel = supabaseClient
      .channel(`live_round_answers:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_round_answers',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const answer = payload.new
          if (!answer) return
          setRoundAnswersByPlayer((prev) => {
            const updated = {...prev}
            if (!updated[answer.player_id]) {
              updated[answer.player_id] = {}
            }
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
            setCheckedQuestions((prev) => ({
              ...prev,
              [answer.question_id]: true,
            }))
          }
        },
      )
      .subscribe()

    // Fallback polling every 10s for sync/robustness
    const pollSession = setInterval(async () => {
      if (!playerData) {
        await resolvePlayer()
      }
    }, 10000)

    return () => {
      clearInterval(pollSession)
      sessionChannel.unsubscribe()
      playersChannel.unsubscribe()
      answersChannel.unsubscribe()
    }
  }, [sessionId, resolvePlayer, router, playerData, liveQuestions, isHostUser, currentBottleIndex])

  useEffect(() => {
    if (!currentBottle?.id) return

    const loadCorrectAnswers = async () => {
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

    loadCorrectAnswers()
  }, [currentBottle?.id])

  const handleSelect = useCallback((questionId, optionId) => {
    setSelectedAnswers((prev) => {
      if (prev[questionId] === optionId) return prev
      return {...prev, [questionId]: optionId}
    })
  }, [])

  const handleCheck = useCallback(
    async (questionId, optionId) => {
      if (!playerData || roundStatus !== 'waiting_answers') return
      if (checkedQuestions[questionId]) return
      if (!optionId) return

      const isCorrect = correctOptionByQuestion[questionId] === optionId
      const points = isCorrect ? 10 : 0

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
          [questionId]: {optionId, isCorrect, points},
        }))
        // Also update roundAnswersByPlayer directly (don't rely solely on Realtime echo)
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

  const handleContinue = useCallback(
    async (questionId) => {
      const isLastSlide = currentSlideIndex >= liveQuestions.length - 1
      if (!isLastSlide) {
        if (slideMotion !== 'idle') return

        setSlideMotion('exiting')
        slideTimerRef.current = setTimeout(() => {
          setCurrentSlideIndex((prev) => prev + 1)
          setSlideMotion('entering')

          slideTimerRef.current = setTimeout(() => {
            setSlideMotion('idle')
          }, slideTransitionMs)
        }, slideTransitionMs)
        return
      }
      // Last slide: mark ready
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
    [
      currentSlideIndex,
      liveQuestions.length,
      playerData,
      clickedReady,
      slideMotion,
      currentBottleIndex,
    ],
  )

  // When a player reaches the results screen, re-sync both players and answers from DB
  // (catches up if Realtime events were missed before subscription)
  useEffect(() => {
    if (!clickedReady || liveQuestions.length === 0) return

    const resync = async () => {
      const [{data: playersData}, {data: answersData}] = await Promise.all([
        supabaseClient
          .from('live_players')
          .select('id, nickname, avatar_id, total_score, updated_at, is_host')
          .eq('session_id', sessionId)
          .order('joined_at'),
        supabaseClient
          .from('live_round_answers')
          .select('player_id, question_id, selected_option_id, is_correct, points')
          .eq('session_id', sessionId)
          .in(
            'question_id',
            liveQuestions.map((q) => q.id),
          ),
      ])

      if (playersData) setAllPlayers(playersData)

      if (answersData && answersData.length > 0) {
        setRoundAnswersByPlayer((prev) => {
          const updated = {...prev}
          answersData.forEach((a) => {
            if (!updated[a.player_id]) updated[a.player_id] = {}
            updated[a.player_id] = {
              ...updated[a.player_id],
              [a.question_id]: {
                optionId: a.selected_option_id,
                isCorrect: a.is_correct,
                points: a.points,
              },
            }
          })
          return updated
        })
      }
    }

    resync()
  }, [clickedReady, sessionId, liveQuestions])

  const sortedLeaderboard = useMemo(
    () => [...allPlayers].sort((a, b) => (b.total_score || 0) - (a.total_score || 0)),
    [allPlayers],
  )

  const getBottleLabel = useCallback((index) => {
    return BOTTLE_ORDINALS[index] || `${index + 1}a`
  }, [])

  const handleOpenExitModal = useCallback(() => {
    setLeaderboardOpen(false)
    setExitModalOpen(true)
  }, [])

  const handleExitGame = useCallback(() => {
    const shouldGoDashboard = isHostUser || Boolean(playerData?.is_host)
    localStorage.removeItem(playerStorageKey)
    localStorage.removeItem(nicknameStorageKey)
    setExitModalOpen(false)
    router.push(shouldGoDashboard ? '/dashboard' : `/live/session/${sessionId}`)
  }, [isHostUser, nicknameStorageKey, playerData, playerStorageKey, router, sessionId])

  const renderTopActions = () => (
    <div className={styles.topActions}>
      <button className={styles.audioButton} onClick={toggleAudio}>
        {audioEnabled ? '🔊 ON' : '🔇 OFF'}
      </button>
      <button className={styles.leaderboardButton} onClick={() => setLeaderboardOpen(true)}>
        Classifica
      </button>
      <button
        className={styles.exitButton}
        onClick={handleOpenExitModal}
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

  const overlaySheets = (
    <>
      {leaderboardOpen && (
        <div className={styles.sheetBackdrop} onClick={() => setLeaderboardOpen(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h3>Classifica Live</h3>
            <div className={styles.sheetList}>
              {sortedLeaderboard.map((player, idx) => (
                <div key={player.id} className={styles.sheetRow}>
                  <span className={styles.sheetRank}>#{idx + 1}</span>
                  <span className={styles.sheetName}>{player.nickname}</span>
                  <span className={styles.sheetScore}>{player.total_score || 0}</span>
                </div>
              ))}
            </div>
            <button className={styles.sheetClose} onClick={() => setLeaderboardOpen(false)}>
              Chiudi
            </button>
          </div>
        </div>
      )}

      {exitModalOpen && (
        <div className={styles.sheetBackdrop} onClick={() => setExitModalOpen(false)}>
          <div
            className={`${styles.sheet} ${styles.exitSheet}`}
            onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <div className={styles.exitLottiePlaceholder} aria-hidden="true">
              😟
            </div>
            <h3>Vuoi uscire dal gioco?</h3>
            <p className={styles.exitHint}>
              Potrai rientrare dalla sessione, ma lascerai questa schermata.
            </p>
            <div className={styles.exitActions}>
              <button className={styles.exitSecondary} onClick={() => setExitModalOpen(false)}>
                Annulla
              </button>
              <button className={styles.exitDanger} onClick={handleExitGame}>
                Esci dal gioco
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )

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

  if (resolvingPlayer) {
    return (
      <div className={styles.fullPage}>
        <Loader label="Caricamento partita" />
      </div>
    )
  }

  if (loadingGameData) {
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
          <p>Attendi l avvio del gioco.</p>
        </div>
      </div>
    )
  }

  const allPlayersCompletedThisRound =
    allPlayers.length > 0 &&
    allPlayers.every((p) =>
      liveQuestions.every((q) => roundAnswersByPlayer[p.id]?.[q.id]?.optionId),
    )

  const handleNextBottleClick = async () => {
    if (!allPlayersCompletedThisRound) return

    if (isHostUser) {
      await syncScoresFromAnswers(allPlayers, roundAnswersByPlayer)
    }

    setResultsOpenedBottleIndex(null)
    transitionToNextBottle()
  }

  // ── Schermata transizione bottiglia (solo locale host) ──
  if (showBottleTransition) {
    const nextBottleNum = currentBottleIndex + 2
    const isLastNextBottle = nextBottleNum > liveBottles.length
    const nextBottleIndex = currentBottleIndex + 1
    return (
      <div className={styles.fullPage}>
        {renderTopBar()}

        <div className={styles.slideContent}>
          {isLastNextBottle ? (
            <>
              <h2 className={styles.waitTitle}>🎉 Ultimi risultati!</h2>
              <p className={styles.readyHint}>Tra poco vedrai la classifica finale.</p>
            </>
          ) : (
            <div className={styles.transitionHero}>
              <div className={styles.confettiBurst} aria-hidden="true">
                {Array.from({length: 18}).map((_, idx) => (
                  <span
                    key={idx}
                    className={styles.confettiPiece}
                    style={{
                      '--c-delay': `${idx * 45}ms`,
                      '--c-x': `${(idx % 6) * 18 - 40}px`,
                      '--c-rot': `${(idx % 2 === 0 ? 1 : -1) * (18 + idx * 2)}deg`,
                    }}
                  />
                ))}
              </div>
              <p className={styles.transitionSubtitle}>
                Bottiglia {nextBottleNum}/{liveBottles.length}
              </p>
              <h2 className={styles.transitionTitle}>
                {getBottleLabel(nextBottleIndex)} bottiglia!
              </h2>
              <p className={styles.readyHint}>Inizia!</p>
            </div>
          )}
        </div>

        <div className={styles.bottomPanel}>
          {isHostUser ? (
            <button className={styles.continueButton} onClick={() => advanceToNextBottleOrFinish()}>
              {isLastNextBottle ? 'Concludi' : 'Iniziamo'}
            </button>
          ) : (
            <p className={styles.readyHint}>In attesa dell&apos;host...</p>
          )}
        </div>

        {overlaySheets}
      </div>
    )
  }

  // ── Step intermedio: conferma apertura risultati ──
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

        {overlaySheets}
      </div>
    )
  }

  // ── Schermata "mostra risultati / in attesa della prossima bottiglia" ──
  if (roundStatus === 'showing_results') {
    return (
      <div className={styles.fullPage}>
        {renderTopBar()}

        <div className={styles.slideContent}>
          <div className={styles.bottleBadge}>
            Bottiglia {currentBottleIndex + 1}/{liveBottles.length}
          </div>
          <h2 className={styles.waitTitle}>Bottiglia completata!</h2>
          <p className={styles.readyHint}>
            {isLastBottle
              ? 'Tra poco vedrai la classifica finale.'
              : `Passiamo alla bottiglia ${currentBottleIndex + 2}.`}
          </p>
          {liveQuestions.map((question, index) => {
            const ans = roundAnswers[question.id]
            const correctText = question.game_question_options?.find(
              (o) => o.id === correctOptionByQuestion[question.id],
            )?.text
            return (
              <div key={question.id} className={styles.summaryRow}>
                <span className={styles.summaryIndex}>{index + 1}</span>
                <span className={styles.summaryText}>{question.text}</span>
                <span className={ans?.isCorrect ? styles.summaryCorrect : styles.summaryWrong}>
                  {ans?.isCorrect ? `+${ans.points}` : `Corretta: ${correctText || '-'}`}
                </span>
              </div>
            )
          })}
        </div>

        <div className={styles.bottomPanel}>
          <>
            <p className={styles.readyHint}>
              {allPlayersCompletedThisRound
                ? 'Tutti hanno finito: puoi passare alla prossima bottiglia.'
                : 'Attendi che tutti i giocatori finiscano per continuare.'}
            </p>
            <button
              className={styles.continueButton}
              onClick={handleNextBottleClick}
              disabled={!allPlayersCompletedThisRound}>
              {isLastBottle ? 'Concludi' : 'Prossima bottiglia'}
            </button>
          </>
        </div>

        {overlaySheets}
      </div>
    )
  }

  if (
    roundStatus === 'waiting_answers' &&
    clickedReady &&
    resultsOpenedBottleIndex === currentBottleIndex
  ) {
    return (
      <div className={styles.fullPage}>
        {renderTopBar()}

        <div className={styles.slideContent}>
          <div className={styles.bottleBadge}>
            Bottiglia {currentBottleIndex + 1}/{liveBottles.length}
          </div>
          <h2 className={styles.waitTitle}>Risultati bottiglia</h2>
          {liveQuestions.map((question, index) => {
            const ans = roundAnswers[question.id]
            const correctAnswerText = question.game_question_options?.find(
              (o) => o.id === correctOptionByQuestion[question.id],
            )?.text
            return (
              <div key={question.id} className={styles.summaryRow}>
                <span className={styles.summaryIndex}>{index + 1}</span>
                <span className={styles.summaryText}>{question.text}</span>
                <span className={ans?.isCorrect ? styles.summaryCorrect : styles.summaryWrong}>
                  {ans?.isCorrect ? `+${ans.points}` : `Corretta: ${correctAnswerText || '-'}`}
                </span>
              </div>
            )
          })}
        </div>

        <div className={styles.bottomPanel}>
          <>
            <p className={styles.readyHint}>
              {allPlayersCompletedThisRound
                ? 'Tutti hanno finito: puoi passare alla prossima bottiglia.'
                : 'Attendi che tutti i giocatori finiscano per continuare.'}
            </p>
            <button
              className={styles.continueButton}
              onClick={handleNextBottleClick}
              disabled={!allPlayersCompletedThisRound}>
              {isLastBottle ? 'Concludi' : 'Prossima bottiglia'}
            </button>
          </>
        </div>

        {overlaySheets}
      </div>
    )
  }

  // ── Domanda corrente (slide) ──
  const currentQuestion = liveQuestions[currentSlideIndex]
  const isLastSlide = currentSlideIndex >= liveQuestions.length - 1
  const isSlideTransitioning = slideMotion !== 'idle'
  const slideMotionClass =
    slideMotion === 'exiting'
      ? styles.slideExitLeft
      : slideMotion === 'entering'
        ? styles.slideEnterRight
        : ''
  const selectedOption = selectedAnswers[currentQuestion?.id]
  const isChecked = Boolean(checkedQuestions[currentQuestion?.id])
  const checkResult = roundAnswers[currentQuestion?.id]
  const correctText = currentQuestion?.game_question_options?.find(
    (o) => o.id === correctOptionByQuestion[currentQuestion?.id],
  )?.text

  return (
    <div className={styles.fullPage}>
      {/* ── Top bar ── */}
      {renderTopBar({withProgress: true})}

      {/* ── Question content ── */}
      <div
        className={`${styles.slideContent} ${slideMotionClass} ${!isChecked ? styles.mobileCheckSpacing : ''}`}>
        <div className={styles.bottleBadge}>
          Bottiglia {currentBottleIndex + 1}/{liveBottles.length}
        </div>
        <p className={styles.questionCounter}>
          Domanda {currentSlideIndex + 1} di {liveQuestions.length}
        </p>
        <h2 className={styles.questionText}>{currentQuestion?.text}</h2>

        <div className={styles.optionsList}>
          {currentQuestion?.game_question_options
            ?.sort((a, b) => a.option_order - b.option_order)
            .map((option) => {
              const isSelected = selectedOption === option.id
              const isCorrectOption = correctOptionByQuestion[currentQuestion?.id] === option.id
              let optClass = styles.optionButton
              if (isChecked) {
                if (isCorrectOption) optClass = `${styles.optionButton} ${styles.optCorrect}`
                else if (isSelected) optClass = `${styles.optionButton} ${styles.optWrong}`
                else optClass = `${styles.optionButton} ${styles.optDimmed}`
              } else if (isSelected) {
                optClass = `${styles.optionButton} ${styles.optSelected}`
              }
              return (
                <button
                  key={option.id}
                  className={optClass}
                  onClick={() => !isChecked && handleSelect(currentQuestion.id, option.id)}
                  disabled={isChecked || isSlideTransitioning}>
                  {option.text}
                </button>
              )
            })}
        </div>
      </div>

      {/* ── Fixed bottom panel ── */}
      <div
        className={`${styles.bottomPanel} ${!isChecked ? styles.mobileCheckFixed : ''} ${
          isChecked ? (checkResult?.isCorrect ? styles.bottomCorrect : styles.bottomWrong) : ''
        }`}>
        {isChecked && (
          <div className={styles.resultFeedback}>
            {checkResult?.isCorrect ? (
              <>
                <span className={styles.feedbackIcon}>🎉</span>
                <span className={styles.feedbackLabel}>Corretto! +{checkResult.points}</span>
              </>
            ) : (
              <>
                <span className={styles.feedbackIcon}>💡</span>
                <span className={styles.feedbackLabel}>
                  Risposta corretta: <strong>{correctText}</strong>
                </span>
              </>
            )}
          </div>
        )}

        {!isChecked ? (
          <button
            className={styles.checkButton}
            onClick={() => handleCheck(currentQuestion.id, selectedOption)}
            disabled={!selectedOption || isSlideTransitioning}>
            Controlla
          </button>
        ) : (
          <button
            className={styles.continueButton}
            onClick={() => handleContinue(currentQuestion.id)}
            disabled={isSlideTransitioning}>
            {isLastSlide
              ? clickedReady
                ? 'In attesa degli altri...'
                : 'Vedi risultati'
              : 'Continua'}
          </button>
        )}
      </div>

      {/* ── Leaderboard sheet ── */}
      {overlaySheets}
    </div>
  )
}
