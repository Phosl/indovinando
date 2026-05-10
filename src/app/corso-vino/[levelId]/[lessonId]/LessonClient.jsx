'use client'

import {useState, useCallback, useEffect, useRef} from 'react'
import {useRouter} from 'next/navigation'
// Reuse live-game fullscreen shell styles
import pStyles from '../../../live/session/[sessionId]/play/playerLive.module.scss'
import xStyles from './lesson.module.scss'
import {useWineCourseProgress} from '../../hooks/useWineCourseProgress'
import {useGameAudio} from '../../../live/session/[sessionId]/play/hooks/useGameAudio'
import {useLanguage} from '@/components/i18n/LanguageProvider'

export default function LessonClient({level, lesson, nextLessonId}) {
  const router = useRouter()
  const {completeLesson} = useWineCourseProgress()
  const {audioEnabled, toggleAudio, playSound} = useGameAudio()
  const {lang} = useLanguage()
  const isEnglish = lang === 'en'

  // 'intro' | 'question' | 'result'
  const [screen, setScreen] = useState('intro')
  const [didacticIndex, setDidacticIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [checked, setChecked] = useState(false)
  const [answers, setAnswers] = useState([]) // [{questionId, selectedId, isCorrect}]
  const [comboStreak, setComboStreak] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [comboBonus, setComboBonus] = useState(0)
  const [visibleCombo, setVisibleCombo] = useState(null)
  const [slideMotion, setSlideMotion] = useState('idle')
  const timersRef = useRef([])

  const COMBO_MESSAGES = [
    null,
    null,
    {emoji: '🔥', label: 'Combo x2!'},
    {emoji: '💥', label: 'Combo x3!!'},
    {emoji: '⚡️', label: 'Combo x4!!!'},
  ]

  const getComboMsg = useCallback((n) => {
    return n >= 5 ? {emoji: '🤯', label: `Combo x${n}!!!!`} : (COMBO_MESSAGES[n] ?? null)
  }, [])

  const didacticSlides = lesson.didacticSlides?.length
    ? lesson.didacticSlides
    : [
        {
          id: 's1',
          title: lesson.intro.title,
          paragraphs: lesson.intro.paragraphs,
          keyPoints: lesson.intro.keyPoints ?? [],
        },
      ]
  const currentDidacticSlide = didacticSlides[didacticIndex]
  const didacticIsLast = didacticIndex >= didacticSlides.length - 1

  const questions = lesson.questions
  const currentQuestion = questions[questionIndex]
  const isLastQuestion = questionIndex >= questions.length - 1
  const correctId = currentQuestion?.correctId

  const isCorrect = checked && selectedId === correctId
  const nextLessonPath = nextLessonId ? `/corso-vino/${level.id}/${nextLessonId}` : null
  const isSlideTransitioning = slideMotion !== 'idle'
  const slideMotionClass =
    slideMotion === 'exiting'
      ? pStyles.slideExitLeft
      : slideMotion === 'entering'
        ? pStyles.slideEnterRight
        : ''

  const getComboBonus = useCallback((nextStreak) => {
    if (nextStreak >= 4) return 15
    if (nextStreak === 3) return 10
    if (nextStreak === 2) return 5
    return 0
  }, [])

  const handleCheck = useCallback(() => {
    if (!selectedId || checked || isSlideTransitioning) return
    const correct = selectedId === correctId
    const nextStreak = correct ? comboStreak + 1 : 0
    const bonus = correct ? getComboBonus(nextStreak) : 0

    setComboStreak(nextStreak)
    setMaxCombo((prev) => Math.max(prev, nextStreak))
    if (bonus > 0) {
      setComboBonus((prev) => prev + bonus)
    }

    setChecked(true)
    playSound(correct ? 'correct' : 'wrong')
    setAnswers((prev) => [
      ...prev,
      {questionId: currentQuestion.id, selectedId, isCorrect: correct, combo: nextStreak, bonus},
    ])
  }, [selectedId, checked, correctId, currentQuestion, playSound, comboStreak, getComboBonus])

  const handleDidacticContinue = useCallback(() => {
    if (!didacticIsLast) {
      setDidacticIndex((i) => i + 1)
      return
    }
    setScreen('question')
  }, [didacticIsLast])

  const handleContinue = useCallback(() => {
    if (isSlideTransitioning) return

    if (!isLastQuestion) {
      setSlideMotion('exiting')

      const exitTimer = window.setTimeout(() => {
        setQuestionIndex((i) => i + 1)
        setSelectedId(null)
        setChecked(false)
        setSlideMotion('entering')

        const enterTimer = window.setTimeout(() => {
          setSlideMotion('idle')
        }, 220)

        timersRef.current.push(enterTimer)
      }, 220)

      timersRef.current.push(exitTimer)
    } else {
      const score = answers.filter((a) => a.isCorrect).length + (isCorrect ? 1 : 0)
      completeLesson(level.id, lesson.id, score)
      setScreen('result')
    }
  }, [
    isLastQuestion,
    answers,
    isCorrect,
    level.id,
    lesson.id,
    completeLesson,
    isSlideTransitioning,
  ])

  useEffect(() => {
    if (comboStreak < 2) return
    const msg = getComboMsg(comboStreak)
    if (!msg) return
    setVisibleCombo({...msg, key: Date.now()})

    const timer = window.setTimeout(() => setVisibleCombo(null), 1600)
    timersRef.current.push(timer)

    return () => window.clearTimeout(timer)
  }, [comboStreak, getComboMsg])

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t))
      timersRef.current = []
    }
  }, [])

  // Enter key shortcut
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter') return
      if (screen === 'intro') {
        handleDidacticContinue()
        return
      }
      if (screen === 'result') {
        router.push(nextLessonPath ?? `/corso-vino/${level.id}`)
        return
      }
      if (!checked && selectedId && !isSlideTransitioning) {
        handleCheck()
        return
      }
      if (checked && !isSlideTransitioning) handleContinue()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    screen,
    checked,
    selectedId,
    handleCheck,
    handleContinue,
    handleDidacticContinue,
    nextLessonPath,
    level.id,
    isSlideTransitioning,
    router,
  ])

  // ── INTRO SCREEN ──────────────────────────────────────────────
  if (screen === 'intro') {
    return (
      <div className={pStyles.fullPage}>
        <div className={pStyles.topBar}>
          <div className={pStyles.playerInfo}>
            <span className={pStyles.avatar}>{lesson.emoji}</span>
            <span className={pStyles.nickname}>{level.title}</span>
          </div>
          <div className={pStyles.progressPills}>
            {didacticSlides.map((slide, i) => (
              <span
                key={slide.id ?? i}
                className={`${pStyles.pill}${
                  i < didacticIndex
                    ? ` ${pStyles.pillDone}`
                    : i === didacticIndex
                      ? ` ${pStyles.pillActive}`
                      : ''
                }`}
              />
            ))}
          </div>
          <div className={pStyles.topActions}>
            <button className={pStyles.audioButton} onClick={toggleAudio}>
              {audioEnabled ? '🔊 ON' : '🔇 OFF'}
            </button>
            <button
              className={pStyles.exitButton}
              onClick={() => router.push(`/corso-vino/${level.id}`)}
              aria-label={isEnglish ? 'Exit lesson' : 'Esci dalla lezione'}>
              ✕
            </button>
          </div>
        </div>

        <div className={pStyles.slideContent}>
          <div className={xStyles.introCard}>
            <div className={xStyles.introEmoji}>{lesson.emoji}</div>
            <p className={xStyles.slideMeta}>
              {isEnglish ? 'Slide' : 'Slide'} {didacticIndex + 1} {isEnglish ? 'of' : 'di'}{' '}
              {didacticSlides.length}
            </p>
            <h1 className={xStyles.introTitle}>{currentDidacticSlide.title}</h1>
            {currentDidacticSlide.paragraphs.map((p, i) => (
              <p key={i} className={xStyles.introParagraph}>
                {p}
              </p>
            ))}
            {currentDidacticSlide.keyPoints?.length > 0 && (
              <ul className={xStyles.keyPoints}>
                {currentDidacticSlide.keyPoints.map((kp, i) => (
                  <li key={i} className={xStyles.keyPoint}>
                    {kp}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={pStyles.bottomPanel}>
          <p className={pStyles.readyHint}>
            {lesson.questions.length}{' '}
            {isEnglish
              ? 'questions after the learning section'
              : 'domande dopo la sezione didattica'}
          </p>
          <button className={pStyles.continueButton} onClick={handleDidacticContinue}>
            {didacticIsLast
              ? isEnglish
                ? 'Go to questions'
                : 'Vai alle domande'
              : isEnglish
                ? 'Next slide'
                : 'Slide successiva'}
          </button>
        </div>
      </div>
    )
  }

  // ── RESULT SCREEN ─────────────────────────────────────────────
  if (screen === 'result') {
    const totalCorrect = answers.filter((a) => a.isCorrect).length
    const total = questions.length
    const pct = total > 0 ? Math.round((totalCorrect / total) * 100) : 0
    const allCorrect = total > 0 && totalCorrect === total
    const headline = allCorrect
      ? isEnglish
        ? '🎉 Perfect!'
        : '🎉 Perfetto!'
      : totalCorrect >= Math.ceil(total / 2)
        ? isEnglish
          ? '👍 Well done!'
          : '👍 Ben fatto!'
        : isEnglish
          ? '💪 Keep practicing!'
          : '💪 Continua ad allenarti!'

    return (
      <div className={pStyles.fullPage}>
        <div className={pStyles.topBar}>
          <div className={pStyles.playerInfo}>
            <span className={pStyles.avatar}>{lesson.emoji}</span>
            <span className={pStyles.nickname}>{lesson.title}</span>
          </div>
          <div className={pStyles.topActions}>
            <button
              className={pStyles.leaderboardButton}
              onClick={() => router.push(`/corso-vino/${level.id}`)}>
              {isEnglish ? 'All lessons' : 'Tutte le lezioni'}
            </button>
          </div>
        </div>

        <div className={pStyles.slideContent}>
          <div className={xStyles.resultHero}>
            <p className={xStyles.resultHeadline}>{headline}</p>
            <div className={xStyles.resultScore}>
              <span className={xStyles.resultScoreNumber}>{totalCorrect}</span>
              <span className={xStyles.resultScoreOf}>/{total}</span>
            </div>
            <p className={xStyles.resultPct}>
              {pct}% {isEnglish ? 'correct' : 'corrette'}
            </p>
            <div className={xStyles.resultStatsGrid}>
              <div className={xStyles.resultStatCard}>
                <span className={xStyles.resultStatLabel}>
                  {isEnglish ? 'Max combo' : 'Combo max'}
                </span>
                <span className={xStyles.resultStatValue}>x{maxCombo}</span>
              </div>
              <div className={xStyles.resultStatCard}>
                <span className={xStyles.resultStatLabel}>{isEnglish ? 'Bonus' : 'Bonus'}</span>
                <span className={xStyles.resultStatValue}>+{comboBonus}</span>
              </div>
            </div>
          </div>

          {/* Per-question breakdown */}
          <div className={xStyles.resultBreakdown}>
            {questions.map((q, i) => {
              const ans = answers[i]
              const correct = ans?.isCorrect
              return (
                <div
                  key={q.id}
                  className={`${pStyles.summaryRow} ${correct ? pStyles.summaryRowCorrect : pStyles.summaryRowWrong}`}>
                  <div className={pStyles.summaryBody}>
                    <span className={pStyles.summaryText}>{q.text}</span>
                    <div className={pStyles.summaryAnswer}>
                      {correct ? (
                        <span className={pStyles.summaryCorrect}>
                          ✅ {q.options.find((o) => o.id === ans?.selectedId)?.text}
                        </span>
                      ) : (
                        <>
                          <span className={pStyles.summaryWrong}>
                            ❌{' '}
                            {q.options.find((o) => o.id === ans?.selectedId)?.text ??
                              (isEnglish ? 'Not answered' : 'Nessuna risposta')}
                          </span>
                          <span className={pStyles.summaryCorrectHint}>
                            {isEnglish ? 'Correct answer:' : 'Risposta corretta:'}{' '}
                            {q.options.find((o) => o.id === q.correctId)?.text}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className={pStyles.bottomPanel}>
          <button
            className={pStyles.continueButton}
            onClick={() => router.push(nextLessonPath ?? `/corso-vino/${level.id}`)}>
            {nextLessonPath
              ? isEnglish
                ? 'Next lesson'
                : 'Lezione successiva'
              : isEnglish
                ? 'Back to level'
                : 'Torna al livello'}
          </button>
        </div>
      </div>
    )
  }

  // ── QUESTION SCREEN ───────────────────────────────────────────
  if (!currentQuestion) {
    return (
      <div className={pStyles.fullPage}>
        <div className={pStyles.topBar}>
          <div className={pStyles.playerInfo}>
            <span className={pStyles.avatar}>{lesson.emoji}</span>
            <span className={pStyles.nickname}>{lesson.title}</span>
          </div>
        </div>
        <div className={pStyles.slideContent}>
          <div className={xStyles.resultHero}>
            <p className={xStyles.resultHeadline}>
              {isEnglish
                ? 'No questions available for this lesson.'
                : 'Nessuna domanda disponibile per questa lezione.'}
            </p>
          </div>
        </div>
        <div className={pStyles.bottomPanel}>
          <button
            className={pStyles.continueButton}
            onClick={() => router.push(`/corso-vino/${level.id}`)}>
            {isEnglish ? 'Back to level' : 'Torna al livello'}
          </button>
        </div>
      </div>
    )
  }

  const feedbackText = checked
    ? selectedId === correctId
      ? currentQuestion.feedback.correct
      : currentQuestion.feedback.wrong
    : null

  return (
    <div className={pStyles.fullPage}>
      <div className={pStyles.topBar}>
        <div className={pStyles.playerInfo}>
          <span className={pStyles.avatar}>{lesson.emoji}</span>
          <span className={pStyles.nickname}>{lesson.title}</span>
        </div>
        <div className={pStyles.progressPills}>
          {questions.map((_, i) => (
            <span
              key={i}
              className={`${pStyles.pill}${
                i < questionIndex
                  ? ` ${pStyles.pillDone}`
                  : i === questionIndex
                    ? ` ${pStyles.pillActive}`
                    : ''
              }`}
            />
          ))}
        </div>
        <div className={pStyles.topActions}>
          <button className={pStyles.audioButton} onClick={toggleAudio}>
            {audioEnabled ? '🔊 ON' : '🔇 OFF'}
          </button>
          <button
            className={pStyles.exitButton}
            onClick={() => router.push(`/corso-vino/${level.id}`)}
            aria-label={isEnglish ? 'Exit lesson' : 'Esci dalla lezione'}>
            ✕
          </button>
        </div>
      </div>

      {visibleCombo && (
        <div key={visibleCombo.key} className={pStyles.comboToast}>
          <span className={pStyles.comboEmoji}>{visibleCombo.emoji}</span>
          <span className={pStyles.comboLabel}>{visibleCombo.label}</span>
        </div>
      )}

      <div
        className={`${pStyles.slideContent} ${slideMotionClass} ${!checked ? pStyles.mobileCheckSpacing : ''}`}>
        <p className={pStyles.questionCounter}>
          {isEnglish ? 'Question' : 'Domanda'} {questionIndex + 1} {isEnglish ? 'of' : 'di'}{' '}
          {questions.length}
        </p>
        <h2 className={pStyles.questionText}>{currentQuestion.text}</h2>

        <div className={pStyles.optionsList}>
          {currentQuestion.options.map((opt) => {
            const isSelected = selectedId === opt.id
            const isOptCorrect = opt.id === correctId
            let cls = pStyles.optionButton
            if (checked) {
              if (isOptCorrect) cls = `${pStyles.optionButton} ${pStyles.optCorrect}`
              else if (isSelected) cls = `${pStyles.optionButton} ${pStyles.optWrong}`
              else cls = `${pStyles.optionButton} ${pStyles.optDimmed}`
            } else if (isSelected) {
              cls = `${pStyles.optionButton} ${pStyles.optSelected}`
            }
            return (
              <button
                key={opt.id}
                className={cls}
                disabled={checked || isSlideTransitioning}
                onClick={() => !checked && setSelectedId(opt.id)}>
                {opt.text}
              </button>
            )
          })}
        </div>
      </div>

      <div
        className={`${pStyles.bottomPanel} ${!checked ? pStyles.mobileCheckFixed : ''} ${
          checked ? (isCorrect ? pStyles.bottomCorrect : pStyles.bottomWrong) : ''
        }`}>
        {checked && (
          <div className={pStyles.resultFeedback}>
            {isCorrect ? (
              <>
                <span className={pStyles.feedbackIcon}>
                  {getComboBonus(comboStreak) > 0 ? '🔥' : '🎉'}
                </span>
                <span className={pStyles.feedbackLabel}>
                  {getComboBonus(comboStreak) > 0
                    ? `Combo x${comboStreak}! +1 (+${getComboBonus(comboStreak)} bonus)`
                    : isEnglish
                      ? 'Correct! +1'
                      : 'Corretto! +1'}
                </span>
              </>
            ) : (
              <>
                <span className={pStyles.feedbackIcon}>💡</span>
                <span className={pStyles.feedbackLabel}>{feedbackText}</span>
              </>
            )}
          </div>
        )}

        {!checked ? (
          <button
            className={pStyles.checkButton}
            disabled={!selectedId || isSlideTransitioning}
            onClick={handleCheck}>
            {isEnglish ? 'Check' : 'Controlla'}
          </button>
        ) : (
          <button className={pStyles.continueButton} onClick={handleContinue}>
            {isLastQuestion
              ? isEnglish
                ? 'See results'
                : 'Vedi risultati'
              : isEnglish
                ? 'Continue'
                : 'Continua'}
          </button>
        )}
      </div>
    </div>
  )
}
