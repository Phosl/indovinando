import {memo, useEffect, useMemo, useState} from 'react'
import styles from '../playerLive.module.scss'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {useT} from '@/lib/i18n/useT'
import AvatarDisplay from '@/components/AvatarDisplay'
import Icon from '@/components/Icon'

const isNeutralQuestion = (question) =>
  question?.is_neutral === true ||
  question?.isNeutral === true ||
  String(question?.kind || '').trim().toLowerCase() === 'neutral'

export const ResultsScreen = memo(function ResultsScreen({
  sessionId,
  title,
  subtitle,
  currentBottle,
  currentBottleIndex,
  totalBottles,
  questions,
  roundAnswers,
  correctOptionByQuestion,
  isLastBottle,
  allPlayersCompletedThisRound,
  isHostUser,
  playerMarkedNext,
  allPlayers,
  roundAnswersByPlayer,
  playersReadyCount,
  participantsCount,
  currentPlayerData,
  onNextBottle,
  onViewLeaderboard,
  isActionPending = false,
  topBar,
  overlays,
}) {
  const {lang} = useLanguage()
  const t = useT('live.results')
  const readyParticipantsCount = participantsCount || allPlayers.length
  const [serverStandings, setServerStandings] = useState([])

  useEffect(() => {
    let cancelled = false

    const fetchStandings = async () => {
      try {
        const res = await fetch(`/api/live/session/standings?sessionId=${sessionId}`)
        if (!res.ok) return
        const payload = await res.json().catch(() => ({}))
        if (!cancelled && Array.isArray(payload?.standings)) {
          setServerStandings(payload.standings)
        }
      } catch (_) {
        // Best-effort polling: keep local fallback when network fails.
      }
    }

    fetchStandings()
    const intervalId = setInterval(() => {
      if (!document.hidden) fetchStandings()
    }, 2500)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [sessionId])

  // Projected standings: current DB total + points earned this round
  // We do NOT freeze the baseline because syncScoresFromAnswers has already
  // been called (or will be called) before the host advances.
  const projectedLocalStandings = useMemo(() => {
    return [...allPlayers]
      .map((p) => {
        const roundPts = Object.values(roundAnswersByPlayer[p.id] || {}).reduce(
          (sum, a) => sum + (a.points || 0),
          0,
        )
        // Use total_score from DB as base; add unsaved round points if present
        return {...p, roundPts, projected: (p.total_score ?? 0) + roundPts}
      })
      .sort((a, b) => b.projected - a.projected)
  }, [allPlayers, roundAnswersByPlayer])

  const standings = serverStandings.length
    ? serverStandings.map((player) => ({
        ...player,
        projected: player.liveTotalScore ?? player.total_score ?? 0,
        roundPts: player.roundPoints ?? 0,
      }))
    : projectedLocalStandings

  const incompletePlayerNames = useMemo(() => {
    return allPlayers
      .filter((player) => !questions.every((q) => roundAnswersByPlayer[player.id]?.[q.id]))
      .map((player) => player.nickname)
      .filter(Boolean)
  }, [allPlayers, questions, roundAnswersByPlayer])

  const missingPlayersCount = Math.max(0, readyParticipantsCount - playersReadyCount)

  return (
    <div className={styles.fullPage}>
      {topBar}

      <div className={styles.slideContent}>
        <div className={styles.bottleBadge}>
          {t('bottleCounter', {current: currentBottleIndex + 1, total: totalBottles})}
        </div>
        <h2 className={styles.waitTitle}>{title}</h2>
        {subtitle && <p className={styles.readyHint}>{subtitle}</p>}

        <div className={styles.bottleReveal}>
          <span className={styles.bottleRevealLabel}>{t('theBottleWas')}</span>
          <span className={styles.bottleRevealName}>{currentBottle.name}</span>
          {(currentBottle.producer || currentBottle.year) && (
            <span className={styles.bottleRevealMeta}>
              {[currentBottle.producer, currentBottle.year].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>

        {questions.map((question, index) => {
          const ans = roundAnswers[question.id]
          const isNeutral = isNeutralQuestion(question)
          const selectedOptionText = question.game_question_options?.find(
            (o) => o.id === ans?.optionId,
          )?.text
          const correctOptionText = question.game_question_options?.find(
            (o) => o.id === correctOptionByQuestion[question.id],
          )?.text
          const rowClass = isNeutral
            ? `${styles.summaryRow}`
            : ans?.isCorrect
              ? `${styles.summaryRow} ${styles.summaryRowCorrect}`
              : `${styles.summaryRow} ${styles.summaryRowWrong}`
          return (
            <div key={question.id} className={rowClass}>
              <div className={styles.summaryBody}>
                <span className={styles.summaryText}>{question.text}</span>
                <div className={styles.summaryAnswer}>
                  {isNeutral ? (
                    <span className={styles.summaryCorrect}>
                      {selectedOptionText || t('notAnswered')}
                      <span className={styles.summaryPoints}>+0</span>
                    </span>
                  ) : ans?.isCorrect ? (
                    <span className={styles.summaryCorrect}>
                      <Icon name="checkCorrect" size={18} className={styles.feedbackIconImg} />
                      {selectedOptionText}
                      <span className={styles.summaryPoints}>
                        +{ans.points}
                        {ans.comboBonus > 0 ? ' 🔥' : ''}
                      </span>
                    </span>
                  ) : (
                    <>
                      <span className={styles.summaryWrong}>
                        <Icon name="checkWrong" size={18} className={styles.feedbackIconImg} />
                        {selectedOptionText || t('notAnswered')}
                      </span>
                      <span className={styles.summaryCorrectHint}>
                        {t('correctAnswer')} {correctOptionText || '-'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* ── Live standings ──────────────────────────────────────────────── */}
        <div className={styles.standingsSection}>
          <h4 className={styles.standingsTitle}>{t('liveLeaderboard')}</h4>
          {standings.length === 0
            ? [0, 1, 2].map((i) => (
                <div key={i} className={styles.standingRow}>
                  <span className={`skeleton ${styles.standingSkeletonRank}`} />
                  <span className={`skeleton ${styles.standingSkeletonAvatar}`} />
                  <span className={`skeleton ${styles.standingSkeletonName}`} />
                  <span className={`skeleton ${styles.standingSkeletonScore}`} />
                </div>
              ))
            : standings.map((player, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                const isMe = player.id === currentPlayerData?.id
                return (
                  <div
                    key={player.id}
                    className={`${styles.standingRow} ${isMe ? styles.standingRowMe : ''}`}>
                    <span className={styles.standingRank}>{medal ?? `#${idx + 1}`}</span>
                    <span className={styles.standingAvatar}>
                      <AvatarDisplay avatarId={player.avatar_id} size={24} />
                    </span>
                    <span className={styles.standingName}>
                      {player.nickname}
                      {isMe ? <span className={styles.standingMe}> {t('you')}</span> : ''}
                    </span>
                    <span className={styles.standingScore}>
                      {player.projected} {t('pointsUnit')}
                      {player.roundPts > 0 && (
                        <span className={styles.standingDelta}>+{player.roundPts}</span>
                      )}
                    </span>
                  </div>
                )
              })}
        </div>
      </div>

      <div className={styles.bottomPanel}>
        {!allPlayersCompletedThisRound && (
          <div className={styles.waitingBlock}>
            <p className={styles.readyHint}>
              {`${playersReadyCount}/${readyParticipantsCount} ${t('playersReady')}`}
            </p>
            {incompletePlayerNames.length > 0 && (
              <p className={styles.waitingNames}>
                {t('waitingFor')}
                {incompletePlayerNames.join(', ')}
              </p>
            )}
          </div>
        )}

        {allPlayersCompletedThisRound && (
          <p className={styles.readyHint}>
            {isLastBottle
              ? t('everyoneFinished')
              : playerMarkedNext
                ? t('waitingHostContinue')
                : t('everyoneProceedNext')}
          </p>
        )}

        {isLastBottle && !isHostUser ? (
          // Guests cannot call /api/live/session/finish (requires auth).
          // They are auto-redirected when the host broadcasts status:'finished'.
          allPlayersCompletedThisRound ? (
            <p className={styles.readyHint}>{t('waitingHostContinue')}</p>
          ) : null
        ) : isLastBottle ? (
          <button
            className={styles.continueButton}
            onClick={onViewLeaderboard}
            disabled={!allPlayersCompletedThisRound || isActionPending}>
            {t('showFinalLeaderboard')}
          </button>
        ) : (
          <button
            className={styles.continueButton}
            onClick={onNextBottle}
            disabled={
              !allPlayersCompletedThisRound || (!isHostUser && playerMarkedNext) || isActionPending
            }>
            {!allPlayersCompletedThisRound && isHostUser
              ? `${playersReadyCount}/${readyParticipantsCount} ${t('playersReady')}`
              : t('nextBottle')}
          </button>
        )}
      </div>

      {overlays}
    </div>
  )
})
