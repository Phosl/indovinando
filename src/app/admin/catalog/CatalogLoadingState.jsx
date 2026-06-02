import styles from './catalog.module.scss'

export default function CatalogLoadingState() {
  return (
    <div className={styles.loadingWrap}>
      {Array.from({length: 4}).map((_, index) => (
        <article key={index} className={`skeleton-card ${styles.skeletonItemCard}`}>
          <span className={`skeleton ${styles.skeletonLine} ${styles.skeletonLineWide}`} />
          <span className={`skeleton ${styles.skeletonLine} ${styles.skeletonLineMid}`} />

          <div className={styles.skeletonPills}>
            <span className={`skeleton skeleton-pill ${styles.skeletonPillChip}`} />
            <span className={`skeleton skeleton-pill ${styles.skeletonPillChip}`} />
            <span className={`skeleton skeleton-pill ${styles.skeletonPillChip}`} />
          </div>

          <div className={styles.skeletonGrid}>
            <span className={`skeleton ${styles.skeletonGridItem}`} />
            <span className={`skeleton ${styles.skeletonGridItem}`} />
          </div>
        </article>
      ))}
    </div>
  )
}
