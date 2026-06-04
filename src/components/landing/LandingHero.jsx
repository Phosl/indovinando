import Link from 'next/link'
import styles from './LandingPage.module.scss'

export default function LandingHero() {
  return (
    <section className={styles.heroSection}>
      <div className={styles.heroContent}>
        <img src="/logo.svg" alt="Indovinando" className={styles.heroLogo} />

        <span className={styles.heroBadge}>🍷 Wine Tasting Game</span>

        <h1 className={styles.heroTitle}>Trasforma una degustazione di vino in un gioco.</h1>

        <p className={styles.heroSubtitle}>
          Crea degustazioni alla cieca, sfida amici e clienti, scopri i vini con l&apos;intelligenza
          artificiale e impara divertendoti.
        </p>

        <div className={styles.heroActions}>
          <Link href="/auth" className="btn success btn-inline">
            Inizia gratis
          </Link>

          <a href="#come-funziona" className="btn tertiary btn-inline">
            Scopri come funziona
          </a>
        </div>
      </div>

      <div className={styles.heroVisual}>
        <img
          src="/game-options-quick.svg"
          alt="Anteprima Indovinando"
          className={styles.heroImage}
        />
      </div>
    </section>
  )
}
