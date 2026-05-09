'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabaseClient'
import styles from './enotecaPlay.module.scss'

const POINTS_CORRECT = 25

// Key per stato: combinazione bottiglia+domanda (stessa domanda su più bottiglie)
const stateKey = (bottleId, questionId) => `${bottleId}:${questionId}`

export default function EnotecaPlayClient({ menuId, menuName, bottles, questions }) {
  const router = useRouter()
  const sessionKey = `enoteca_session_${menuId}`

  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [bottleIndex, setBottleIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  // { "bottleId:questionId": optionId }
  const [selected, setSelected] = useState({})
  // { "bottleId:questionId": { isCorrect, points } }
  const [checked, setChecked] = useState({})
  const [showReveal, setShowReveal] = useState(false)

  const currentBottle = bottles[bottleIndex]
  const currentQuestion = questions[questionIndex] ?? null
  const currentOptions = currentQuestion?.options ?? []
  const isLastQuestion = questionIndex >= questions.length - 1
  const isLastBottle = bottleIndex >= bottles.length - 1

  const curKey = currentBottle && currentQuestion ? stateKey(currentBottle.id, currentQuestion.id) : null
  const isCurrentChecked = curKey ? !!checked[curKey] : false

  // On mount: carica/verifica sessione e risposte esistenti
  useEffect(() => {
    const savedId = localStorage.getItem(sessionKey)
    if (!savedId) {
      router.replace(`/enoteca/${menuId}`)
      return
    }

    supabaseClient
      .from('enoteca_tasting_sessions')
      .select('id, current_bottle_index, status')
      .eq('id', savedId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          localStorage.removeItem(sessionKey)
          router.replace(`/enoteca/${menuId}`)
          return
        }
        if (data.status === 'completed') {
          router.replace(`/enoteca/${menuId}/results`)
          return
        }

        setSessionId(data.id)
        const savedBottleIdx = data.current_bottle_index ?? 0
        setBottleIndex(savedBottleIdx)

        // Carica risposte esistenti per riprendere
        supabaseClient
          .from('enoteca_answers')
          .select('bottle_id, question_id, selected_option_id, is_correct, points')
          .eq('tasting_session_id', savedId)
          .then(({ data: answers }) => {
            if (answers?.length) {
              const sel = {}
              const chk = {}
              for (const a of answers) {
                const k = stateKey(a.bottle_id, a.question_id)
                sel[k] = a.selected_option_id
                chk[k] = { isCorrect: a.is_correct, points: a.points }
              }
              setSelected(sel)
              setChecked(chk)

              // Riprendi dalla prima domanda non risposta in questa bottiglia
              const curBottle = bottles[savedBottleIdx]
              if (curBottle) {
                const firstUnanswered = questions.findIndex((q) => !chk[stateKey(curBottle.id, q.id)])
                if (firstUnanswered === -1) {
                  setShowReveal(true)
                } else {
                  setQuestionIndex(firstUnanswered)
                }
              }
            }
            setLoading(false)
          })
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback((optionId) => {
    if (!currentQuestion || isCurrentChecked || !currentBottle) return
    const k = stateKey(currentBottle.id, currentQuestion.id)
    setSelected((prev) => ({ ...prev, [k]: optionId }))
  }, [currentBottle, currentQuestion, isCurrentChecked])

  const handleCheck = useCallback(async () => {
    if (!currentQuestion || !currentBottle || isCurrentChecked) return
    const k = stateKey(currentBottle.id, currentQuestion.id)
    const selectedOptionId = selected[k]
    if (!selectedOptionId) return

    // La risposta corretta è in bottle.correctAnswers (da game_bottle_answers)
    const correctOptionId = currentBottle.correctAnswers?.[currentQuestion.id]
    const isCorrect = selectedOptionId === correctOptionId
    const points = isCorrect ? POINTS_CORRECT : 0

    // Ottimistica UI
    setChecked((prev) => ({ ...prev, [k]: { isCorrect, points } }))

    setSaving(true)
    await supabaseClient.from('enoteca_answers').upsert(
      {
        tasting_session_id: sessionId,
        bottle_id: currentBottle.id,
        question_id: currentQuestion.id,
        selected_option_id: selectedOptionId,
        is_correct: isCorrect,
        points,
      },
      { onConflict: 'tasting_session_id,bottle_id,question_id' }
    )
    setSaving(false)
  }, [currentBottle, currentQuestion, selected, isCurrentChecked, sessionId])

  const handleContinue = useCallback(() => {
    if (!isLastQuestion) {
      setQuestionIndex((i) => i + 1)
      return
    }
    setShowReveal(true)
  }, [isLastQuestion])

  const handleNextBottle = useCallback(async () => {
    const nextIndex = bottleIndex + 1

    if (isLastBottle) {
      const totalScore = Object.values(checked).reduce((sum, c) => sum + (c.points ?? 0), 0)
      await supabaseClient
        .from('enoteca_tasting_sessions')
        .update({ status: 'completed', total_score: totalScore, completed_at: new Date().toISOString() })
        .eq('id', sessionId)
      router.push(`/enoteca/${menuId}/results`)
      return
    }

    await supabaseClient
      .from('enoteca_tasting_sessions')
      .update({ current_bottle_index: nextIndex })
      .eq('id', sessionId)

    setBottleIndex(nextIndex)
    setQuestionIndex(0)
    setShowReveal(false)
  }, [bottleIndex, isLastBottle, checked, sessionId, menuId, router])

  // Tasto Invio
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter') return
      if (showReveal) { handleNextBottle(); return }
      if (!isCurrentChecked) { handleCheck(); return }
      handleContinue()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showReveal, isCurrentChecked, handleCheck, handleContinue, handleNextBottle])

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
        <p>Caricamento…</p>
      </div>
    )
  }

  // ── REVEAL SCREEN ─────────────────────────────────────────────────────────
  if (showReveal && currentBottle) {
    const bottleScore = questions.reduce((sum, q) => {
      const k = stateKey(currentBottle.id, q.id)
      return sum + (checked[k]?.points ?? 0)
    }, 0)
    const correctCount = questions.filter((q) => checked[stateKey(currentBottle.id, q.id)]?.isCorrect).length

    return (
      <div className={styles.page}>
        <div className={styles.reveal}>
          <div className={styles.revealHeader}>
            <span className={styles.revealIcon}>🍷</span>
            <div className={styles.revealBadge}>
              Bottiglia {bottleIndex + 1} / {bottles.length}
            </div>
            <h2 className={styles.revealTitle}>{currentBottle.name}</h2>
            {currentBottle.producer && (
              <p className={styles.revealProducer}>{currentBottle.producer}</p>
            )}
            {currentBottle.year && (
              <div className={styles.revealMeta}>
                <span>{currentBottle.year}</span>
              </div>
            )}
          </div>

          <div className={styles.revealScore}>
            <span className={styles.revealScoreValue}>+{bottleScore}</span>
            <span className={styles.revealScoreLabel}>
              {correctCount}/{questions.length} corrette
            </span>
          </div>

          <div className={styles.revealAnswers}>
            {questions.map((q) => {
              const k = stateKey(currentBottle.id, q.id)
              const selectedOptId = selected[k]
              const correctOptId = currentBottle.correctAnswers?.[q.id]
              const isCorrect = checked[k]?.isCorrect
              const selectedOpt = q.options.find((o) => o.id === selectedOptId)
              const correctOpt = q.options.find((o) => o.id === correctOptId)

              return (
                <div key={q.id} className={`${styles.revealAnswer} ${isCorrect ? styles.revealCorrect : styles.revealWrong}`}>
                  <p className={styles.revealQuestion}>{q.text}</p>
                  {!isCorrect && (
                    <p className={styles.revealYourAnswer}>
                      <span className={styles.revealYourLabel}>Tu: </span>
                      {selectedOpt?.text ?? '—'}
                    </p>
                  )}
                  <p className={styles.revealCorrectAnswer}>
                    <span className={styles.revealCorrectLabel}>
                      {isCorrect ? '✓ ' : 'Risposta: '}
                    </span>
                    {correctOpt?.text ?? '—'}
                  </p>
                </div>
              )
            })}
          </div>

          <button className={styles.btnPrimary} onClick={handleNextBottle}>
            {isLastBottle ? '🏆 Vedi risultati finali' : 'Prossima bottiglia →'}
          </button>
        </div>
      </div>
    )
  }

  // ── QUESTION SCREEN ───────────────────────────────────────────────────────
  const curSelectedId = curKey ? selected[curKey] : null

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.topBarMeta}>
          <span className={styles.topBarMenu}>{menuName}</span>
          <span className={styles.topBarProgress}>
            Bottiglia {bottleIndex + 1}/{bottles.length}
          </span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${(bottleIndex / bottles.length) * 100}%` }}
          />
        </div>
      </div>

      <div className={styles.questionArea}>
        <div className={styles.questionCounter}>
          Domanda {questionIndex + 1} / {questions.length}
        </div>
        <h2 className={styles.questionText}>{currentQuestion?.text}</h2>

        <div className={styles.options}>
          {currentOptions.map((opt) => {
            const isSelected = curSelectedId === opt.id
            const isChecked = isCurrentChecked
            const correctOptId = currentBottle?.correctAnswers?.[currentQuestion?.id]
            const isCorrect = opt.id === correctOptId
            let cls = styles.option
            if (isChecked && isCorrect) cls += ` ${styles.optionCorrect}`
            else if (isChecked && isSelected && !isCorrect) cls += ` ${styles.optionWrong}`
            else if (!isChecked && isSelected) cls += ` ${styles.optionSelected}`

            return (
              <button key={opt.id} className={cls} onClick={() => handleSelect(opt.id)}>
                {opt.text}
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.footer}>
        {!isCurrentChecked ? (
          <button
            className={styles.btnPrimary}
            disabled={!curSelectedId || saving}
            onClick={handleCheck}
          >
            {saving ? 'Salvo…' : 'Controlla'}
          </button>
        ) : (
          <button className={styles.btnPrimary} onClick={handleContinue}>
            {isLastQuestion ? '🍷 Scopri il vino' : 'Continua →'}
          </button>
        )}
      </div>
    </div>
  )
}
