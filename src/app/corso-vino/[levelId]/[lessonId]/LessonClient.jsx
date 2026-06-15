'use client'

import {useState, useEffect, useRef, useMemo, useCallback} from 'react'
import {useRouter} from 'next/navigation'
// Reuse live-game fullscreen shell styles
import pStyles from '../../../live/session/[sessionId]/play/playerLive.module.scss'
import xStyles from './lesson.module.scss'
import {useWineCourseProgress} from '../../hooks/useWineCourseProgress'
import {useGameAudio} from '../../../live/session/[sessionId]/play/hooks/useGameAudio'
import {useT} from '@/lib/i18n/useT'
import {computeUserLevelProgress} from '@/lib/playerLevelUtils'
import {scrollPageTop} from '@/lib/scrollPageTop'
import TopBar from '@/components/TopBar'
import Icon from '@/components/Icon'
import {useAppData} from '@/components/AppDataContext'

export default function LessonClient({level, lesson, nextLessonId, levels = []}) {
  const router = useRouter()
  const {completeLesson, getLessonProgress, loaded, authChecked, userId} = useWineCourseProgress()
  const {refresh: refreshAppData} = useAppData()
  const {audioEnabled, toggleAudio, playSound} = useGameAudio()
  const t = useT('lesson')

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

  const comboToastTimerRef = useRef(null)

  const refreshAppDataSoon = useCallback(() => {
    const timer = window.setTimeout(() => {
      refreshAppData({force: true})
    }, 900)
    timersRef.current.push(timer)
  }, [refreshAppData])

  const getComboMsg = (n) => {
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
  }

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
  const backHref = authChecked && !userId ? '/' : `/corso-vino/${level.id}`
  const introProgressPct = didacticSlides.length
    ? Math.round(((didacticIndex + 1) / didacticSlides.length) * 100)
    : 0
  const chapterProgressPct = questions.length
    ? Math.round(((questionIndex + 1) / questions.length) * 100)
    : 100
  const audioButtonLabel = audioEnabled ? t('audioOn') : t('audioOff')
  const audioButtonIcon = audioEnabled ? 'volumeOn' : 'volumeOff'
  const audioButton = (
    <button
      type="button"
      className={pStyles.audioButton}
      onClick={toggleAudio}
      aria-label={audioButtonLabel}
      title={audioButtonLabel}>
      <Icon name={audioButtonIcon} size={20} className={pStyles.topActionIcon} />
      <span>{audioButtonLabel}</span>
    </button>
  )

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

  const getComboBonus = (nextStreak) => {
    if (nextStreak >= 4) return 15
    if (nextStreak === 3) return 10
    if (nextStreak === 2) return 5
    return 0
  }

  const handleCheck = () => {
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

    if (comboToastTimerRef.current) {
      window.clearTimeout(comboToastTimerRef.current)
      comboToastTimerRef.current = null
    }

    if (nextStreak >= 2) {
      const msg = getComboMsg(nextStreak)
      if (msg) {
        setVisibleCombo({...msg, key: Date.now()})
        comboToastTimerRef.current = window.setTimeout(() => {
          setVisibleCombo(null)
          comboToastTimerRef.current = null
        }, 1600)
      }
    } else {
      setVisibleCombo(null)
    }
  }

  const handleDidacticContinue = () => {
    if (!didacticIsLast) {
      setDidacticIndex((i) => i + 1)
      return
    }
    setScreen('question')
  }

  const handleContinue = () => {
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
      refreshAppDataSoon()
      setScreen('result')
    }
  }

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t))
      timersRef.current = []
      if (comboToastTimerRef.current) {
        window.clearTimeout(comboToastTimerRef.current)
        comboToastTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (screen !== 'intro') return
    const container = introScrollRef.current
    if (!container) return
    container.scrollTop = 0
  }, [didacticIndex, screen])

  useEffect(() => {
    if (screen !== 'question') return
    scrollPageTop()
  }, [questionIndex, screen])

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
        if (!didacticIsLast) {
          setDidacticIndex((i) => i + 1)
        } else {
          setScreen('question')
        }
        return
      }
      if (screen === 'result') {
        router.push(nextLessonPath ?? backHref)
        return
      }
      if (!checked && selectedId && !isSlideTransitioning) {
        const correct = selectedId === correctId
        const nextStreak = correct ? comboStreak + 1 : 0
        const bonus = correct ? getComboBonus(nextStreak) : 0
        setComboStreak(nextStreak)
        setMaxCombo((prev) => Math.max(prev, nextStreak))
        if (bonus > 0) setComboBonus((prev) => prev + bonus)
        setChecked(true)
        playSound(correct ? 'correct' : 'wrong')
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
        if (comboToastTimerRef.current) {
          window.clearTimeout(comboToastTimerRef.current)
          comboToastTimerRef.current = null
        }
        if (nextStreak >= 2) {
          const msg = getComboMsg(nextStreak)
          if (msg) {
            setVisibleCombo({...msg, key: Date.now()})
            comboToastTimerRef.current = window.setTimeout(() => {
              setVisibleCombo(null)
              comboToastTimerRef.current = null
            }, 1600)
          }
        } else {
          setVisibleCombo(null)
        }
        return
      }
      if (checked && !isSlideTransitioning) {
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
          prevLevelNumRef.current = levelProgress?.levelNum ?? null
          completeLesson(level.id, lesson.id, score, questions.length)
          refreshAppDataSoon()
          setScreen('result')
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    screen,
    checked,
    selectedId,
    didacticIsLast,
    nextLessonPath,
    isSlideTransitioning,
    router,
    backHref,
    comboStreak,
    correctId,
    currentQuestion,
    playSound,
    isLastQuestion,
    answers,
    isCorrect,
    levelProgress?.levelNum,
    completeLesson,
    refreshAppDataSoon,
    level.id,
    lesson.id,
    questions.length,
  ])

  // ── INTRO SCREEN ──────────────────────────────────────────────
  if (screen === 'intro') {
    return (
      <div className={pStyles.fullPage}>
        <TopBar
          className={xStyles.courseTopBar}
          title={t('chapterLabel', {index: String(level.order)})}
          onBack={() => router.push(backHref)}
          progress={introProgressPct}>
          {audioButton}
        </TopBar>

        <div className={pStyles.slideContent} ref={introScrollRef}>
          <div className={xStyles.introCard}>
            {/* <div className={xStyles.introEmoji}>{lesson.emoji}</div> */}
            <p className={xStyles.slideMeta}>
              {t('slide')} {didacticIndex + 1} {t('of')} {didacticSlides.length}
            </p>
            <h1 className={xStyles.introTitle}>{currentDidacticSlide.title}</h1>
            {currentDidacticSlide.paragraphs.map((p, i) => (
              <p key={i} className={xStyles.introParagraph}>
                {p}
              </p>
            ))}
            {currentDidacticSlide.keyPoints?.length > 0 && (
              <div className={xStyles.keyPointsBox}>
                <p className={xStyles.keyPointsTitle}>{t('takeawaysTitle')}</p>
                <ul className={xStyles.keyPoints}>
                  {currentDidacticSlide.keyPoints.map((kp, i) => (
                    <li key={i} className={xStyles.keyPoint}>
                      {kp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className={pStyles.bottomPanel}>
          <p className={pStyles.readyHint}>
            {lesson.questions.length} {t('questionsAfterIntro')}
          </p>
          <button className={pStyles.continueButton} onClick={handleDidacticContinue}>
            {didacticIsLast ? t('goToQuestions') : t('nextSlide')}
          </button>
        </div>
      </div>
    )
  }

  // ── RESULT SCREEN ─────────────────────────────────────────────
  if (screen === 'result') {
    const levelUpPhrases = t('levelUpPhrases') || []
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
      ? t('perfect')
      : totalCorrect >= Math.ceil(total / 2)
        ? t('wellDone')
        : t('keepPracticing')

    return (
      <div className={pStyles.fullPage}>
        <TopBar
          className={xStyles.courseTopBar}
          title={t('chapterLabel', {index: String(level.order)})}
          onBack={() => router.push(backHref)}
          progress={100}>
          {audioButton}
          <button
            type="button"
            className={pStyles.leaderboardButton}
            onClick={() => router.push(backHref)}>
            <Icon name="crown" size={20} className={pStyles.topActionIcon} />
            {t('allLessons')}
          </button>
        </TopBar>

        <div className={pStyles.slideContent}>
          <div className={xStyles.resultHero}>
            <p className={xStyles.resultHeadline}>{headline}</p>
            {levelProgress && (
              <div className={xStyles.resultProgress}>
                <div className={xStyles.resultProgressLabels}>
                  <span className={xStyles.resultProgressLevel}>
                    {levelProgress.isMax
                      ? t('levelBadgeMax')
                      : t('levelBadge', {level: levelProgress.levelNum})}
                  </span>
                  <span className={xStyles.resultProgressNext}>
                    {levelProgress.isMax
                      ? ''
                      : t('nextLevelBadge', {level: levelProgress.nextLevelNum})}
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
              {pct}% {t('correct')}
            </p>
            <div className={xStyles.resultStatsGrid}>
              <div className={xStyles.resultStatCard}>
                <span className={xStyles.resultStatLabel}>{t('maxCombo')}</span>
                <span className={xStyles.resultStatValue}>x{maxCombo}</span>
              </div>
              <div className={xStyles.resultStatCard}>
                <span className={xStyles.resultStatLabel}>{t('bonus')}</span>
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
                          <Icon name="checkCorrectWhite" size={24} className={xStyles.answerIcon} />{' '}
                          {q.options.find((o) => o.id === ans?.selectedId)?.text}
                        </span>
                      ) : (
                        <>
                          <span className={pStyles.summaryWrong}>
                            <Icon name="checkWrongWhite" size={24} className={xStyles.answerIcon} />{' '}
                            {q.options.find((o) => o.id === ans?.selectedId)?.text ??
                              t('notAnswered')}
                          </span>
                          <span className={pStyles.summaryCorrectHint}>
                            {t('correctAnswer')} {q.options.find((o) => o.id === q.correctId)?.text}
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
            {nextLessonPath ? t('nextLesson') : t('backToLevel')}
          </button>
        </div>

        {showLevelUp && levelProgress && (
          <div className={xStyles.levelUpOverlay} onClick={() => setShowLevelUp(false)}>
            <div className={xStyles.levelUpModal} onClick={(e) => e.stopPropagation()}>
              <div className={xStyles.levelUpBadge}>⭐ {levelProgress.levelNum}</div>
              <h2 className={xStyles.levelUpTitle}>{t('levelUpTitle')}</h2>
              <p className={xStyles.levelUpPhrase}>
                {levelUpPhrases.length > 0
                  ? levelUpPhrases[(levelProgress.levelNum - 1) % levelUpPhrases.length]
                  : ''}
              </p>
              <button className={xStyles.levelUpCta} onClick={() => setShowLevelUp(false)}>
                {t('levelUpCta')}
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
          {audioButton}
        </TopBar>
        <div className={pStyles.slideContent}>
          <div className={xStyles.resultHero}>
            <p className={xStyles.resultHeadline}>{t('noQuestions')}</p>
          </div>
        </div>
        <div className={pStyles.bottomPanel}>
          <button className={pStyles.continueButton} onClick={() => router.push(backHref)}>
            {t('backToLevel')}
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
        title={t('chapterLabel', {index: String(level.order)})}
        onBack={() => router.push(backHref)}
        progress={chapterProgressPct}>
        {audioButton}
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
          {t('question')} {questionIndex + 1} {t('of')} {questions.length}
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
                    : t('correctPlusOne')}
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
            {t('check')}
          </button>
        ) : (
          <button className={pStyles.continueButton} onClick={handleContinue}>
            {isLastQuestion ? t('seeResults') : t('continue')}
          </button>
        )}
      </div>
    </div>
  )
}
