import styles from './TopBar.module.css'

/**
 * Shared top navigation bar.
 * @param {string|null} back   – href for the back link (null = hide it, default '/dashboard')
 * @param {string}      backLabel – label for the back link
 * @param {string}      title  – centred page title
 * @param {ReactNode}   children – right-side action buttons
 */
export default function TopBar({back = '/dashboard', backLabel = '← Dashboard', title, children}) {
  return (
    <div className={styles.bar}>
      {back != null ? (
        <a href={back} className={`btn type-text ${styles.back}`}>
          {backLabel}
        </a>
      ) : (
        <div className={styles.placeholder} />
      )}

      {title && <span className={styles.title}>{title}</span>}

      {children ? (
        <div className={styles.actions}>{children}</div>
      ) : (
        <div className={styles.placeholder} />
      )}
    </div>
  )
}
