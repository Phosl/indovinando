'use client'

import {useMemo, useState} from 'react'
import styles from './GamePlayView.module.scss'

export default function GamePlayView({game, questions, bottles}) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [roundAnswers, setRoundAnswers] = useState([])
  const [completedRounds, setCompletedRounds] = useState(0)

  const currentBottle = bottles[roundIndex]

  const totalQuestions = questions.length
  const isGameCompleted = completedRounds === bottles.length

  const finalResult = useMemo(() => {
    if (!isGameCompleted) return null

    let totalCorrectAnswers = 0
    const perBottle = bottles.map((bottle, idx) => {
      const savedRound = roundAnswers[idx]?.answers || {}
      const keyMap = new Map((bottle.answers || []).map((a) => [a.question_id, a.option_id]))

      const correct = questions.reduce((acc, q) => {
        return acc + (savedRound[q.id] === keyMap.get(q.id) ? 1 : 0)
      }, 0)

      totalCorrectAnswers += correct

      return {
        bottleName: `${bottle.name} (${bottle.producer} - ${bottle.year})`,
        correct,
      }
    })

    return {
      totalCorrectAnswers,
      maxScore: bottles.length * questions.length,
      perBottle,
    }
  }, [bottles, isGameCompleted, questions, roundAnswers])

  function handleSelect(questionId, optionId) {
    if (submitted) return
    setAnswers((prev) => ({...prev, [questionId]: optionId}))
  }

  function handleSubmitRound() {
    if (submitted) return

    if (Object.keys(answers).length !== totalQuestions) {
      alert('Rispondi a tutte le domande prima di confermare.')
      return
    }

    setRoundAnswers((prev) => {
      const updated = [...prev]
      updated[roundIndex] = {
        bottleId: currentBottle.id,
        answers: {...answers},
      }
      return updated
    })

    setSubmitted(true)
  }

  function handleNextRound() {
    setCompletedRounds((prev) => prev + 1)
    setRoundIndex((prev) => prev + 1)
    setAnswers({})
    setSubmitted(false)
  }

  function restartGame() {
    setRoundIndex(0)
    setAnswers({})
    setSubmitted(false)
    setRoundAnswers([])
    setCompletedRounds(0)
  }

  if (isGameCompleted) {
    return (
      <div className={styles.container}>
        <h1>{game.name}</h1>
        <div className={styles.summaryCard}>
          <h2>Partita completata 🎉</h2>
          <p>
            Punteggio finale: <strong>{finalResult?.totalCorrectAnswers || 0}</strong> /{' '}
            {finalResult?.maxScore || 0}
          </p>

          <div className={styles.finalList}>
            {(finalResult?.perBottle || []).map((row, idx) => (
              <p key={`${row.bottleName}-${idx}`} className={styles.finalRow}>
                {idx + 1}. {row.bottleName} → <strong>{row.correct}</strong> / {questions.length}
              </p>
            ))}
          </div>

          <button className="btn primary" onClick={restartGame}>
            Rigioca
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h1>{game.name}</h1>
      <p className={styles.progress}>
        Bottiglia {roundIndex + 1} di {bottles.length}
      </p>

      <div className={styles.card}>
        <h2>Indovina la bottiglia 🍷</h2>

        <div className={styles.questionsList}>
          {questions.map((q, idx) => (
            <div key={q.id} className={styles.questionBlock}>
              <p className={styles.questionTitle}>
                {idx + 1}. {q.text}
              </p>

              <div className={styles.options}>
                {q.options.map((opt) => {
                  const isSelected = answers[q.id] === opt.id

                  let optionClass = styles.option
                  if (!submitted && isSelected) optionClass += ` ${styles.selected}`

                  return (
                    <button
                      key={opt.id}
                      className={optionClass}
                      onClick={() => handleSelect(q.id, opt.id)}
                      disabled={submitted}>
                      {opt.text}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {!submitted ? (
          <button className="btn primary" onClick={handleSubmitRound}>
            Conferma risposte
          </button>
        ) : (
          <div className={styles.resultBox}>
            <p>Risposte salvate. Passa alla prossima bottiglia.</p>

            {roundIndex < bottles.length - 1 ? (
              <button className="btn primary" onClick={handleNextRound}>
                Prossima bottiglia
              </button>
            ) : (
              <button className="btn primary" onClick={() => setCompletedRounds(bottles.length)}>
                Termina partita
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
