'use client'

import {useState, useCallback, useEffect} from 'react'
import {useRouter} from 'next/navigation'
// Reuse live-game fullscreen shell styles
import pStyles from '../../../live/session/[sessionId]/play/playerLive.module.scss'
import xStyles from './lesson.module.scss'
import {useWineCourseProgress} from '../../hooks/useWineCourseProgress'
import {useGameAudio} from '../../../live/session/[sessionId]/play/hooks/useGameAudio'

export default function LessonClient({level, lesson}) {
  const router = useRouter()
  const {completeLesson} = useWineCourseProgress()
  const {audioEnabled, toggleAudio, playSound} = useGameAudio()

  // 'intro' | 'question' | 'result'
  const [screen, setScreen] = useState('intro')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [checked, setChecked] = useState(false)
  const [answers, setAnswers] = useState([]) // [{questionId, selectedId, isCorrect}]

  const questions = lesson.questions
  const currentQuestion = questions[questionIndex]
  const isLastQuestion = questionIndex >= questions.length - 1
  const correctId = currentQuestion?.correctId

  const isCorrect = checked && selectedId === correctId

  const handleCheck = useCallback(() => {
    if (!selectedId || checked) return
    const correct = selectedId === correctId
    setChecked(true)
    playSound(correct ? 'correct' : 'wrong')
    setAnswers((prev) => [
      ...prev,
      {questionId: currentQuestion.id, selectedId, isCorrect: correct},
    ])
  }, [selectedId, checked, correctId, currentQuestion, playSound])

  const handleContinue = useCallback(() => {
    if (!isLastQuestion) {
      setQuestionIndex((i) => i + 1)
      setSelectedId(null)
      setChecked(false)
    } else {
      const score = answers.filter((a) => a.isCorrect).length + (isCorrect ? 1 : 0)
      completeLesson(level.id, lesson.id, score)
      setScreen('result')
    }
  }, [isLastQuestion, answers, isCorrect, level.id, lesson.id, completeLesson])

  // Enter key shortcut
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter') return
      if (screen === 'intro') {
        setScreen('question')
        return
      }
      if (screen === 'result') {
        router.push(`/corso-vino/${level.id}`)
        return
      }
      if (!checked && selectedId) {
        handleCheck()
        return
      }
      if (checked) handleContinue()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, checked, selectedId, handleCheck, handleContinue, level.id, router])

  // ── INTRO SCREEN ──────────────────────────────────────────────
  if (screen === 'intro') {
    return (
      <div className={pStyles.fullPage}>
        <div className={pStyles.topBar}>
          <div className={pStyles.playerInfo}>
            <span className={pStyles.avatar}>{lesson.emoji}</span>
            <span className={pStyles.nickname}>{level.title}</span>
          </div>
          <div className={pStyles.topActions}>
            <button className={pStyles.audioButton} onClick={toggleAudio}>
              {audioEnabled ? '🔊 ON' : '🔇 OFF'}
            </button>
            <button
              className={pStyles.exitButton}
              onClick={() => router.push(`/corso-vino/${level.id}`)}
              aria-label="Esci dalla lezione">
              ✕
            </button>
          </div>
        </div>

        <div className={pStyles.slideContent}>
          <div className={xStyles.introCard}>
            <div className={xStyles.introEmoji}>{lesson.emoji}</div>
            <h1 className={xStyles.introTitle}>{lesson.intro.title}</h1>
            {lesson.intro.paragraphs.map((p, i) => (
              <p key={i} className={xStyles.introParagraph}>
                {p}
              </p>
            ))}
            {lesson.intro.keyPoints?.length > 0 && (
              <ul className={xStyles.keyPoints}>
                {lesson.intro.keyPoints.map((kp, i) => (
                  <li key={i} className={xStyles.keyPoint}>
                    {kp}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={pStyles.bottomPanel}>
          <p className={pStyles.readyHint}>{lesson.questions.length} domande</p>
          <button className={pStyles.continueButton} onClick={() => setScreen('question')}>
            Inizia la lezione
          </button>
        </div>
      </div>
    )
  }

  // ── RESULT SCREEN ─────────────────────────────────────────────
  if (screen === 'result') {
    const totalCorrect = answers.filter((a) => a.isCorrect).length
    const total = questions.length
    const pct = Math.round((totalCorrect / total) * 100)
    const allCorrect = totalCorrect === total
    const headline = allCorrect
      ? '🎉 Perfetto!'
      : totalCorrect >= Math.ceil(total / 2)
        ? '👍 Ben fatto!'
        : '💪 Continua ad allenarti!'

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
            <p className={xStyles.resultHeadline}>{headline}</p>
            <div className={xStyles.resultScore}>
              <span className={xStyles.resultScoreNumber}>{totalCorrect}</span>
              <span className={xStyles.resultScoreOf}>/{total}</span>
            </div>
            <p className={xStyles.resultPct}>{pct}% corrette</p>
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
                              'Non risposto'}
                          </span>
                          <span className={pStyles.summaryCorrectHint}>
                            Risposta corretta: {q.options.find((o) => o.id === q.correctId)?.text}
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
            onClick={() => router.push(`/corso-vino/${level.id}`)}>
            Torna al livello
          </button>
          <button
            className={pStyles.secondaryButton}
            onClick={() => {
              setScreen('intro')
              setQuestionIndex(0)
              setSelectedId(null)
              setChecked(false)
              setAnswers([])
            }}>
            Ripeti lezione
          </button>
        </div>
      </div>
    )
  }

  // ── QUESTION SCREEN ───────────────────────────────────────────
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
            aria-label="Esci dalla lezione">
            ✕
          </button>
        </div>
      </div>

      <div className={`${pStyles.slideContent} ${!checked ? pStyles.mobileCheckSpacing : ''}`}>
        <p className={pStyles.questionCounter}>
          Domanda {questionIndex + 1} di {questions.length}
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
                disabled={checked}
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
            <span className={pStyles.feedbackIcon}>{isCorrect ? '🎉' : '💡'}</span>
            <span className={pStyles.feedbackLabel}>{feedbackText}</span>
          </div>
        )}

        {!checked ? (
          <button className={pStyles.continueButton} disabled={!selectedId} onClick={handleCheck}>
            Verifica
          </button>
        ) : (
          <button className={pStyles.continueButton} onClick={handleContinue}>
            {isLastQuestion ? 'Vedi risultati' : 'Continua'}
          </button>
        )}
      </div>
    </div>
  )
}
