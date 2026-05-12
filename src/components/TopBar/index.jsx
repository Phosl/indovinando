import styles from './TopBar.module.scss'

/**
 * Shared top navigation bar.
 * @param {string|null} back   – href for the back link (null = hide it, default '/dashboard')
 * @param {string}      backLabel – label for the back link
 * @param {string}      title  – centred page title
 * @param {ReactNode}   children – right-side action buttons
 * @param {string}      className – optional root class override
 * @param {string}      titleClassName – optional title class override
 * @param {string}      actionsClassName – optional actions class override
 * @param {boolean}     wrapTitle – allow title to wrap to multiple lines
 * @param {string}      maxWidth – max width of the top bar container
 */
export default function TopBar({
  back = '/dashboard',
  backLabel = '← Dashboard',
  title,
  children,
  className = '',
  titleClassName = '',
  actionsClassName = '',
  wrapTitle = false,
  maxWidth = '960px',
}) {
  const hasTitle = Boolean(title)

  return (
    <div className={[styles.bar, className].filter(Boolean).join(' ')} style={{maxWidth}}>
      {back != null ? (
        <a href={back} className={`btn type-text ${styles.back}`}>
          <span className={styles.backArrow} aria-hidden="true">
            {'<'}
          </span>
          <span>{backLabel.replace(/^←\s*/, '')}</span>
        </a>
      ) : (
        <div className={styles.placeholder} />
      )}

      {hasTitle && (
        <span
          className={[styles.title, wrapTitle ? styles.titleWrap : '', titleClassName]
            .filter(Boolean)
            .join(' ')}>
          {title}
        </span>
      )}

      {children ? (
        <div
          className={[styles.actions, !hasTitle ? styles.actionsNoTitle : '', actionsClassName]
            .filter(Boolean)
            .join(' ')}>
          {children}
        </div>
      ) : (
        hasTitle && <div className={styles.placeholder} />
      )}
    </div>
  )
}
