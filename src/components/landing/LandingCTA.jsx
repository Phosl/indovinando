import Link from 'next/link'
import styles from './LandingPage.module.scss'

export default function LandingCTA() {
  return (
    <section className={styles.section}>
      <div className={styles.ctaCard}>
        <span className={styles.eyebrow}>Inizia ora</span>

        <h2>Pronto a creare la tua prima degustazione?</h2>

        <p>
          Crea quiz sul vino, organizza degustazioni interattive e scopri quanto ne sanno davvero i
          tuoi amici o i tuoi clienti.
        </p>

        <div className={styles.ctaActions}>
          <Link href="/auth" className="btn success btn-inline">
            Inizia gratis
          </Link>

          <a href="#come-funziona" className="btn tertiary btn-inline">
            Guarda come funziona
          </a>
        </div>
      </div>
    </section>
  )
}
