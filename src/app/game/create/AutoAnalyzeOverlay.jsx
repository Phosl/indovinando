'use client'

import styles from './gameCreate.module.scss'

export default function AutoAnalyzeOverlay({
  analyzeCelebratePrefix,
  currentAnalyzeBatchCount,
  currentAnalyzeBatchIndex,
  currentAnalyzeBatchTotal,
  currentAnalyzeStepLabel,
  lastAnalyzedBottleName,
  pendingAnalyzeCount,
  t,
}) {
  return (
    <div className={styles.autoPageAnalyzeOverlay}>
      <div className={styles.autoPageAnalyzePanel}>
        <strong>
          {t('automaticAnalyzeBottleProgress', {
            current: String(currentAnalyzeBatchIndex || 1),
            total: String(currentAnalyzeBatchTotal || currentAnalyzeBatchCount || pendingAnalyzeCount),
          })}
        </strong>
        <div className={styles.autoPageAnalyzeProgressBar} aria-hidden="true">
          <span />
        </div>

        {currentAnalyzeStepLabel ? (
          <div className={`${styles.autoPageAnalyzeCard} ${styles.autoPageAnalyzeCardCurrent}`}>
            <span className={styles.autoPageAnalyzeCardLabel}>{t('automaticAnalyzeCurrentLabel')}</span>
            <strong>{currentAnalyzeStepLabel}</strong>
          </div>
        ) : null}

        {(lastAnalyzedBottleName || currentAnalyzeStepLabel) && (
          <div className={styles.autoPageAnalyzeCards}>
            {lastAnalyzedBottleName ? (
              <div className={`${styles.autoPageAnalyzeCard} ${styles.autoPageAnalyzeCardFound}`}>
                <span className={styles.autoPageAnalyzeCardLabel}>{t('automaticAnalyzeFoundLabel')}</span>
                <strong>
                  {t('automaticAnalyzeFoundBottle', {
                    prefix: analyzeCelebratePrefix,
                    name: lastAnalyzedBottleName,
                  })}
                </strong>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
