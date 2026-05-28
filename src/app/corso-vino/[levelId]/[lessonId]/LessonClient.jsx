'use client'

import {useState, useCallback, useEffect, useRef, useMemo} from 'react'
import {useRouter} from 'next/navigation'
// Reuse live-game fullscreen shell styles
import pStyles from '../../../live/session/[sessionId]/play/playerLive.module.scss'
import xStyles from './lesson.module.scss'
import {useWineCourseProgress} from '../../hooks/useWineCourseProgress'
import {useGameAudio} from '../../../live/session/[sessionId]/play/hooks/useGameAudio'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {pickLangText} from '@/lib/i18n/dictionaries'
import {computeUserLevelProgress} from '@/lib/playerLevelUtils'
import TopBar from '@/components/TopBar'

const LESSON_UI_DICTIONARY = {
  it: {
    exitLesson: 'Esci dalla lezione',
    slide: 'Slide',
    of: 'di',
    questionsAfterIntro: 'domande dopo la sezione didattica',
    goToQuestions: 'Vai alle domande',
    nextSlide: 'Slide successiva',
    perfect: '🎉 Perfetto!',
    wellDone: '👍 Ben fatto!',
    keepPracticing: '💪 Continua ad allenarti!',
    allLessons: 'Tutte le lezioni',
    correct: 'corrette',
    maxCombo: 'Combo max',
    bonus: 'Bonus',
    notAnswered: 'Nessuna risposta',
    correctAnswer: 'Risposta corretta:',
    nextLesson: 'Lezione successiva',
    backToLevel: 'Torna al livello',
    noQuestions: 'Nessuna domanda disponibile per questa lezione.',
    question: 'Domanda',
    correctPlusOne: 'Corretto! +1',
    check: 'Controlla',
    seeResults: 'Vedi risultati',
    continue: 'Continua',
    chapterLabel: 'Capitolo {index}',
    levelUpTitle: '🎉 Sei salito di livello!',
    levelUpPhrases: [
      'Il tuo naso da sommelier si sta sviluppando!',
      'I vini tremano quando ti vedono arrivare!',
      'Presto parlerai di tannini al posto di pasta!',
      'Brindisi a te, esperto in erba!',
      'La tua cantina mentale si sta riempiendo!',
    ],
    levelUpCta: 'Continua così! 🍷',
  },
  en: {
    exitLesson: 'Exit lesson',
    slide: 'Slide',
    of: 'of',
    questionsAfterIntro: 'questions after the learning section',
    goToQuestions: 'Go to questions',
    nextSlide: 'Next slide',
    perfect: '🎉 Perfect!',
    wellDone: '👍 Well done!',
    keepPracticing: '💪 Keep practicing!',
    allLessons: 'All lessons',
    correct: 'correct',
    maxCombo: 'Max combo',
    bonus: 'Bonus',
    notAnswered: 'Not answered',
    correctAnswer: 'Correct answer:',
    nextLesson: 'Next lesson',
    backToLevel: 'Back to level',
    noQuestions: 'No questions available for this lesson.',
    question: 'Question',
    correctPlusOne: 'Correct! +1',
    check: 'Check',
    seeResults: 'See results',
    continue: 'Continue',
    chapterLabel: 'Chapter {index}',
    levelUpTitle: '🎉 Level up!',
    levelUpPhrases: [
      'Your sommelier nose is blossoming!',
      'Wines tremble when they see you coming!',
      "Soon you'll talk tannins at dinner parties!",
      'A toast to you, rising expert!',
      'Your mental cellar is filling up nicely!',
    ],
    levelUpCta: 'Keep it up! 🍷',
  },
}

export default function LessonClient({level, lesson, nextLessonId, levels = []}) {
  const router = useRouter()
  const {completeLesson, getLessonProgress, loaded} = useWineCourseProgress()
  const {audioEnabled, toggleAudio, playSound} = useGameAudio()
  const {lang} = useLanguage()
  const t = pickLangText(lang, LESSON_UI_DICTIONARY)

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
  const [showLevelUp, setShowLevelUp] = useState(false)
  const prevLevelNumRef = useRef(null)
  const timersRef = useRef([])
  const introScrollRef = useRef(null)

  const getComboMsg = useCallback((n) => {
    if (n < 2) return null
    const idx = String(Math.min(n - 1, 6)).padStart(2, '0')
    const labels = [
      '',
      '',
      'Combo x2!',
      'Combo x3!!',
      'Combo x4!!!',
      'Combo x5!!!!',
      'Combo x6!!!!!',
      `Combo x${n}!!!!!!`,
    ]
    return {svg: `/combo/combo-${idx}.svg`, label: labels[Math.min(n, 7)] ?? `Combo x${n}!!!!!!`}
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
  const backHref = `/corso-vino/${level.id}`
  const introProgressPct = didacticSlides.length
    ? Math.round(((didacticIndex + 1) / didacticSlides.length) * 100)
    : 0
  const chapterProgressPct = questions.length
    ? Math.round(((questionIndex + 1) / questions.length) * 100)
    : 100

  const isCorrect = checked && selectedId === correctId
  const nextLessonPath = nextLessonId ? `/corso-vino/${level.id}/${nextLessonId}` : null
  const isSlideTransitioning = slideMotion !== 'idle'
  const slideMotionClass =
    slideMotion === 'exiting'
      ? pStyles.slideExitLeft
      : slideMotion === 'entering'
        ? pStyles.slideEnterRight
        : ''

  // Progress for result screen animation
  const levelProgress = useMemo(() => {
    if (!levels?.length || !loaded) return null
    const totalLessons = levels.reduce((sum, l) => sum + l.lessonIds.length, 0)
    const completedLessons = levels.reduce(
      (sum, l) => sum + l.lessonIds.filter((id) => getLessonProgress(l.id, id)?.completed).length,
      0,
    )
    const up = computeUserLevelProgress(completedLessons, totalLessons)
    return {
      pct: up.progressInLevel,
      levelNum: up.levelNum,
      nextLevelNum: up.nextLevelNum,
      isMax: up.isMax,
    }
  }, [levels, loaded, getLessonProgress])

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
    // Keep a single answer record per question to avoid accidental double counting.
    setAnswers((prev) => {
      const next = prev.filter((answer) => answer.questionId !== currentQuestion.id)
      next.push({
        questionId: currentQuestion.id,
        selectedId,
        isCorrect: correct,
        combo: nextStreak,
        bonus,
      })
      return next
    })
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
      const answersByQuestion = new Map()
      answers.forEach((answer) => {
        answersByQuestion.set(answer.questionId, answer)
      })
      if (currentQuestion?.id && selectedId && checked) {
        answersByQuestion.set(currentQuestion.id, {
          questionId: currentQuestion.id,
          selectedId,
          isCorrect,
        })
      }

      const computedCorrect = Array.from(answersByQuestion.values()).filter(
        (a) => a.isCorrect,
      ).length
      const score = Math.min(questions.length, computedCorrect)
      // Snapshot current level before completing (levelProgress is based on pre-complete data)
      prevLevelNumRef.current = levelProgress?.levelNum ?? null
      completeLesson(level.id, lesson.id, score, questions.length)
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

  useEffect(() => {
    if (screen !== 'intro') return
    const container = introScrollRef.current
    if (!container) return
    container.scrollTop = 0
  }, [didacticIndex, screen])

  // Detect level-up after lesson completion
  useEffect(() => {
    if (screen !== 'result' || prevLevelNumRef.current === null || !levelProgress) return
    if (levelProgress.levelNum > prevLevelNumRef.current) {
      const timer = window.setTimeout(() => setShowLevelUp(true), 1600)
      timersRef.current.push(timer)
    }
  }, [screen, levelProgress])

  // Enter key shortcut
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter') return
      if (screen === 'intro') {
        handleDidacticContinue()
        return
      }
      if (screen === 'result') {
        router.push(nextLessonPath ?? backHref)
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
    backHref,
  ])

  // ── INTRO SCREEN ──────────────────────────────────────────────
  if (screen === 'intro') {
    return (
      <div className={pStyles.fullPage}>
        <TopBar
          className={xStyles.courseTopBar}
          title={t.chapterLabel.replace('{index}', String(level.order))}
          onBack={() => router.push(backHref)}
          progress={introProgressPct}>
          <button className={pStyles.audioButton} onClick={toggleAudio}>
            {audioEnabled ? '🔊 ON' : '🔇 OFF'}
          </button>
        </TopBar>

        <div className={pStyles.slideContent} ref={introScrollRef}>
          <div className={xStyles.introCard}>
            <div className={xStyles.introEmoji}>{lesson.emoji}</div>
            <p className={xStyles.slideMeta}>
              {t.slide} {didacticIndex + 1} {t.of} {didacticSlides.length}
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
            {lesson.questions.length} {t.questionsAfterIntro}
          </p>
          <button className={pStyles.continueButton} onClick={handleDidacticContinue}>
            {didacticIsLast ? t.goToQuestions : t.nextSlide}
          </button>
        </div>
      </div>
    )
  }

  // ── RESULT SCREEN ─────────────────────────────────────────────
  if (screen === 'result') {
    const answersByQuestion = new Map()
    answers.forEach((answer) => {
      answersByQuestion.set(answer.questionId, answer)
    })

    const totalCorrect = Math.min(
      questions.length,
      Array.from(answersByQuestion.values()).filter((answer) => answer.isCorrect).length,
    )
    const total = questions.length
    const pct = total > 0 ? Math.round((totalCorrect / total) * 100) : 0
    const allCorrect = total > 0 && totalCorrect === total
    const headline = allCorrect
      ? t.perfect
      : totalCorrect >= Math.ceil(total / 2)
        ? t.wellDone
        : t.keepPracticing

    return (
      <div className={pStyles.fullPage}>
        <TopBar
          className={xStyles.courseTopBar}
          title={t.chapterLabel.replace('{index}', String(level.order))}
          onBack={() => router.push(backHref)}
          progress={100}>
          <button className={pStyles.audioButton} onClick={toggleAudio}>
            {audioEnabled ? '🔊 ON' : '🔇 OFF'}
          </button>
          <button className={pStyles.leaderboardButton} onClick={() => router.push(backHref)}>
            {t.allLessons}
          </button>
        </TopBar>

        <div className={pStyles.slideContent}>
          <div className={xStyles.resultHero}>
            <p className={xStyles.resultHeadline}>{headline}</p>
            {levelProgress && (
              <div className={xStyles.resultProgress}>
                <div className={xStyles.resultProgressLabels}>
                  <span className={xStyles.resultProgressLevel}>
                    {levelProgress.isMax ? '🏆 Max' : `Liv. ${levelProgress.levelNum}`}
                  </span>
                  <span className={xStyles.resultProgressNext}>
                    {levelProgress.isMax ? '' : `→ Liv. ${levelProgress.nextLevelNum}`}
                  </span>
                </div>
                <div className={xStyles.resultProgressTrack}>
                  <div
                    className={xStyles.resultProgressFill}
                    style={{'--pct': `${levelProgress.pct}%`}}
                  />
                </div>
              </div>
            )}
            <div className={xStyles.resultScore}>
              <span className={xStyles.resultScoreNumber}>{totalCorrect}</span>
              <span className={xStyles.resultScoreOf}>/{total}</span>
            </div>
            <p className={xStyles.resultPct}>
              {pct}% {t.correct}
            </p>
            <div className={xStyles.resultStatsGrid}>
              <div className={xStyles.resultStatCard}>
                <span className={xStyles.resultStatLabel}>{t.maxCombo}</span>
                <span className={xStyles.resultStatValue}>x{maxCombo}</span>
              </div>
              <div className={xStyles.resultStatCard}>
                <span className={xStyles.resultStatLabel}>{t.bonus}</span>
                <span className={xStyles.resultStatValue}>+{comboBonus}</span>
              </div>
            </div>
          </div>

          {/* Per-question breakdown */}
          <div className={xStyles.resultBreakdown}>
            {questions.map((q) => {
              const ans = answersByQuestion.get(q.id)
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
                          <img
                            className={xStyles.answerIcon}
                            src="/check-correct-white.svg"
                            alt=""
                            aria-hidden="true"
                          />{' '}
                          {q.options.find((o) => o.id === ans?.selectedId)?.text}
                        </span>
                      ) : (
                        <>
                          <span className={pStyles.summaryWrong}>
                            <img
                              className={xStyles.answerIcon}
                              src="/check-wrong-white.svg"
                              alt=""
                              aria-hidden="true"
                            />{' '}
                            {q.options.find((o) => o.id === ans?.selectedId)?.text ?? t.notAnswered}
                          </span>
                          <span className={pStyles.summaryCorrectHint}>
                            {t.correctAnswer} {q.options.find((o) => o.id === q.correctId)?.text}
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
            onClick={() => router.push(nextLessonPath ?? backHref)}>
            {nextLessonPath ? t.nextLesson : t.backToLevel}
          </button>
        </div>

        {showLevelUp && levelProgress && (
          <div className={xStyles.levelUpOverlay} onClick={() => setShowLevelUp(false)}>
            <div className={xStyles.levelUpModal} onClick={(e) => e.stopPropagation()}>
              <div className={xStyles.levelUpBadge}>⭐ {levelProgress.levelNum}</div>
              <h2 className={xStyles.levelUpTitle}>{t.levelUpTitle}</h2>
              <p className={xStyles.levelUpPhrase}>
                {t.levelUpPhrases[(levelProgress.levelNum - 1) % t.levelUpPhrases.length]}
              </p>
              <button className={xStyles.levelUpCta} onClick={() => setShowLevelUp(false)}>
                {t.levelUpCta}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── QUESTION SCREEN ───────────────────────────────────────────
  if (!currentQuestion) {
    return (
      <div className={pStyles.fullPage}>
        <TopBar
          className={xStyles.courseTopBar}
          title={lesson.title}
          onBack={() => router.push(backHref)}
          progress={100}>
          <button className={pStyles.audioButton} onClick={toggleAudio}>
            {audioEnabled ? '🔊 ON' : '🔇 OFF'}
          </button>
        </TopBar>
        <div className={pStyles.slideContent}>
          <div className={xStyles.resultHero}>
            <p className={xStyles.resultHeadline}>{t.noQuestions}</p>
          </div>
        </div>
        <div className={pStyles.bottomPanel}>
          <button className={pStyles.continueButton} onClick={() => router.push(backHref)}>
            {t.backToLevel}
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
  const comboMsg = getComboMsg(comboStreak)

  return (
    <div className={pStyles.fullPage}>
      <TopBar
        className={xStyles.courseTopBar}
        title={t.chapterLabel.replace('{index}', String(level.order))}
        onBack={() => router.push(backHref)}
        progress={chapterProgressPct}>
        <button className={pStyles.audioButton} onClick={toggleAudio}>
          {audioEnabled ? '🔊 ON' : '🔇 OFF'}
        </button>
      </TopBar>

      {visibleCombo && (
        <div key={visibleCombo.key} className={pStyles.comboToast}>
          <img className={pStyles.comboEmoji} src={visibleCombo.svg} alt="" />
          <span className={pStyles.comboLabel}>{visibleCombo.label}</span>
        </div>
      )}

      <div
        className={`${pStyles.slideContent} ${slideMotionClass} ${!checked ? pStyles.mobileCheckSpacing : ''}`}>
        <p className={pStyles.questionCounter}>
          {t.question} {questionIndex + 1} {t.of} {questions.length}
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
                  {comboMsg ? (
                    <img className={pStyles.comboEmoji} src={comboMsg.svg} alt="" />
                  ) : (
                    '🎉'
                  )}
                </span>
                <span className={pStyles.feedbackLabel}>
                  {comboMsg
                    ? getComboBonus(comboStreak) > 0
                      ? `${comboMsg.label} +1 (+${getComboBonus(comboStreak)} bonus)`
                      : comboMsg.label
                    : t.correctPlusOne}
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
            {t.check}
          </button>
        ) : (
          <button className={pStyles.continueButton} onClick={handleContinue}>
            {isLastQuestion ? t.seeResults : t.continue}
          </button>
        )}
      </div>
    </div>
  )
}
