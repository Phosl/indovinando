import {useMemo} from 'react'
import styles from '../playerLive.module.scss'

const APPLE_AVATARS = ['👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀', '🧑‍🍳', '👨‍⚕️']

export function ResultsScreen({
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
  // Projected standings: DB total + points earned this round
  const standings = useMemo(() => {
    return [...allPlayers]
      .map((p) => {
        const roundPts = Object.values(roundAnswersByPlayer[p.id] || {}).reduce(
          (sum, a) => sum + (a.points || 0),
          0,
        )
        return {...p, roundPts, projected: (p.total_score || 0) + roundPts}
      })
      .sort((a, b) => b.projected - a.projected)
  }, [allPlayers, roundAnswersByPlayer])
  return (
    <div className={styles.fullPage}>
      {topBar}

      <div className={styles.slideContent}>
        <div className={styles.bottleBadge}>
          Bottiglia {currentBottleIndex + 1}/{totalBottles}
        </div>
        <h2 className={styles.waitTitle}>{title}</h2>
        {subtitle && <p className={styles.readyHint}>{subtitle}</p>}

        <div className={styles.bottleReveal}>
          <span className={styles.bottleRevealLabel}>La bottiglia era</span>
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
          return (
            <div key={question.id} className={styles.summaryRow}>
              <span className={styles.summaryIndex}>{index + 1}</span>
              <div className={styles.summaryBody}>
                <span className={styles.summaryText}>{question.text}</span>
                <div className={styles.summaryAnswer}>
                  {ans?.isCorrect ? (
                    <span className={styles.summaryCorrect}>
                      ✅ {selectedOptionText} · +{ans.points}
                      {ans.comboBonus > 0 ? ` 🔥 combo` : ''}
                    </span>
                  ) : (
                    <>
                      <span className={styles.summaryWrong}>
                        ❌ {selectedOptionText || 'Non risposto'}
                      </span>
                      <span className={styles.summaryCorrectHint}>
                        ✓ {correctOptionText || '-'}
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
            <h4 className={styles.standingsTitle}>📊 Classifica</h4>
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
                    {isMe ? ' (tu)' : ''}
                  </span>
                  <span className={styles.standingScore}>
                    {player.projected} pt
                    {player.roundPts > 0 && (
                      <span className={styles.standingDelta}> +{player.roundPts}</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className={styles.bottomPanel}>
        {isHostUser ? (
          <>
            <p className={styles.readyHint}>
              {allPlayersCompletedThisRound
                ? isLastBottle
                  ? 'Tutti hanno finito!'
                  : 'Tutti hanno finito: puoi passare alla prossima bottiglia.'
                : `${playersReadyCount}/${allPlayers.length} giocatori pronti...`}
            </p>
            <button
              className={styles.continueButton}
              onClick={onNextBottle}
              disabled={!isLastBottle && !allPlayersCompletedThisRound}>
              {isLastBottle
                ? allPlayersCompletedThisRound
                  ? 'Concludi'
                  : 'Concludi comunque'
                : 'Prossima bottiglia'}
            </button>
            {isLastBottle && (
              <button className={styles.secondaryButton} onClick={onViewLeaderboard}>
                Vedi classifica
              </button>
            )}
          </>
        ) : (
          <>
            <p className={styles.readyHint}>
              {playerMarkedNext
                ? `In attesa che l'host avanzi...`
                : allPlayersCompletedThisRound
                  ? 'Tutti hanno finito!'
                  : `${playersReadyCount}/${allPlayers.length} giocatori pronti...`}
            </p>
            <button
              className={styles.continueButton}
              onClick={onNextBottle}
              disabled={(!isLastBottle && !allPlayersCompletedThisRound) || playerMarkedNext}>
              {isLastBottle ? 'Concludi' : 'Prossima bottiglia'}
            </button>
            {isLastBottle && (
              <button className={styles.secondaryButton} onClick={onViewLeaderboard}>
                Vedi classifica
              </button>
            )}
          </>
        )}
      </div>

      {overlays}
    </div>
  )
}
