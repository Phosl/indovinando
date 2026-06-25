import styles from '../partner.module.scss'

export default function PartnerDetailLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={`skeleton skeleton-frame ${styles.loadingTopBar}`} />
        <section className={`skeleton skeleton-card ${styles.loadingHero}`} />
        <section className={styles.detailGrid}>
          <div className={`skeleton skeleton-card ${styles.loadingDetailCard}`} />
          <div className={`skeleton skeleton-card ${styles.loadingDetailCard}`} />
        </section>
      </div>
    </main>
  )
}
