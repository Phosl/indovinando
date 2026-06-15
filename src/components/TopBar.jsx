'use client'

import Link from 'next/link'
import styles from './TopBar.module.scss'
import {useT} from '@/lib/i18n/useT'
import ProgressBar from '@/components/ui/ProgressBar'

function BackIcon({className = ''}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}>
      <path
        d="M14.5 19l-7-7 7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

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
  safeAreaTop = false,
  back, // Legacy prop, ignored
}) {
  const t = useT('common')
  const containerStyle = maxWidth ? {maxWidth} : {}
  const baseContainerClassName = wrapTitle ? `${styles.topBar} ${styles.wrapped}` : styles.topBar
  const containerClassName = safeAreaTop
    ? `${baseContainerClassName} ${styles.safeAreaTop}`
    : baseContainerClassName

  const handleBackClick = () => {
    window.dispatchEvent(new CustomEvent('app:navigation-intent', {detail: {direction: 'back'}}))
    onBack?.()
  }

  return (
    <div className={`${containerClassName} ${className}`} style={containerStyle}>
      <div className={styles.sideSlot}>
        {onBack ? (
          <button
            type="button"
            className={styles.backBtn}
            onClick={handleBackClick}
            aria-label={t('back')}>
            <BackIcon className={styles.backBtnIcon} />
          </button>
        ) : back ? (
          <Link href={back} className={styles.backBtn} aria-label={t('back')}>
            <BackIcon className={styles.backBtnIcon} />
          </Link>
        ) : null}
      </div>
      {title && progress === null && (
        <h1 className={`${styles.title} ${titleClassName}`}>{title}</h1>
      )}
      {progress !== null && title && (
        <div className={styles.titleWithProgress}>
          <h1 className={`${styles.title} ${titleClassName}`}>{title}</h1>
          <ProgressBar
            value={progress}
            className={styles.progressTrack}
            fillClassName={styles.progressFill}
            ariaLabel="Top bar progress"
          />
        </div>
      )}
      <div className={`${styles.sideSlot} ${styles.actionsSlot}`}>
        <div className={`${styles.actions} ${actionsClassName}`}>{children}</div>
      </div>
    </div>
  )
}
