'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabaseClient'
import styles from './enotecaResults.module.scss'

export default function EnotecaResultsClient({ menuId, menuName, bottles, questions, options }) {
  const router = useRouter()
  const sessionKey = `enoteca_session_${menuId}`

  const [session, setSession] = useState(null)
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedBottle, setExpandedBottle] = useState(null)

  // Derived lookups
  const questionsByBottle = useMemo(() => {
    const map = {}
    for (const bottle of bottles) {
      map[bottle.id] = questions
        .filter((q) => q.bottle_id === bottle.id)
        .sort((a, b) => a.question_order - b.question_order)
    }
    return map
  }, [bottles, questions])

  const optionsByQuestion = useMemo(() => {
    const map = {}
    for (const opt of options) {
      if (!map[opt.question_id]) map[opt.question_id] = []
      map[opt.question_id].push(opt)
    }
    return map
  }, [options])

  const answersByQuestion = useMemo(() => {
    const map = {}
    for (const a of answers) map[a.question_id] = a
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
        .select('question_id, selected_option_id, is_correct, points')
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
  const totalQuestions = questions.length
  const pct = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0

  const handlePlayAgain = () => {
    localStorage.removeItem(sessionKey)
    router.push(`/enoteca/${menuId}`)
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.hero}>
        <span className={styles.heroIcon}>🏆</span>
        <h1 className={styles.heroTitle}>Degustazione completata!</h1>
        <p className={styles.heroNickname}>{session.nickname}</p>
        {session.table_name && (
          <p className={styles.heroTable}>Tavolo: {session.table_name}</p>
        )}
      </div>

      {/* Score summary */}
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

      {/* Per-bottle breakdown */}
      <div className={styles.breakdown}>
        <h2 className={styles.breakdownTitle}>Dettaglio per bottiglia</h2>

        {bottles.map((bottle, i) => {
          const bqs = questionsByBottle[bottle.id] ?? []
          const bCorrect = bqs.filter((q) => answersByQuestion[q.id]?.is_correct).length
          const bScore = bqs.reduce((sum, q) => sum + (answersByQuestion[q.id]?.points ?? 0), 0)
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
                      <p className={styles.bottleCardProducer}>{bottle.producer}</p>
                    )}
                  </div>
                </div>
                <div className={styles.bottleCardRight}>
                  <span className={styles.bottleScore}>+{bScore}</span>
                  <span className={styles.bottleRatio}>{bCorrect}/{bqs.length}</span>
                  <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isOpen && (
                <div className={styles.bottleDetails}>
                  {bqs.map((q) => {
                    const answer = answersByQuestion[q.id]
                    const qOptions = optionsByQuestion[q.id] ?? []
                    const selectedOpt = qOptions.find((o) => o.id === answer?.selected_option_id)
                    const correctOpt = qOptions.find((o) => o.is_correct)

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

      {/* Actions */}
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
