'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabaseClient'
import styles from './enotecaResults.module.scss'

const stateKey = (bottleId, questionId) => `${bottleId}:${questionId}`

export default function EnotecaResultsClient({ menuId, menuName, bottles, questions }) {
  const router = useRouter()
  const sessionKey = `enoteca_session_${menuId}`

  const [session, setSession] = useState(null)
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedBottle, setExpandedBottle] = useState(null)

  // { "bottleId:questionId": answer }
  const answersByKey = useMemo(() => {
    const map = {}
    for (const a of answers) map[stateKey(a.bottle_id, a.question_id)] = a
    return map
  }, [answers])

  useEffect(() => {
    const savedId = localStorage.getItem(sessionKey)
    if (!savedId) { router.replace(`/enoteca/${menuId}`); return }

    Promise.all([
      supabaseClient
        .from('enoteca_tasting_sessions')
        .select('id, nickname, table_name, total_score, status, completed_at')
        .eq('id', savedId)
        .single(),
      supabaseClient
        .from('enoteca_answers')
        .select('bottle_id, question_id, selected_option_id, is_correct, points')
        .eq('tasting_session_id', savedId),
    ]).then(([{ data: sess }, { data: ans }]) => {
      if (!sess) { router.replace(`/enoteca/${menuId}`); return }
      setSession(sess)
      setAnswers(ans ?? [])
      setLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
        <p>Caricamento risultati…</p>
      </div>
    )
  }

  const totalScore = answers.reduce((sum, a) => sum + (a.points ?? 0), 0)
  const totalCorrect = answers.filter((a) => a.is_correct).length
  const totalQuestions = bottles.length * questions.length
  const pct = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0

  const handlePlayAgain = () => {
    localStorage.removeItem(sessionKey)
    router.push(`/enoteca/${menuId}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <span className={styles.heroIcon}>🏆</span>
        <h1 className={styles.heroTitle}>Degustazione completata!</h1>
        <p className={styles.heroNickname}>{session.nickname}</p>
        {session.table_name && (
          <p className={styles.heroTable}>Tavolo: {session.table_name}</p>
        )}
      </div>

      <div className={styles.scoreSummary}>
        <div className={styles.scoreMain}>
          <span className={styles.scoreValue}>{totalScore}</span>
          <span className={styles.scoreLabel}>punti</span>
        </div>
        <div className={styles.scoreMeta}>
          <span className={styles.pct}>{pct}%</span>
          <span className={styles.pctLabel}>{totalCorrect}/{totalQuestions} corrette</span>
        </div>
      </div>

      <div className={styles.breakdown}>
        <h2 className={styles.breakdownTitle}>Dettaglio per bottiglia</h2>

        {bottles.map((bottle, i) => {
          const bCorrect = questions.filter((q) => answersByKey[stateKey(bottle.id, q.id)]?.is_correct).length
          const bScore = questions.reduce((sum, q) => sum + (answersByKey[stateKey(bottle.id, q.id)]?.points ?? 0), 0)
          const isOpen = expandedBottle === bottle.id

          return (
            <div key={bottle.id} className={styles.bottleCard}>
              <button
                className={styles.bottleCardHeader}
                onClick={() => setExpandedBottle(isOpen ? null : bottle.id)}
              >
                <div className={styles.bottleCardLeft}>
                  <span className={styles.bottleNum}>#{i + 1}</span>
                  <div>
                    <p className={styles.bottleCardName}>{bottle.name}</p>
                    {bottle.producer && (
                      <p className={styles.bottleCardProducer}>{bottle.producer}{bottle.year ? ` · ${bottle.year}` : ''}</p>
                    )}
                  </div>
                </div>
                <div className={styles.bottleCardRight}>
                  <span className={styles.bottleScore}>+{bScore}</span>
                  <span className={styles.bottleRatio}>{bCorrect}/{questions.length}</span>
                  <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isOpen && (
                <div className={styles.bottleDetails}>
                  {questions.map((q) => {
                    const answer = answersByKey[stateKey(bottle.id, q.id)]
                    const selectedOpt = q.options.find((o) => o.id === answer?.selected_option_id)
                    const correctOptId = bottle.correctAnswers?.[q.id]
                    const correctOpt = q.options.find((o) => o.id === correctOptId)

                    return (
                      <div
                        key={q.id}
                        className={`${styles.answerRow} ${answer?.is_correct ? styles.answerCorrect : styles.answerWrong}`}
                      >
                        <p className={styles.answerQuestion}>{q.text}</p>
                        {!answer?.is_correct && (
                          <p className={styles.answerYours}>
                            <span className={styles.answerYoursLabel}>Tu: </span>
                            {selectedOpt?.text ?? '—'}
                          </p>
                        )}
                        <p className={styles.answerCorrectText}>
                          {answer?.is_correct ? '✓ ' : 'Risposta: '}
                          {correctOpt?.text ?? '—'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className={styles.actions}>
        <button className={styles.btnSecondary} onClick={handlePlayAgain}>
          🍷 Nuova degustazione
        </button>
        <button className={styles.btnText} onClick={() => router.push('/')}>
          Torna alla home
        </button>
      </div>
    </div>
  )
}
