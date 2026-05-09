import {memo, useMemo, useRef} from 'react'
import styles from '../playerLive.module.scss'
import {useLanguage} from '@/components/i18n/LanguageProvider'

const APPLE_AVATARS = ['👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀', '🧑‍🍳', '👨‍⚕️']

export const ResultsScreen = memo(function ResultsScreen({
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
  currentPlayerData,
  onNextBottle,
  onViewLeaderboard,
  topBar,
  overlays,
}) {
  const {lang} = useLanguage()
  const isEnglish = lang === 'en'

  // Freeze baseline total_score per player when the results screen first opens for
  // a given bottle. This prevents a brief double-count caused by the host's
  // syncScoresFromAnswers updating allPlayers via Realtime while roundAnswersByPlayer
  // still contains the current round's points.
  const baselineRef = useRef({bottleIndex: -1, scores: {}})
  if (baselineRef.current.bottleIndex !== currentBottleIndex) {
    baselineRef.current = {
      bottleIndex: currentBottleIndex,
      scores: Object.fromEntries(allPlayers.map((p) => [p.id, p.total_score || 0])),
    }
  }
  const baselineScores = baselineRef.current.scores

  // Projected standings: frozen baseline + points earned this round
  const standings = useMemo(() => {
    return [...allPlayers]
      .map((p) => {
        const roundPts = Object.values(roundAnswersByPlayer[p.id] || {}).reduce(
          (sum, a) => sum + (a.points || 0),
          0,
        )
        return {...p, roundPts, projected: (baselineScores[p.id] ?? p.total_score ?? 0) + roundPts}
      })
      .sort((a, b) => b.projected - a.projected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPlayers, roundAnswersByPlayer])
  return (
    <div className={styles.fullPage}>
      {topBar}

      <div className={styles.slideContent}>
        <div className={styles.bottleBadge}>
          Bottle {currentBottleIndex + 1}/{totalBottles}
        </div>
        <h2 className={styles.waitTitle}>{title}</h2>
        {subtitle && <p className={styles.readyHint}>{subtitle}</p>}

        <div className={styles.bottleReveal}>
          <span className={styles.bottleRevealLabel}>
            {isEnglish ? 'The bottle was' : 'La bottiglia era'}
          </span>
          <span className={styles.bottleRevealName}>{currentBottle.name}</span>
          {(currentBottle.producer || currentBottle.year) && (
            <span className={styles.bottleRevealMeta}>
              {[currentBottle.producer, currentBottle.year].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>

        {questions.map((question, index) => {
          const ans = roundAnswers[question.id]
          const selectedOptionText = question.game_question_options?.find(
            (o) => o.id === ans?.optionId,
          )?.text
          const correctOptionText = question.game_question_options?.find(
            (o) => o.id === correctOptionByQuestion[question.id],
          )?.text
          const rowClass = ans?.isCorrect
            ? `${styles.summaryRow} ${styles.summaryRowCorrect}`
            : `${styles.summaryRow} ${styles.summaryRowWrong}`
          return (
            <div key={question.id} className={rowClass}>
              <div className={styles.summaryBody}>
                <span className={styles.summaryText}>{question.text}</span>
                <div className={styles.summaryAnswer}>
                  {ans?.isCorrect ? (
                    <span className={styles.summaryCorrect}>
                      ✅ {selectedOptionText}
                      <span className={styles.summaryPoints}>
                        +{ans.points}
                        {ans.comboBonus > 0 ? ' 🔥' : ''}
                      </span>
                    </span>
                  ) : (
                    <>
                      <span className={styles.summaryWrong}>
                        ❌ {selectedOptionText || 'Not answered'}
                      </span>
                      <span className={styles.summaryCorrectHint}>
                        {isEnglish ? 'Correct answer:' : 'Risposta corretta:'}{' '}
                        {correctOptionText || '-'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* ── Live standings ──────────────────────────────────────────────── */}
        {standings.length > 0 && (
          <div className={styles.standingsSection}>
            <h4 className={styles.standingsTitle}>
              {isEnglish ? '🏆 Live Leaderboard' : '🏆 Classifica Live'}
            </h4>
            {standings.map((player, idx) => {
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
              const isMe = player.id === currentPlayerData?.id
              return (
                <div
                  key={player.id}
                  className={`${styles.standingRow} ${isMe ? styles.standingRowMe : ''}`}>
                  <span className={styles.standingRank}>{medal ?? `#${idx + 1}`}</span>
                  <span className={styles.standingAvatar}>
                    {APPLE_AVATARS[player.avatar_id - 1] || '👤'}
                  </span>
                  <span className={styles.standingName}>
                    {player.nickname}
                    {isMe ? (
                      <span className={styles.standingMe}> {isEnglish ? 'you' : 'tu'}</span>
                    ) : (
                      ''
                    )}
                  </span>
                  <span className={styles.standingScore}>
                    {player.projected} {isEnglish ? 'pts' : 'pt'}
                    {player.roundPts > 0 && (
                      <span className={styles.standingDelta}>+{player.roundPts}</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className={styles.bottomPanel}>
        <p className={styles.readyHint}>
          {allPlayersCompletedThisRound
            ? isLastBottle
              ? isEnglish
                ? 'Everyone has finished!'
                : 'Tutti hanno finito!'
              : isHostUser
                ? isEnglish
                  ? 'Everyone has finished: you can move to the next bottle.'
                  : 'Tutti hanno finito: puoi passare alla prossima bottiglia.'
                : playerMarkedNext
                  ? isEnglish
                    ? 'Waiting for the host to continue...'
                    : "In attesa che l'host avanzi..."
                  : isEnglish
                    ? 'Everyone has finished!'
                    : 'Tutti hanno finito!'
            : `${playersReadyCount}/${allPlayers.length} ${isEnglish ? 'players ready...' : 'giocatori pronti...'}`}
        </p>

        {isLastBottle ? (
          isHostUser ? (
            <button
              className={styles.continueButton}
              onClick={onViewLeaderboard}
              disabled={!allPlayersCompletedThisRound}>
              {isEnglish ? 'Show final leaderboard' : 'Mostra classifica finale'}
            </button>
          ) : (
            <p className={styles.readyHint}>
              {allPlayersCompletedThisRound
                ? isEnglish
                  ? 'Waiting for the host to publish final leaderboard...'
                  : "In attesa che l'host pubblichi la classifica finale..."
                : isEnglish
                  ? 'Complete all questions to unlock final leaderboard.'
                  : 'Completa tutte le domande per sbloccare la classifica finale.'}
            </p>
          )
        ) : (
          <button
            className={styles.continueButton}
            onClick={isHostUser ? onNextBottle : onNextBottle}
            disabled={!allPlayersCompletedThisRound || (!isHostUser && playerMarkedNext)}>
            Next bottle
          </button>
        )}
      </div>

      {overlays}
    </div>
  )
})
