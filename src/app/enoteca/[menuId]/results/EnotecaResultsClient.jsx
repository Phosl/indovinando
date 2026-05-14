'use client'

import {useState, useEffect, useMemo} from 'react'
import {useRouter} from 'next/navigation'
import {supabaseAnonClient} from '@/lib/supabaseClient'
import TopBar from '@/components/TopBar'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {ENOTECA_DICTIONARY, pickLangText} from '@/lib/i18n/dictionaries'
import styles from '../../../live/session/[sessionId]/play/playerLive.module.scss'
import xStyles from './enotecaResults.module.scss'

const stateKey = (bottleId, questionId) => `${bottleId}:${questionId}`

export default function EnotecaResultsClient({menuId, menuName, bottles, questions}) {
  const {lang} = useLanguage()
  const t = pickLangText(lang, ENOTECA_DICTIONARY.results)

  const router = useRouter()
  const sessionKey = `enoteca_session_${menuId}`

  const [session, setSession] = useState(null)
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeBIdx, setActiveBIdx] = useState(0)
  const backHref = '/miei-giochi'

  const answersByKey = useMemo(() => {
    const map = {}
    for (const a of answers) map[stateKey(a.bottle_id, a.question_id)] = a
    return map
  }, [answers])

  useEffect(() => {
    const savedId = localStorage.getItem(sessionKey)
    if (!savedId) {
      router.replace(`/enoteca/${menuId}/join`)
      return
    }
    Promise.all([
      supabaseAnonClient
        .from('enoteca_tasting_sessions')
        .select('id, nickname, table_name, total_score, status')
        .eq('id', savedId)
        .single(),
      supabaseAnonClient
        .from('enoteca_answers')
        .select('bottle_id, question_id, selected_option_id, is_correct, points')
        .eq('tasting_session_id', savedId),
    ]).then(([{data: sess}, {data: ans}]) => {
      if (!sess) {
        router.replace(`/enoteca/${menuId}/join`)
        return
      }
      setSession(sess)
      setAnswers(ans ?? [])
      setLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className={styles.fullPage} style={{alignItems: 'center', justifyContent: 'center'}}>
        <p className={styles.readyHint}>{t.loading}</p>
      </div>
    )
  }

  const totalScore = answers.reduce((sum, a) => sum + (a.points ?? 0), 0)
  const totalCorrect = answers.filter((a) => a.is_correct).length
  const totalQuestions = bottles.length * questions.length
  const pct = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0

  const activeBottle = bottles[activeBIdx]
  const bCorrect = questions.filter(
    (q) => answersByKey[stateKey(activeBottle.id, q.id)]?.is_correct,
  ).length
  const bScore = questions.reduce(
    (sum, q) => sum + (answersByKey[stateKey(activeBottle.id, q.id)]?.points ?? 0),
    0,
  )

  return (
    <div className={styles.fullPage}>
      <div className={styles.topBarContainer}>
        <TopBar title={`🍷 ${menuName}`} onBack={() => router.push(backHref)}></TopBar>
      </div>
      <div className={`${styles.slideContent} ${xStyles.resultsSlideContent}`}>
        {/* Hero */}
        <div className={xStyles.heroSection}>
          <h1 className={xStyles.heroTitle}>🏆 {t.title}</h1>
          <p className={xStyles.heroNickname}>{session.nickname}</p>
          {session.table_name && (
            <p className={xStyles.heroTable}>
              {t.table}: {session.table_name}
            </p>
          )}
        </div>

        {/* Score card */}
        <div className={xStyles.scoreCard}>
          <div className={xStyles.scoreMain}>
            <span className={xStyles.scoreValue}>{totalScore}</span>
            <span className={xStyles.scoreLabel}>{t.points}</span>
          </div>
          <div className={xStyles.scoreDivider} />
          <div className={xStyles.scoreMeta}>
            <span className={xStyles.scorePct}>{pct}%</span>
            <span className={xStyles.scorePctLabel}>
              {totalCorrect}/{totalQuestions} {t.correct}
            </span>
          </div>
        </div>

        {/* Bottle slider */}
        <div className={xStyles.sliderTrack}>
          {bottles.map((bottle, i) => {
            const bc = questions.filter(
              (q) => answersByKey[stateKey(bottle.id, q.id)]?.is_correct,
            ).length
            const bs = questions.reduce(
              (sum, q) => sum + (answersByKey[stateKey(bottle.id, q.id)]?.points ?? 0),
              0,
            )
            const isActive = i === activeBIdx
            return (
              <button
                key={bottle.id}
                className={`${xStyles.bottleCard} ${isActive ? xStyles.activeBottle : ''}`}
                onClick={() => setActiveBIdx(i)}>
                <span className={xStyles.bottleCardIndex}>
                  {t.bottle} {i + 1}
                </span>
                <strong className={xStyles.bottleCardName}>{bottle.name}</strong>
                {bottle.producer && (
                  <span className={xStyles.bottleCardMeta}>
                    {bottle.producer}
                    {bottle.year ? ` · ${bottle.year}` : ''}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Detail panel for active bottle */}
        <div className={xStyles.detailPanel}>
          <div className={styles.bottleReveal}>
            <span className={styles.bottleRevealLabel}>{t.bottleWas}</span>
            <span className={styles.bottleRevealName}>{activeBottle.name}</span>
            {(activeBottle.producer || activeBottle.year) && (
              <span className={styles.bottleRevealMeta}>
                {[activeBottle.producer, activeBottle.year].filter(Boolean).join(' · ')}
              </span>
            )}
            <span className={xStyles.bottleRevealScore}>
              {bCorrect}/{questions.length} {t.correct} · +{bScore} {t.points}
            </span>
          </div>

          {questions.map((q) => {
            const answer = answersByKey[stateKey(activeBottle.id, q.id)]
            const selectedOpt = q.options.find((o) => o.id === answer?.selected_option_id)
            const correctOpt = q.options.find((o) => o.id === activeBottle.correctAnswers?.[q.id])
            return (
              <div
                key={q.id}
                className={`${styles.summaryRow} ${
                  answer?.is_correct ? styles.summaryRowCorrect : styles.summaryRowWrong
                }`}>
                <div className={styles.summaryBody}>
                  <span className={styles.summaryText}>{q.text}</span>
                  <div className={styles.summaryAnswer}>
                    {answer?.is_correct ? (
                      <span className={styles.summaryCorrect}>
                        ✅ {correctOpt?.text}
                        <span className={styles.summaryPoints}>+{answer.points ?? 0}</span>
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
      </div>

      <div className={styles.bottomPanel}>
        <button
          className={styles.continueButton}
          onClick={() => {
            localStorage.removeItem(sessionKey)
            router.push(`/enoteca/${menuId}/join`)
          }}>
          🍷 {t.newTasting}
        </button>
        <button className={styles.secondaryButton} onClick={() => router.push('/')}>
          {t.home}
        </button>
      </div>
    </div>
  )
}
