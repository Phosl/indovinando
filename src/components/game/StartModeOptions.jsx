'use client'

import Icon from '@/components/Icon'
import {ButtonLink} from '@/components/ui/Button'
import {useT} from '@/lib/i18n/useT'
import styles from './GamePlayView/GamePlayView.module.scss'

export default function StartModeOptions({gameId, isPublished = false}) {
  const t = useT('gamePlayViewActions')
  const modeQuery = '?back=mode'

  return (
    <div className={styles.startModalActions}>
      {isPublished ? (
        <ButtonLink
          variant="custom"
          href={`/enoteca/${gameId}${modeQuery}`}
          className={`${styles.startModeOption} ${styles.startModeOptionQuaternary}`}>
          <div className={styles.startModeCopy}>
            <span className={styles.startModeTitle}>{t('playEnoteca')}</span>
            <span className={styles.startModeDescription}>{t('enotecaDescription')}</span>
          </div>
          <span className={styles.startModeArrow} aria-hidden="true">
            <Icon name="forward" size={20} />
          </span>
        </ButtonLink>
      ) : null}

      <ButtonLink
        variant="custom"
        href={`/game/${gameId}/table-live${modeQuery}`}
        className={`${styles.startModeOption} ${styles.startModeOptionSelected}`}>
        <div className={styles.startModeCopy}>
          <span className={styles.startModeTitle}>{t('playTableLive')}</span>
          <span className={styles.startModeDescription}>{t('tableLiveDescription')}</span>
        </div>
        <span className={styles.startModeArrow} aria-hidden="true">
          <Icon name="forward" size={20} />
        </span>
      </ButtonLink>
    </div>
  )
}
