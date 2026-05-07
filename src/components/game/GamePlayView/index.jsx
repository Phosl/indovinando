'use client'

import {useMemo, useState} from 'react'
import styles from './GamePlayView.module.scss'

export default function GamePlayView({game, questions, bottles}) {
  const [activeBottleIndex, setActiveBottleIndex] = useState(0)

  const activeBottle = bottles[activeBottleIndex]

  const answerMap = useMemo(() => {
    if (!activeBottle) return new Map()
    return new Map((activeBottle.answers || []).map((a) => [a.question_id, a.option_id]))
  }, [activeBottle])

  return (
    <div className={styles.container}>
      <h1 className={styles.gameTitle}>{game.name}</h1>

      <section className={styles.sliderSection} aria-label="Bottiglie del gioco">
        <div className={styles.sliderTrack}>
          {bottles.map((bottle, idx) => (
            <button
              key={bottle.id}
              className={`${styles.bottleCard} ${idx === activeBottleIndex ? styles.activeBottle : ''}`}
              onClick={() => setActiveBottleIndex(idx)}>
              <span className={styles.bottleIndex}>Bottiglia {idx + 1}</span>
              <h3>{bottle.name || 'Senza nome'}</h3>
              <p>{bottle.producer || 'Produttore non indicato'}</p>
              <p>{bottle.year || 'Anno non indicato'}</p>
            </button>
          ))}
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.bottleHeader}>
          <span className={styles.questionNumber}>
            Bottiglia {activeBottleIndex + 1} di {bottles.length}
          </span>
          <h2>{activeBottle?.name || 'Bottiglia'}</h2>
          <p>
            {activeBottle?.producer || 'Produttore non indicato'} -{' '}
            {activeBottle?.year || 'Anno N/A'}
          </p>
        </div>

        <div className={styles.questionsList}>
          {questions.map((q, idx) => {
            const correctOptionId = answerMap.get(q.id)
            return (
              <div key={q.id} className={styles.questionBlock}>
                <div className={styles.questionHeader}>
                  <span className={styles.questionNumber}>Domanda {idx + 1}</span>
                  <p className={styles.questionTitle}>{q.text}</p>
                </div>

                <div className={styles.options}>
                  {q.options.map((opt) => {
                    const isCorrect = opt.id === correctOptionId
                    return (
                      <div
                        key={opt.id}
                        className={`${styles.option} ${isCorrect ? styles.correct : styles.wrong}`}>
                        <span className={styles.optionIcon}>{isCorrect ? '✓' : '✗'}</span>
                        <span>{opt.text}</span>
                      </div>
                    )
                  })}
                </div>

                <p className={styles.correctLabel}>Risposta corretta evidenziata in verde</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
