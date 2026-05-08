import styles from '../playerLive.module.scss'

/**
 * Shared results screen. Used in two situations:
 *  1. roundStatus === 'showing_results'  (host has pushed results)
 *  2. roundStatus === 'waiting_answers' and player has clicked ready (waiting for others)
 *
 * Props:
 *  - title            string
 *  - subtitle         string | null
 *  - currentBottle    {name, producer, year}
 *  - currentBottleIndex  number
 *  - totalBottles     number
 *  - questions        [{id, text, game_question_options[]}]
 *  - roundAnswers     {[questionId]: {optionId, isCorrect, points, comboBonus}}
 *  - correctOptionByQuestion  {[questionId]: optionId}
 *  - isLastBottle     bool
 *  - allPlayersCompletedThisRound  bool
 *  - isHostUser       bool
 *  - playerMarkedNext bool
 *  - onNextBottle     () => void
 *  - onViewLeaderboard () => void
 *  - topBar           ReactNode
 *  - overlays         ReactNode
 */
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
  onNextBottle,
  onViewLeaderboard,
  topBar,
  overlays,
}) {
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
      </div>

      <div className={styles.bottomPanel}>
        {isHostUser ? (
          <>
            <p className={styles.readyHint}>
              {allPlayersCompletedThisRound
                ? isLastBottle
                  ? 'Tutti hanno finito!'
                  : 'Tutti hanno finito: puoi passare alla prossima bottiglia.'
                : 'Attendi che tutti i giocatori finiscano per continuare.'}
            </p>
            <button
              className={styles.continueButton}
              onClick={onNextBottle}
              disabled={!allPlayersCompletedThisRound}>
              {isLastBottle ? 'Concludi' : 'Prossima bottiglia'}
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
                ? 'In attesa che l\u2019host avanzi...'
                : allPlayersCompletedThisRound
                  ? 'Tutti hanno finito!'
                  : 'Attendi che tutti i giocatori finiscano per continuare.'}
            </p>
            <button
              className={styles.continueButton}
              onClick={onNextBottle}
              disabled={!allPlayersCompletedThisRound || playerMarkedNext}>
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
