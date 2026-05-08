import styles from '../playerLive.module.scss'

const BOTTLE_ORDINALS = [
  'Prima',
  'Seconda',
  'Terza',
  'Quarta',
  'Quinta',
  'Sesta',
  'Settima',
  'Ottava',
  'Nona',
  'Decima',
]

function getBottleLabel(index) {
  return BOTTLE_ORDINALS[index] || `${index + 1}a`
}

/**
 * Shown to the host (locally) between bottles.
 * Non-host players see this same screen when the host broadcasts the transition.
 */
export function BottleTransitionScreen({
  currentBottleIndex,
  totalBottles,
  isHostUser,
  isLastNextBottle,
  onAdvance,
  onViewLeaderboard,
  topBar,
  overlays,
}) {
  const nextBottleNum = currentBottleIndex + 2
  const nextBottleIndex = currentBottleIndex + 1

  return (
    <div className={styles.fullPage}>
      {topBar}

      <div className={styles.slideContent}>
        {isLastNextBottle ? (
          <>
            <h2 className={styles.waitTitle}>🎉 Ultimi risultati!</h2>
            <p className={styles.readyHint}>Tra poco vedrai la classifica finale.</p>
          </>
        ) : (
          <div className={styles.transitionHero}>
            <div className={styles.confettiBurst} aria-hidden="true">
              {Array.from({length: 18}).map((_, idx) => (
                <span
                  key={idx}
                  className={styles.confettiPiece}
                  style={{
                    '--c-delay': `${idx * 45}ms`,
                    '--c-x': `${(idx % 6) * 18 - 40}px`,
                    '--c-rot': `${(idx % 2 === 0 ? 1 : -1) * (18 + idx * 2)}deg`,
                  }}
                />
              ))}
            </div>
            <p className={styles.transitionSubtitle}>
              Bottiglia {nextBottleNum}/{totalBottles}
            </p>
            <h2 className={styles.transitionTitle}>{getBottleLabel(nextBottleIndex)} bottiglia!</h2>
            <p className={styles.readyHint}>Inizia!</p>
          </div>
        )}
      </div>

      <div className={styles.bottomPanel}>
        {isHostUser ? (
          <button className={styles.continueButton} onClick={onAdvance}>
            {isLastNextBottle ? 'Concludi' : 'Iniziamo'}
          </button>
        ) : (
          <>
            <p className={styles.readyHint}>In attesa dell&apos;host...</p>
            {isLastNextBottle && (
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
