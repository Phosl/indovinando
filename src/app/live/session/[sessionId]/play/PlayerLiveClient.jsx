'use client'

import {useState, useEffect, useCallback} from 'react'
import {useRouter} from 'next/navigation'
import {supabaseClient} from '@/lib/supabaseClient'
import styles from './playerLive.module.scss'

const APPLE_AVATARS = ['👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀', '🧑‍🍳', '👨‍⚕️']

export default function PlayerLiveClient({
  sessionId,
  gameName,
  questions,
  bottles,
  initialStatus,
  initialQuestionIndex,
  sessionStatus,
  userId,
}) {
  const router = useRouter()

  const [liveQuestions, setLiveQuestions] = useState(questions || [])
  const [liveBottles, setLiveBottles] = useState(bottles || [])
  const [currentBottleIndex, setCurrentBottleIndex] = useState(initialQuestionIndex)
  const [roundStatus, setRoundStatus] = useState(initialStatus) // 'waiting_answers' | 'showing_results'
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [playerData, setPlayerData] = useState(null)
  const [allPlayers, setAllPlayers] = useState([])
  const [sessionFinished, setSessionFinished] = useState(false)
  const [roundAnswers, setRoundAnswers] = useState({}) // { questionId: { optionId, isCorrect, points } }
  const [submitted, setSubmitted] = useState(false)
  const [resolvingPlayer, setResolvingPlayer] = useState(true)
  const [loadingGameData, setLoadingGameData] = useState((questions || []).length === 0)

  const currentBottle = liveBottles[currentBottleIndex]
  const playerStorageKey = `live_player_id_${sessionId}`
  const nicknameStorageKey = `live_player_nickname_${sessionId}`

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

      setLiveQuestions(questionsData || [])
      setLiveBottles(bottlesData || [])
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
        .select('id, nickname, avatar_id, user_id')
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
        .select('id, nickname, avatar_id, user_id')
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

    setResolvingPlayer(false)
  }, [nicknameStorageKey, playerStorageKey, sessionId, userId])

  // Polling: controlla stato della sessione e della domanda corrente
  useEffect(() => {
    const pollSession = setInterval(async () => {
      // Carica session
      const {data: session} = await supabaseClient
        .from('live_sessions')
        .select('current_question_index, round_status, status')
        .eq('id', sessionId)
        .single()

      if (session?.status === 'finished') {
        setSessionFinished(true)
        setTimeout(() => router.push(`/live/session/${sessionId}/leaderboard`), 1000)
      }

      // Aggiorna indice bottiglia e resetta risposte
      setCurrentBottleIndex((prev) => {
        if (session?.current_question_index !== prev) {
          setSelectedAnswers({})
          setRoundAnswers({})
          setSubmitted(false)
        }
        return session?.current_question_index || 0
      })

      // Aggiorna stato round
      setRoundStatus(session?.round_status)

      // Carica player data se non esiste
      if (!playerData) {
        await resolvePlayer()
      }

      // Carica lista giocatori
      const {data: players} = await supabaseClient
        .from('live_players')
        .select('id, nickname, avatar_id')
        .eq('session_id', sessionId)
        .order('joined_at')

      setAllPlayers(players || [])
    }, 1500) // Aumentato a 1500ms per ridurre carico DB

    return () => clearInterval(pollSession)
  }, [sessionId, resolvePlayer, router, playerData])

  // Carica risposte del player per il round corrente
  useEffect(() => {
    if (!playerData || liveQuestions.length === 0) return

    const checkAnswers = async () => {
      const {data: answers} = await supabaseClient
        .from('live_round_answers')
        .select('question_id, selected_option_id, is_correct, points')
        .eq('session_id', sessionId)
        .eq('player_id', playerData.id)
        .in(
          'question_id',
          liveQuestions.map((q) => q.id),
        )

      const selectedMap = {}
      const answersMap = {}

      answers?.forEach((answer) => {
        selectedMap[answer.question_id] = answer.selected_option_id
        answersMap[answer.question_id] = {
          optionId: answer.selected_option_id,
          isCorrect: answer.is_correct,
          points: answer.points,
        }
      })

      setSelectedAnswers(selectedMap)
      setRoundAnswers(answersMap)
      setSubmitted((answers || []).length === liveQuestions.length)
    }

    checkAnswers()
  }, [playerData, liveQuestions, sessionId])

  const handleSelect = useCallback((questionId, optionId) => {
    setSelectedAnswers((prev) => {
      if (prev[questionId] === optionId) return prev
      return {...prev, [questionId]: optionId}
    })
  }, [])

  const handleSubmitAnswers = useCallback(async () => {
    if (!playerData) return

    const allAnswered = liveQuestions.every((q) => selectedAnswers[q.id])
    if (!allAnswered) return

    try {
      const payload = liveQuestions.map((question) => ({
        session_id: sessionId,
        player_id: playerData.id,
        question_id: question.id,
        selected_option_id: selectedAnswers[question.id],
      }))

      const {error} = await supabaseClient.from('live_round_answers').upsert(payload, {
        onConflict: 'session_id,player_id,question_id',
      })

      if (error) throw error

      setRoundAnswers((prev) => {
        const next = {...prev}
        liveQuestions.forEach((question) => {
          next[question.id] = {
            optionId: selectedAnswers[question.id],
            isCorrect: null,
            points: 0,
          }
        })
        return next
      })

      setSubmitted(true)
    } catch (err) {
      console.error('Error submitting answers:', err)
    }
  }, [playerData, liveQuestions, selectedAnswers, sessionId])

  if (sessionFinished) {
    return (
      <div className={styles.container}>
        <div className={styles.finishedCard}>
          <h2>🎉 Gioco Terminato!</h2>
          <p>Redirezione alla classifica...</p>
        </div>
      </div>
    )
  }

  if (resolvingPlayer) {
    return <div className={styles.container}>Caricamento...</div>
  }

  if (loadingGameData) {
    return <div className={styles.container}>Caricamento...</div>
  }

  if (!playerData) {
    return (
      <div className={styles.container}>
        <div className={styles.finishedCard}>
          <h2>👤 Partecipante non trovato</h2>
          <p>Rientra dalla pagina di accesso alla sessione con il tuo nickname.</p>
          <button
            className={styles.submitButton}
            onClick={() => router.push(`/live/session/${sessionId}`)}>
            Torna al Join
          </button>
        </div>
      </div>
    )
  }

  if (!currentBottle || liveQuestions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.finishedCard}>
          <h2>🕒 Sessione non pronta</h2>
          <p>Attendi l'avvio del gioco da parte dell'host.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.playerInfo}>
          <span className={styles.avatar}>{APPLE_AVATARS[playerData.avatar_id - 1] || '👤'}</span>
          <span className={styles.nickname}>{playerData.nickname}</span>
        </div>
        <div className={styles.progress}>
          Bottiglia {currentBottleIndex + 1}/{liveBottles.length}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.bottleSection}>
          <h3>🍾 Bottiglia in degustazione:</h3>
          <p className={styles.bottleName}>{currentBottle.name}</p>
          {currentBottle.year && <p className={styles.bottleYear}>Annata: {currentBottle.year}</p>}
        </div>

        {roundStatus === 'waiting_answers' ? (
          <div className={styles.answerSection}>
            {liveQuestions.map((question, index) => (
              <div key={question.id} className={styles.questionBlock}>
                <h2 className={styles.question}>
                  {index + 1}. {question.text}
                </h2>

                <div className={styles.optionsGrid}>
                  {question.game_question_options
                    ?.sort((a, b) => a.option_order - b.option_order)
                    .map((option) => (
                      <button
                        key={option.id}
                        className={`${styles.optionButton} ${
                          selectedAnswers[question.id] === option.id ? styles.selected : ''
                        } ${submitted ? styles.disabled : ''}`}
                        onClick={() => handleSelect(question.id, option.id)}
                        disabled={submitted}>
                        {option.text}
                      </button>
                    ))}
                </div>
              </div>
            ))}

            <button
              onClick={handleSubmitAnswers}
              disabled={submitted || !liveQuestions.every((q) => selectedAnswers[q.id])}
              className={styles.submitButton}>
              {submitted ? '✓ Risposte Inviate' : 'Invia Risposte'}
            </button>
          </div>
        ) : (
          <div className={styles.resultsSection}>
            {liveQuestions.map((question, index) => {
              const currentAnswer = roundAnswers[question.id]
              const selectedText = question.game_question_options?.find(
                (o) => o.id === currentAnswer?.optionId,
              )?.text

              return (
                <div key={question.id} className={styles.resultCard}>
                  <h3>
                    {index + 1}. {question.text}
                  </h3>
                  <p className={styles.selectedAnswer}>{selectedText || 'N/A'}</p>

                  {currentAnswer?.isCorrect ? (
                    <div className={styles.correct}>
                      <span className={styles.icon}>✓</span>
                      <span>Corretta!</span>
                      <span className={styles.points}>+{currentAnswer.points || 0}</span>
                    </div>
                  ) : (
                    <div className={styles.incorrect}>
                      <span className={styles.icon}>✗</span>
                      <span>Non corretta</span>
                    </div>
                  )}
                </div>
              )
            })}

            <p className={styles.waitingNext}>In attesa della prossima bottiglia...</p>
          </div>
        )}
      </div>
    </div>
  )
}
