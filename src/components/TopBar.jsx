'use client'

import styles from './TopBar.module.scss'

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
  const containerStyle = maxWidth ? {maxWidth} : {}
  const containerClassName = wrapTitle ? `${styles.topBar} ${styles.wrapped}` : styles.topBar

  return (
    <div className={`${containerClassName} ${className}`} style={containerStyle}>
      {onBack && (
        <button type="button" className={styles.backBtn} onClick={onBack} aria-label="Back">
          ←
        </button>
      )}
      {title && <h1 className={`${styles.title} ${titleClassName}`}>{title}</h1>}
      <div className={`${styles.actions} ${actionsClassName}`}>{children}</div>
    </div>
  )
}
