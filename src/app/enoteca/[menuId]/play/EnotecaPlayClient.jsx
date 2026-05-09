'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabaseClient'
import styles from './enotecaPlay.module.scss'

const POINTS_CORRECT = 25

export default function EnotecaPlayClient({ menuId, menuName, bottles, questions, options }) {
  const router = useRouter()
  const sessionKey = `enoteca_session_${menuId}`

  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // bottleIndex: which bottle we're on
  const [bottleIndex, setBottleIndex] = useState(0)
  // questionIndex: which question within the current bottle
  const [questionIndex, setQuestionIndex] = useState(0)
  // selected option per question: { [questionId]: optionId }
  const [selected, setSelected] = useState({})
  // checked questions (after hitting "Controlla"): { [questionId]: { isCorrect, points } }
  const [checked, setChecked] = useState({})
  // whether we're showing the bottle reveal screen
  const [showReveal, setShowReveal] = useState(false)

  // Derived data memoized
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

  const currentBottle = bottles[bottleIndex]
  const currentBottleQuestions = currentBottle ? (questionsByBottle[currentBottle.id] ?? []) : []
  const currentQuestion = currentBottleQuestions[questionIndex] ?? null
  const currentOptions = currentQuestion ? (optionsByQuestion[currentQuestion.id] ?? []) : []

  const isLastQuestion = questionIndex >= currentBottleQuestions.length - 1
  const isLastBottle = bottleIndex >= bottles.length - 1
  const isCurrentChecked = currentQuestion ? !!checked[currentQuestion.id] : false

  // On mount: load or verify session from localStorage
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
        setBottleIndex(data.current_bottle_index ?? 0)

        // Load existing answers to restore state
        supabaseClient
          .from('enoteca_answers')
          .select('question_id, selected_option_id, is_correct, points')
          .eq('tasting_session_id', savedId)
          .then(({ data: answers }) => {
            if (answers?.length) {
              const sel = {}
              const chk = {}
              for (const a of answers) {
                sel[a.question_id] = a.selected_option_id
                chk[a.question_id] = { isCorrect: a.is_correct, points: a.points }
              }
              setSelected(sel)
              setChecked(chk)

              // Advance questionIndex to the first unanswered question in the current bottle
              const currentB = bottles[data.current_bottle_index ?? 0]
              if (currentB) {
                const bqs = (questionsByBottle[currentB.id] ?? [])
                const firstUnanswered = bqs.findIndex((q) => !chk[q.id])
                if (firstUnanswered === -1) {
                  // All answered → show reveal
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
    if (!currentQuestion || isCurrentChecked) return
    setSelected((prev) => ({ ...prev, [currentQuestion.id]: optionId }))
  }, [currentQuestion, isCurrentChecked])

  const handleCheck = useCallback(async () => {
    if (!currentQuestion || !selected[currentQuestion.id] || isCurrentChecked) return

    const selectedOptionId = selected[currentQuestion.id]
    const opt = currentOptions.find((o) => o.id === selectedOptionId)
    const isCorrect = opt?.is_correct ?? false
    const points = isCorrect ? POINTS_CORRECT : 0

    // Optimistic UI
    setChecked((prev) => ({ ...prev, [currentQuestion.id]: { isCorrect, points } }))

    setSaving(true)
    await supabaseClient.from('enoteca_answers').upsert(
      {
        tasting_session_id: sessionId,
        question_id: currentQuestion.id,
        selected_option_id: selectedOptionId,
        is_correct: isCorrect,
        points,
      },
      { onConflict: 'tasting_session_id,question_id' }
    )
    setSaving(false)
  }, [currentQuestion, currentOptions, selected, isCurrentChecked, sessionId])

  const handleContinue = useCallback(() => {
    if (!isLastQuestion) {
      setQuestionIndex((i) => i + 1)
      return
    }
    // All questions for this bottle answered → show reveal
    setShowReveal(true)
  }, [isLastQuestion])

  const handleNextBottle = useCallback(async () => {
    const nextIndex = bottleIndex + 1

    if (isLastBottle) {
      // Mark session completed
      const totalScore = Object.values(checked).reduce((sum, c) => sum + (c.points ?? 0), 0)
      await supabaseClient
        .from('enoteca_tasting_sessions')
        .update({ status: 'completed', total_score: totalScore, completed_at: new Date().toISOString() })
        .eq('id', sessionId)
      router.push(`/enoteca/${menuId}/results`)
      return
    }

    // Advance to next bottle
    await supabaseClient
      .from('enoteca_tasting_sessions')
      .update({ current_bottle_index: nextIndex })
      .eq('id', sessionId)

    setBottleIndex(nextIndex)
    setQuestionIndex(0)
    setShowReveal(false)
  }, [bottleIndex, isLastBottle, checked, sessionId, menuId, router])

  // Keyboard support
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

  // ── REVEAL SCREEN ────────────────────────────────────────────────────────────
  if (showReveal) {
    const bottleQs = currentBottleQuestions
    const bottleScore = bottleQs.reduce((sum, q) => sum + (checked[q.id]?.points ?? 0), 0)
    const correctCount = bottleQs.filter((q) => checked[q.id]?.isCorrect).length

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
            <div className={styles.revealMeta}>
              {currentBottle.year && <span>{currentBottle.year}</span>}
              {currentBottle.region && <span>{currentBottle.region}</span>}
              {currentBottle.varietal && <span>{currentBottle.varietal}</span>}
            </div>
            {currentBottle.description && (
              <p className={styles.revealDescription}>{currentBottle.description}</p>
            )}
          </div>

          <div className={styles.revealScore}>
            <span className={styles.revealScoreValue}>+{bottleScore}</span>
            <span className={styles.revealScoreLabel}>
              {correctCount}/{bottleQs.length} corrette
            </span>
          </div>

          <div className={styles.revealAnswers}>
            {bottleQs.map((q) => {
              const qOptions = optionsByQuestion[q.id] ?? []
              const selectedOpt = qOptions.find((o) => o.id === selected[q.id])
              const correctOpt = qOptions.find((o) => o.is_correct)
              const isCorrect = checked[q.id]?.isCorrect

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

  // ── QUESTION SCREEN ──────────────────────────────────────────────────────────
  const selectedId = currentQuestion ? selected[currentQuestion.id] : null

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
            style={{ width: `${((bottleIndex) / bottles.length) * 100}%` }}
          />
        </div>
      </div>

      <div className={styles.questionArea}>
        <div className={styles.questionCounter}>
          Domanda {questionIndex + 1} / {currentBottleQuestions.length}
        </div>
        <h2 className={styles.questionText}>{currentQuestion?.text}</h2>

        <div className={styles.options}>
          {currentOptions.map((opt) => {
            const isSelected = selectedId === opt.id
            const isChecked = isCurrentChecked
            const isCorrect = opt.is_correct
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
            disabled={!selectedId || saving}
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
