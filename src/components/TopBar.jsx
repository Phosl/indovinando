'use client'

import Link from 'next/link'
import styles from './TopBar.module.scss'
import {useT} from '@/lib/i18n/useT'
import ProgressBar from '@/components/ui/ProgressBar'

export default function TopBar({
  title,
  children,
  onBack,
  className = '',
  titleClassName = '',
  actionsClassName = '',
  maxWidth,
  wrapTitle = false,
  progress = null, // 0-100, renders slim bar at bottom
  back, // Legacy prop, ignored
}) {
  const t = useT('common')
  const containerStyle = maxWidth ? {maxWidth} : {}
  const containerClassName = wrapTitle ? `${styles.topBar} ${styles.wrapped}` : styles.topBar

  const handleBackClick = () => {
    window.dispatchEvent(new CustomEvent('app:navigation-intent', {detail: {direction: 'back'}}))
    onBack?.()
  }

  return (
    <div className={`${containerClassName} ${className}`} style={containerStyle}>
      {onBack ? (
        <button
          type="button"
          className={styles.backBtn}
          onClick={handleBackClick}
          aria-label={t('back')}>
          <img src="/icons/back-icon.svg" alt="" aria-hidden="true" className={styles.backBtnIcon} />
        </button>
      ) : back ? (
        <Link href={back} className={styles.backBtn} aria-label={t('back')}>
          <img src="/icons/back-icon.svg" alt="" aria-hidden="true" className={styles.backBtnIcon} />
        </Link>
      ) : null}
      {title && <h1 className={`${styles.title} ${titleClassName}`}>{title}</h1>}
      <div className={`${styles.actions} ${actionsClassName}`}>{children}</div>
      {progress !== null && (
        <ProgressBar
          value={progress}
          className={styles.progressTrack}
          fillClassName={styles.progressFill}
          ariaLabel="Top bar progress"
        />
      )}
    </div>
  )
}
