import styles from './partner.module.scss'

export default function PartnerLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={`skeleton skeleton-frame ${styles.loadingTopBar}`} />
        <section className={`skeleton skeleton-card ${styles.loadingHero}`} />
        <section className={styles.loadingGrid}>
          <div className={`skeleton skeleton-card ${styles.loadingCard}`} />
          <div className={`skeleton skeleton-card ${styles.loadingCard}`} />
          <div className={`skeleton skeleton-card ${styles.loadingCard}`} />
        </section>
      </div>
    </main>
  )
}
