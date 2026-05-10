import {memo, useMemo} from 'react'
import styles from '../playerLive.module.scss'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {useT} from '@/lib/i18n/useT'

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

const BOTTLE_ORDINALS_EN = [
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
  'Sixth',
  'Seventh',
  'Eighth',
  'Ninth',
  'Tenth',
]

function getBottleLabel(index, lang) {
  if (lang === 'en') return BOTTLE_ORDINALS_EN[index] || `${index + 1}th`
  return BOTTLE_ORDINALS[index] || `${index + 1}a`
}

/**
 * Shown to the host (locally) between bottles.
 * Non-host players see this same screen when the host broadcasts the transition.
 */
export const BottleTransitionScreen = memo(function BottleTransitionScreen({
  currentBottleIndex,
  totalBottles,
  isHostUser,
  isLastNextBottle,
  onAdvance,
  onViewLeaderboard,
  topBar,
  overlays,
}) {
  const {lang} = useLanguage()
  const t = useT('live.bottleTransition')
  const nextBottleNum = currentBottleIndex + 2
  const nextBottleIndex = currentBottleIndex + 1

  const confettiPieces = useMemo(
    () =>
      Array.from({length: 18}).map((_, idx) => ({
        delay: `${idx * 45}ms`,
        x: `${(idx % 6) * 18 - 40}px`,
        rot: `${(idx % 2 === 0 ? 1 : -1) * (18 + idx * 2)}deg`,
      })),
    [],
  )

  return (
    <div className={styles.fullPage}>
      {topBar}

      <div className={styles.slideContent}>
        {isLastNextBottle ? (
          <>
            <h2 className={styles.waitTitle}>{t('finalResultsTitle')}</h2>
            <p className={styles.readyHint}>{t('finalResultsDesc')}</p>
          </>
        ) : (
          <div className={styles.transitionHero}>
            <div className={styles.confettiBurst} aria-hidden="true">
              {confettiPieces.map((c, idx) => (
                <span
                  key={idx}
                  className={styles.confettiPiece}
                  style={{'--c-delay': c.delay, '--c-x': c.x, '--c-rot': c.rot}}
                />
              ))}
            </div>
            <p className={styles.transitionSubtitle}>
              Bottle {nextBottleNum}/{totalBottles}
            </p>
            <h2 className={styles.transitionTitle}>
              {getBottleLabel(nextBottleIndex, lang)} {t('bottleWord')}
            </h2>
            <p className={styles.readyHint}>{t('start')}</p>
          </div>
        )}
      </div>

      <div className={styles.bottomPanel}>
        {isHostUser ? (
          <button className={styles.continueButton} onClick={onAdvance}>
            {isLastNextBottle ? t('finish') : t('letsBegin')}
          </button>
        ) : (
          <>
            <p className={styles.readyHint}>{t('waitingHost')}</p>
          </>
        )}
      </div>

      {overlays}
    </div>
  )
})
