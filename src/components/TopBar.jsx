'use client'

import styles from './TopBar.module.scss'

/**
 * Centralized TopBar component with 3D/cartoon styling
 * Used across game views, live sessions, and course pages
 */
export default function TopBar({
  title,
  children,
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
      {title && <h1 className={`${styles.title} ${titleClassName}`}>{title}</h1>}
      <div className={`${styles.actions} ${actionsClassName}`}>{children}</div>
    </div>
  )
}
