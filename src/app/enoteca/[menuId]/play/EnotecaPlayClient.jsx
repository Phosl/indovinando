'use client'

import {useState, useEffect, useCallback, useMemo} from 'react'
import {useRouter, useSearchParams} from 'next/navigation'
import {supabaseClient} from '@/lib/supabaseClient'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {ENOTECA_DICTIONARY, pickLangText} from '@/lib/i18n/dictionaries'
// Reuse live-game stylesheet directly – no duplicate CSS
import styles from '../../../live/session/[sessionId]/play/playerLive.module.scss'
import {useGameAudio} from '../../../live/session/[sessionId]/play/hooks/useGameAudio'

const POINTS_CORRECT = 25

const COMBO_MESSAGES = [
  null,
  null,
  {emoji: '🔥', label: 'Combo x2!'},
  {emoji: '💥', label: 'Combo x3!!'},
  {emoji: '⚡️', label: 'Combo x4!!!'},
]
const getComboMsg = (n) =>
  n >= 5 ? {emoji: '🤯', label: `Combo x${n}!!!!`} : (COMBO_MESSAGES[n] ?? null)

const stateKey = (bottleId, questionId) => `${bottleId}:${questionId}`

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

function englishOrdinal(n) {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  const mod10 = n % 10
  if (mod10 === 1) return `${n}st`
  if (mod10 === 2) return `${n}nd`
  if (mod10 === 3) return `${n}rd`
  return `${n}th`
}

const getBottleLabel = (i, lang, fallbackSuffix) => {
  if (lang === 'en') return englishOrdinal(i + 1)
  return BOTTLE_ORDINALS[i] || `${i + 1}${fallbackSuffix}`
}

// Confetti config (static – no need to recompute per render)
const CONFETTI = Array.from({length: 18}).map((_, idx) => ({
  delay: `${idx * 45}ms`,
  x: `${(idx % 6) * 18 - 40}px`,
  rot: `${(idx % 2 === 0 ? 1 : -1) * (18 + idx * 2)}deg`,
}))

export default function EnotecaPlayClient({menuId, menuName, bottles, questions}) {
  const {lang} = useLanguage()
  const t = pickLangText(lang, ENOTECA_DICTIONARY.play)

  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionKey = `enoteca_session_${menuId}`
  const {audioEnabled, toggleAudio, playSound} = useGameAudio()

  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [bottleIndex, setBottleIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selected, setSelected] = useState({}) // { "bottleId:questionId": optionId }
  const [checked, setChecked] = useState({}) // { "bottleId:questionId": { isCorrect, points, comboCount } }
  const [screen, setScreen] = useState('question') // 'question' | 'reveal' | 'transition'
  const [comboCount, setComboCount] = useState(0)
  const [visibleCombo, setVisibleCombo] = useState(null)

  const currentBottle = bottles[bottleIndex]
  const currentQuestion = screen === 'question' ? (questions[questionIndex] ?? null) : null
  const isLastQuestion = questionIndex >= questions.length - 1
  const isLastBottle = bottleIndex >= bottles.length - 1

  const curKey =
    currentBottle && currentQuestion ? stateKey(currentBottle.id, currentQuestion.id) : null
  const isCurrentChecked = curKey ? !!checked[curKey] : false
  const curSelectedId = curKey ? selected[curKey] : null
  const curCheckedResult = curKey ? checked[curKey] : null

  // Sorted options for current question
  const currentOptions = useMemo(
    () =>
      [...(currentQuestion?.options ?? [])].sort(
        (a, b) => (a.option_order ?? 0) - (b.option_order ?? 0),
      ),
    [currentQuestion],
  )

  // Combo toast
  useEffect(() => {
    if (comboCount < 2) return
    const msg = getComboMsg(comboCount)
    if (!msg) return
    setVisibleCombo({...msg, key: Date.now()})
    const t = setTimeout(() => setVisibleCombo(null), 1600)
    return () => clearTimeout(t)
  }, [comboCount])

  // Load session on mount
  useEffect(() => {
    let savedId = null
    try {
      savedId = localStorage.getItem(sessionKey)
    } catch {
      savedId = null
    }

    const sidFromQuery = searchParams.get('sid')
    if (!savedId && sidFromQuery) {
      savedId = sidFromQuery
      try {
        localStorage.setItem(sessionKey, sidFromQuery)
      } catch {}
    }

    if (!savedId) {
      router.replace(`/enoteca/${menuId}`)
      return
    }
    supabaseClient
      .from('enoteca_tasting_sessions')
      .select('id, current_bottle_index, status')
      .eq('id', savedId)
      .single()
      .then(({data, error}) => {
        if (error || !data) {
          try {
            localStorage.removeItem(sessionKey)
          } catch {}
          router.replace(`/enoteca/${menuId}`)
          return
        }
        if (data.status === 'completed') {
          router.replace(`/enoteca/${menuId}/results`)
          return
        }
        setSessionId(data.id)
        const savedIdx = data.current_bottle_index ?? 0
        setBottleIndex(savedIdx)

        supabaseClient
          .from('enoteca_answers')
          .select('bottle_id, question_id, selected_option_id, is_correct, points')
          .eq('tasting_session_id', savedId)
          .then(({data: ans}) => {
            if (ans?.length) {
              const sel = {}
              const chk = {}
              for (const a of ans) {
                const k = stateKey(a.bottle_id, a.question_id)
                sel[k] = a.selected_option_id
                chk[k] = {isCorrect: a.is_correct, points: a.points, comboCount: 0}
              }
              setSelected(sel)
              setChecked(chk)
              const curBottle = bottles[savedIdx]
              if (curBottle) {
                const firstUnanswered = questions.findIndex(
                  (q) => !chk[stateKey(curBottle.id, q.id)],
                )
                if (firstUnanswered === -1) setScreen('reveal')
                else setQuestionIndex(firstUnanswered)
              }
            }
            setLoading(false)
          })
      })
  }, [menuId, router, searchParams, sessionKey, bottles, questions])

  const handleSelect = useCallback(
    (optionId) => {
      if (!currentQuestion || isCurrentChecked || !currentBottle) return
      setSelected((prev) => ({...prev, [stateKey(currentBottle.id, currentQuestion.id)]: optionId}))
    },
    [currentBottle, currentQuestion, isCurrentChecked],
  )

  const handleCheck = useCallback(async () => {
    if (!currentQuestion || !currentBottle || isCurrentChecked || !curSelectedId) return
    const correctOptionId = currentBottle.correctAnswers?.[currentQuestion.id]
    const isCorrect = curSelectedId === correctOptionId
    const points = isCorrect ? POINTS_CORRECT : 0
    const newCombo = isCorrect ? comboCount + 1 : 0

    const k = stateKey(currentBottle.id, currentQuestion.id)
    setComboCount(newCombo)
    setChecked((prev) => ({...prev, [k]: {isCorrect, points, comboCount: newCombo}}))
    playSound(isCorrect ? 'correct' : 'wrong')

    setSaving(true)
    await supabaseClient.from('enoteca_answers').upsert(
      {
        tasting_session_id: sessionId,
        bottle_id: currentBottle.id,
        question_id: currentQuestion.id,
        selected_option_id: curSelectedId,
        is_correct: isCorrect,
        points,
      },
      {onConflict: 'tasting_session_id,bottle_id,question_id'},
    )
    setSaving(false)
  }, [
    currentBottle,
    currentQuestion,
    curSelectedId,
    isCurrentChecked,
    comboCount,
    sessionId,
    playSound,
  ])

  const handleContinue = useCallback(() => {
    if (!isLastQuestion) {
      setQuestionIndex((i) => i + 1)
    } else {
      playSound('bottleCompleted')
      setScreen('reveal')
    }
  }, [isLastQuestion, playSound])

  const handleGoNextBottle = useCallback(async () => {
    if (isLastBottle) {
      const totalScore = Object.values(checked).reduce((sum, c) => sum + (c.points ?? 0), 0)
      await supabaseClient
        .from('enoteca_tasting_sessions')
        .update({
          status: 'completed',
          total_score: totalScore,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
      router.push(`/enoteca/${menuId}/results`)
      return
    }
    setScreen('transition')
  }, [isLastBottle, checked, sessionId, menuId, router])

  const handleAdvanceFromTransition = useCallback(async () => {
    const nextIndex = bottleIndex + 1
    await supabaseClient
      .from('enoteca_tasting_sessions')
      .update({current_bottle_index: nextIndex})
      .eq('id', sessionId)
    setBottleIndex(nextIndex)
    setQuestionIndex(0)
    setComboCount(0)
    setScreen('question')
  }, [bottleIndex, sessionId])

  // Enter key shortcut
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter') return
      if (screen === 'reveal') {
        handleGoNextBottle()
        return
      }
      if (screen === 'transition') {
        handleAdvanceFromTransition()
        return
      }
      if (!isCurrentChecked && curSelectedId) {
        handleCheck()
        return
      }
      if (isCurrentChecked) {
        handleContinue()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    screen,
    isCurrentChecked,
    curSelectedId,
    handleCheck,
    handleContinue,
    handleGoNextBottle,
    handleAdvanceFromTransition,
  ])

  if (loading) {
    return (
      <div className={styles.fullPage} style={{alignItems: 'center', justifyContent: 'center'}}>
        <p className={styles.readyHint}>{t.loading}</p>
      </div>
    )
  }

  // ── Shared top bar ────────────────────────────────────────────────────────
  const topBar = (
    <div className={styles.topBar}>
      <div className={styles.playerInfo}>
        <span className={styles.avatar}>🍷</span>
        <span className={styles.nickname}>{menuName}</span>
      </div>
      <div className={styles.progressPills}>
        {bottles.map((_, i) => (
          <span
            key={i}
            className={`${styles.pill}${
              i < bottleIndex
                ? ` ${styles.pillDone}`
                : i === bottleIndex
                  ? ` ${styles.pillActive}`
                  : ''
            }`}
          />
        ))}
      </div>
      <div className={styles.topActions}>
        <button className={styles.audioButton} onClick={toggleAudio}>
          {audioEnabled ? `🔊 ${t.audioOn}` : `🔇 ${t.audioOff}`}
        </button>
        <button
          className={styles.exitButton}
          onClick={() => router.push(`/enoteca/${menuId}`)}
          aria-label={t.exitGame}>
          ← {lang === 'en' ? 'Back' : 'Indietro'}
        </button>
      </div>
    </div>
  )

  // ── TRANSITION SCREEN ─────────────────────────────────────────────────────
  if (screen === 'transition') {
    const nextIdx = bottleIndex + 1
    return (
      <div className={styles.fullPage}>
        {topBar}
        <div className={styles.slideContent}>
          <div className={styles.transitionHero}>
            <div className={styles.confettiBurst} aria-hidden="true">
              {CONFETTI.map((c, i) => (
                <span
                  key={i}
                  className={styles.confettiPiece}
                  style={{'--c-delay': c.delay, '--c-x': c.x, '--c-rot': c.rot}}
                />
              ))}
            </div>
            <p className={styles.transitionSubtitle}>
              {t.bottle} {nextIdx + 1}/{bottles.length}
            </p>
            <h2 className={styles.transitionTitle}>
              {getBottleLabel(nextIdx, lang, t.ordinalFallback)} {t.bottle}!
            </h2>
            <p className={styles.readyHint}>{t.transitionReady}</p>
          </div>
        </div>
        <div className={styles.bottomPanel}>
          <button className={styles.continueButton} onClick={handleAdvanceFromTransition}>
            {t.letsBegin}
          </button>
        </div>
      </div>
    )
  }

  // ── REVEAL SCREEN ─────────────────────────────────────────────────────────
  if (screen === 'reveal' && currentBottle) {
    const bottleScore = questions.reduce(
      (sum, q) => sum + (checked[stateKey(currentBottle.id, q.id)]?.points ?? 0),
      0,
    )
    const correctCount = questions.filter(
      (q) => checked[stateKey(currentBottle.id, q.id)]?.isCorrect,
    ).length
    const revealTitle =
      correctCount === questions.length
        ? `🎉 ${t.perfect}`
        : correctCount > questions.length / 2
          ? `👍 ${t.wellDone}`
          : `💪 ${t.keepGoing}`

    return (
      <div className={styles.fullPage}>
        {topBar}
        <div className={styles.slideContent}>
          <div className={styles.bottleBadge}>
            {t.bottle} {bottleIndex + 1}/{bottles.length}
          </div>
          <h2 className={styles.waitTitle}>{revealTitle}</h2>

          <div className={styles.bottleReveal}>
            <span className={styles.bottleRevealLabel}>{t.bottleWas}</span>
            <span className={styles.bottleRevealName}>{currentBottle.name}</span>
            {(currentBottle.producer || currentBottle.year) && (
              <span className={styles.bottleRevealMeta}>
                {[currentBottle.producer, currentBottle.year].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>

          {questions.map((q) => {
            const k = stateKey(currentBottle.id, q.id)
            const isCorrect = checked[k]?.isCorrect
            const selectedOpt = q.options.find((o) => o.id === selected[k])
            const correctOpt = q.options.find((o) => o.id === currentBottle.correctAnswers?.[q.id])
            return (
              <div
                key={q.id}
                className={`${styles.summaryRow} ${isCorrect ? styles.summaryRowCorrect : styles.summaryRowWrong}`}>
                <div className={styles.summaryBody}>
                  <span className={styles.summaryText}>{q.text}</span>
                  <div className={styles.summaryAnswer}>
                    {isCorrect ? (
                      <span className={styles.summaryCorrect}>
                        ✅ {correctOpt?.text}
                        <span className={styles.summaryPoints}>+{checked[k]?.points ?? 0}</span>
                      </span>
                    ) : (
                      <>
                        <span className={styles.summaryWrong}>
                          ❌ {selectedOpt?.text ?? t.notAnswered}
                        </span>
                        <span className={styles.summaryCorrectHint}>
                          {t.correctAnswer} {correctOpt?.text ?? '—'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className={styles.bottomPanel}>
          <p className={styles.readyHint}>
            {correctCount}/{questions.length} {t.correct} · +{bottleScore} {t.points}
          </p>
          <button className={styles.continueButton} onClick={handleGoNextBottle}>
            {isLastBottle ? `🏆 ${t.finalResults}` : t.nextBottle}
          </button>
        </div>
      </div>
    )
  }

  // ── QUESTION SCREEN ───────────────────────────────────────────────────────
  const correctOptId = currentBottle?.correctAnswers?.[currentQuestion?.id]
  const correctOptText = currentQuestion?.options?.find((o) => o.id === correctOptId)?.text

  return (
    <div className={styles.fullPage}>
      {topBar}

      {visibleCombo && (
        <div key={visibleCombo.key} className={styles.comboToast}>
          <span className={styles.comboEmoji}>{visibleCombo.emoji}</span>
          <span className={styles.comboLabel}>{visibleCombo.label}</span>
        </div>
      )}

      <div
        className={`${styles.slideContent} ${!isCurrentChecked ? styles.mobileCheckSpacing : ''}`}>
        <div className={styles.bottleBadge}>
          {t.bottle} {bottleIndex + 1}/{bottles.length}
        </div>
        <p className={styles.questionCounter}>
          {t.question} {questionIndex + 1} {t.of} {questions.length}
        </p>
        <h2 className={styles.questionText}>{currentQuestion?.text}</h2>

        <div className={styles.optionsList}>
          {currentOptions.map((opt) => {
            const isSelected = curSelectedId === opt.id
            const isCorrect = opt.id === correctOptId
            let cls = styles.optionButton
            if (isCurrentChecked) {
              if (isCorrect) cls = `${styles.optionButton} ${styles.optCorrect}`
              else if (isSelected) cls = `${styles.optionButton} ${styles.optWrong}`
              else cls = `${styles.optionButton} ${styles.optDimmed}`
            } else if (isSelected) {
              cls = `${styles.optionButton} ${styles.optSelected}`
            }
            return (
              <button
                key={opt.id}
                className={cls}
                disabled={isCurrentChecked || saving}
                onClick={() => !isCurrentChecked && handleSelect(opt.id)}>
                {opt.text}
              </button>
            )
          })}
        </div>
      </div>

      <div
        className={`${styles.bottomPanel} ${!isCurrentChecked ? styles.mobileCheckFixed : ''} ${
          isCurrentChecked
            ? curCheckedResult?.isCorrect
              ? styles.bottomCorrect
              : styles.bottomWrong
            : ''
        }`}>
        {isCurrentChecked && (
          <div className={styles.resultFeedback}>
            {curCheckedResult?.isCorrect ? (
              <>
                <span className={styles.feedbackIcon}>
                  {curCheckedResult.comboCount >= 2 ? '🔥' : '🎉'}
                </span>
                <span className={styles.feedbackLabel}>
                  {curCheckedResult.comboCount >= 2
                    ? `Combo x${curCheckedResult.comboCount}! +${curCheckedResult.points}`
                    : `${t.comboCorrect} +${curCheckedResult.points}`}
                </span>
              </>
            ) : (
              <>
                <span className={styles.feedbackIcon}>💡</span>
                <span className={styles.feedbackLabel}>
                  {t.correctAnswer} <strong>{correctOptText}</strong>
                </span>
              </>
            )}
          </div>
        )}

        {!isCurrentChecked ? (
          <button
            className={styles.checkButton}
            disabled={!curSelectedId || saving}
            onClick={handleCheck}>
            {saving ? t.saving : t.check}
          </button>
        ) : (
          <button className={styles.continueButton} onClick={handleContinue}>
            {isLastQuestion ? `🍷 ${t.revealWine}` : t.continue}
          </button>
        )}
      </div>
    </div>
  )
}
