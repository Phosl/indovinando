'use client'

import {useState, useEffect, useMemo} from 'react'
import {useRouter} from 'next/navigation'
import {supabaseClient} from '@/lib/supabaseClient'
import styles from '../../../live/session/[sessionId]/play/playerLive.module.scss'
import xStyles from './enotecaResults.module.scss'

const stateKey = (bottleId, questionId) => `${bottleId}:${questionId}`

export default function EnotecaResultsClient({menuId, menuName, bottles, questions}) {
  const router = useRouter()
  const sessionKey = `enoteca_session_${menuId}`

  const [session, setSession] = useState(null)
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeBIdx, setActiveBIdx] = useState(0)

  const answersByKey = useMemo(() => {
    const map = {}
    for (const a of answers) map[stateKey(a.bottle_id, a.question_id)] = a
    return map
  }, [answers])

  useEffect(() => {
    const savedId = localStorage.getItem(sessionKey)
    if (!savedId) {
      router.replace(`/enoteca/${menuId}`)
      return
    }
    Promise.all([
      supabaseClient
        .from('enoteca_tasting_sessions')
        .select('id, nickname, table_name, total_score, status')
        .eq('id', savedId)
        .single(),
      supabaseClient
        .from('enoteca_answers')
        .select('bottle_id, question_id, selected_option_id, is_correct, points')
        .eq('tasting_session_id', savedId),
    ]).then(([{data: sess}, {data: ans}]) => {
      if (!sess) {
        router.replace(`/enoteca/${menuId}`)
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
        <p className={styles.readyHint}>Caricamento risultati…</p>
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
      {/* TopBar */}
      <div className={styles.topBar}>
        <div className={styles.playerInfo}>
          <span className={styles.avatar}>🍷</span>
          <span className={styles.nickname}>{menuName}</span>
        </div>
        <div className={styles.topActions}>
          <button
            className={styles.exitButton}
            onClick={() => router.push('/')}
            aria-label="Torna alla home">
            ✕
          </button>
        </div>
      </div>

      <div className={styles.slideContent}>
        {/* Hero */}
        <div className={xStyles.heroSection}>
          <h1 className={xStyles.heroTitle}>🏆 Degustazione completata!</h1>
          <p className={xStyles.heroNickname}>{session.nickname}</p>
          {session.table_name && <p className={xStyles.heroTable}>Tavolo: {session.table_name}</p>}
        </div>

        {/* Score card */}
        <div className={xStyles.scoreCard}>
          <div className={xStyles.scoreMain}>
            <span className={xStyles.scoreValue}>{totalScore}</span>
            <span className={xStyles.scoreLabel}>punti</span>
          </div>
          <div className={xStyles.scoreDivider} />
          <div className={xStyles.scoreMeta}>
            <span className={xStyles.scorePct}>{pct}%</span>
            <span className={xStyles.scorePctLabel}>
              {totalCorrect}/{totalQuestions} corrette
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
                <span className={xStyles.bottleCardIndex}>Bottiglia {i + 1}</span>
                <strong className={xStyles.bottleCardName}>{bottle.name}</strong>
                {bottle.producer && (
                  <span className={xStyles.bottleCardMeta}>
                    {bottle.producer}
                    {bottle.year ? ` · ${bottle.year}` : ''}
                  </span>
                )}
                <span
                  className={`${xStyles.bottleCardScore} ${bc === questions.length ? xStyles.perfect : bc === 0 ? xStyles.zero : ''}`}>
                  {bc}/{questions.length} · +{bs}pt
                </span>
              </button>
            )
          })}
        </div>

        {/* Detail panel for active bottle */}
        <div className={xStyles.detailPanel}>
          <div className={styles.bottleReveal}>
            <span className={styles.bottleRevealLabel}>La bottiglia era</span>
            <span className={styles.bottleRevealName}>{activeBottle.name}</span>
            {(activeBottle.producer || activeBottle.year) && (
              <span className={styles.bottleRevealMeta}>
                {[activeBottle.producer, activeBottle.year].filter(Boolean).join(' · ')}
              </span>
            )}
            <span className={xStyles.bottleRevealScore}>
              {bCorrect}/{questions.length} corrette · +{bScore} punti
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
                          ❌ {selectedOpt?.text ?? 'Non risposto'}
                        </span>
                        <span className={styles.summaryCorrectHint}>
                          Risposta corretta: {correctOpt?.text ?? '—'}
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
            router.push(`/enoteca/${menuId}`)
          }}>
          🍷 Nuova degustazione
        </button>
        <button className={styles.secondaryButton} onClick={() => router.push('/')}>
          Torna alla home
        </button>
      </div>
    </div>
  )
}
