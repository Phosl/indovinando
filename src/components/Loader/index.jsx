import styles from './Loader.module.scss'

export default function Loader({label = 'Loading...'}) {
  return (
    <div className={styles.wrapper} role="status" aria-live="polite">
      <div className={styles.orbit} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
      <p className={styles.label}>{label}</p>
    </div>
  )
}
