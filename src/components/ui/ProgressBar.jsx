import styles from './ProgressBar.module.scss'

export default function ProgressBar({
  value = 0,
  variant = 'default',
  className = '',
  fillClassName = '',
  trackClassName = '',
  ariaLabel = 'Progress',
}) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0))

  return (
    <div
      className={[
        styles.track,
        variant === 'course' ? styles.trackCourse : '',
        trackClassName,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}>
      <span
        className={[
          styles.fill,
          variant === 'course' ? styles.fillCourse : '',
          fillClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{width: `${safeValue}%`}}
      />
    </div>
  )
}
