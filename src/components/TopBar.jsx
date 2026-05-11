'use client'

import styles from './TopBar.module.scss'
import {useT} from '@/lib/i18n/useT'

export default function TopBar({
  title,
  children,
  onBack,
  className = '',
  titleClassName = '',
  actionsClassName = '',
  maxWidth,
  wrapTitle = false,
  back, // Legacy prop, ignored
}) {
  const t = useT('common')
  const containerStyle = maxWidth ? {maxWidth} : {}
  const containerClassName = wrapTitle ? `${styles.topBar} ${styles.wrapped}` : styles.topBar

  return (
    <div className={`${containerClassName} ${className}`} style={containerStyle}>
      {onBack && (
        <button type="button" className={styles.backBtn} onClick={onBack} aria-label={t('back')}>
          ←
        </button>
      )}
      {title && <h1 className={`${styles.title} ${titleClassName}`}>{title}</h1>}
      <div className={`${styles.actions} ${actionsClassName}`}>{children}</div>
    </div>
  )
}
