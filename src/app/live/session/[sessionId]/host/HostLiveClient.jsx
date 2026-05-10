'use client'

import {useState, useEffect, useCallback} from 'react'
import {useRouter} from 'next/navigation'
import {supabaseClient} from '@/lib/supabaseClient'
import TopBar from '@/components/TopBar'
import styles from './hostLive.module.scss'
import {useT} from '@/lib/i18n/useT'

export default function HostLiveClient({
  sessionId,
  gameName,
  questions,
  bottles,
  initialStatus,
  initialQuestionIndex,
}) {
  const router = useRouter()
  const t = useT('live.host')

  const [roundStatus, setRoundStatus] = useState(initialStatus) // 'waiting_answers' | 'showing_results'
  const [currentBottleIndex, setCurrentBottleIndex] = useState(initialQuestionIndex)
  const [players, setPlayers] = useState([])
  const [answers, setAnswers] = useState({}) // { playerId: { questionId: { optionId, isCorrect, points } } }
  const [sessionFinished, setSessionFinished] = useState(false)

  const currentBottle = bottles[currentBottleIndex]
  const isLastBottle = currentBottleIndex === bottles.length - 1

  // Polling: carica giocatori e risposte
  useEffect(() => {
    const pollData = setInterval(async () => {
      // Load players
      const {data: playersData} = await supabaseClient
        .from('live_players')
        .select('id, nickname, avatar_id, total_score')
        .eq('session_id', sessionId)
        .order('joined_at')

      setPlayers(playersData || [])

      // Load answers for current bottle (all questions)
      if (questions.length > 0) {
        const {data: answersData} = await supabaseClient
          .from('live_round_answers')
          .select('player_id, question_id, selected_option_id, is_correct, points')
          .eq('session_id', sessionId)
          .in(
            'question_id',
            questions.map((q) => q.id),
          )

        const answerMap = {}
        answersData?.forEach((a) => {
          if (!answerMap[a.player_id]) answerMap[a.player_id] = {}
          answerMap[a.player_id][a.question_id] = {
            optionId: a.selected_option_id,
            isCorrect: a.is_correct,
            points: a.points,
          }
        })

        setAnswers(answerMap)
      }
    }, 1500) // Aumentato a 1500ms per ridurre carico DB

    return () => clearInterval(pollData)
  }, [sessionId, questions])

  const handleShowResults = async () => {
    try {
      if (!currentBottle) return

      // Risposte correct per la bottiglia corrente (una per domanda)
      const {data: correctAnswers} = await supabaseClient
        .from('game_bottle_answers')
        .select('question_id, option_id')
        .eq('bottle_id', currentBottle.id)

      const correctByQuestion = new Map(
        (correctAnswers || []).map((a) => [a.question_id, a.option_id]),
      )
      const scoreByPlayer = new Map(players.map((p) => [p.id, p.total_score || 0]))

      // Raccogli tutti gli UPDATE in parallelo
      const updatePromises = []
      const playerScoreUpdates = []

      for (const playerId of Object.keys(answers)) {
        let roundPoints = 0

        for (const question of questions) {
          const selectedOptionId = answers[playerId]?.[question.id]?.optionId
          if (!selectedOptionId) continue

          const isCorrect = correctByQuestion.get(question.id) === selectedOptionId
          const points = isCorrect ? 10 : 0
          roundPoints += points

          // Aggiungi update al batch (non aspettare)
          updatePromises.push(
            supabaseClient
              .from('live_round_answers')
              .update({
                is_correct: isCorrect,
                points: points,
              })
              .eq('session_id', sessionId)
              .eq('player_id', playerId)
              .eq('question_id', question.id),
          )
        }

        const currentScore = scoreByPlayer.get(playerId) || 0
        const updatedScore = currentScore + roundPoints

        // Aggiungi score update al batch
        playerScoreUpdates.push(
          supabaseClient
            .from('live_players')
            .update({total_score: updatedScore})
            .eq('id', playerId),
        )

        scoreByPlayer.set(playerId, updatedScore)
      }

      // Esegui TUTTI gli update in parallelo
      await Promise.all([...updatePromises, ...playerScoreUpdates])

      // Aggiorna stato round
      const {error: roundStatusError} = await supabaseClient
        .from('live_sessions')
        .update({round_status: 'showing_results'})
        .eq('id', sessionId)

      if (roundStatusError) {
        throw roundStatusError
      }

      setRoundStatus('showing_results')
    } catch (err) {
      console.error('Error showing results:', err)
    }
  }

  const handleNextQuestion = async () => {
    try {
      if (isLastBottle) {
        // Fine del gioco
        await supabaseClient
          .from('live_sessions')
          .update({status: 'finished', finished_at: new Date().toISOString()})
          .eq('id', sessionId)

        setSessionFinished(true)
        setTimeout(() => router.push(`/live/session/${sessionId}/leaderboard`), 1500)
      } else {
        // Pulisci risposte round precedente per consentire nuove risposte sulla stessa domanda
        await supabaseClient.from('live_round_answers').delete().eq('session_id', sessionId)

        // Next bottle
        const nextIndex = currentBottleIndex + 1

        await supabaseClient
          .from('live_sessions')
          .update({
            current_question_index: nextIndex,
            round_status: 'waiting_answers',
          })
          .eq('id', sessionId)

        setCurrentBottleIndex(nextIndex)
        setRoundStatus('waiting_answers')
        setAnswers({})
      }
    } catch (err) {
      console.error('Error moving to next question:', err)
    }
  }

  const answeredCount = players.filter((player) => {
    const playerAnswers = answers[player.id] || {}
    return questions.every((question) => playerAnswers[question.id]?.optionId)
  }).length
  const correctCount = players.filter((player) => {
    const playerAnswers = answers[player.id] || {}
    return questions.every((question) => playerAnswers[question.id]?.isCorrect)
  }).length

  return (
    <div className={styles.container}>
      <TopBar title={`🎮 ${gameName}`} />

      {sessionFinished ? (
        <div className={styles.finishedCard}>
          <h2>{t('gameOverTitle')}</h2>
          <p>{t('redirecting')}</p>
        </div>
      ) : (
        <>
          <div className={styles.questionCard}>
            <div className={styles.progress}>
              Bottle {currentBottleIndex + 1} of {bottles.length}
            </div>
            <h2>{currentBottle?.name || t('bottleFallback')}</h2>
            <p>
              {t('roundQuestions')}: {questions.length}
            </p>
          </div>

          {roundStatus === 'waiting_answers' ? (
            <div className={styles.waitingCard}>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.label}>{t('playersCompleted')}</span>
                  <span className={styles.value}>
                    {answeredCount}/{players.length}
                  </span>
                </div>
              </div>

              <button
                onClick={handleShowResults}
                disabled={answeredCount === 0}
                className={styles.showResultsButton}>
                {t('showResults')}
              </button>

              <div className={styles.playersList}>
                <h3>
                  {t('playersOnline')} ({players.length})
                </h3>
                <div className={styles.playersGrid}>
                  {players.map((player) => {
                    const playerAnswers = answers[player.id] || {}
                    const completed = questions.every((q) => playerAnswers[q.id]?.optionId)
                    return (
                      <div
                        key={player.id}
                        className={`${styles.playerCard} ${completed ? styles.answered : ''}`}>
                        <span className={styles.status}>{completed ? '✓' : '⏳'}</span>
                        <p>{player.nickname}</p>
                        <span className={styles.score}>{player.total_score}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.resultsCard}>
              <div className={styles.results}>
                <div className={styles.resultStat}>
                  <span className={styles.label}>{t('playersAllCorrect')}</span>
                  <span className={styles.value}>{correctCount}</span>
                </div>
                <div className={styles.resultStat}>
                  <span className={styles.label}>{t('playersAnswered')}</span>
                  <span className={styles.value}>{answeredCount}</span>
                </div>
              </div>

              <div className={styles.topPlayers}>
                <h3>{t('topPlayers')}</h3>
                {players
                  .sort((a, b) => b.total_score - a.total_score)
                  .slice(0, 3)
                  .map((player, idx) => (
                    <div key={player.id} className={styles.topPlayerCard}>
                      <span className={styles.medal}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </span>
                      <p>{player.nickname}</p>
                      <span className={styles.score}>{player.total_score}</span>
                    </div>
                  ))}
              </div>

              <button onClick={handleNextQuestion} className={styles.nextButton}>
                {isLastBottle ? t('finishGame') : t('nextBottle')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
