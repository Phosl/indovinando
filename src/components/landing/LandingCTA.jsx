import Link from 'next/link'
import styles from './LandingPage.module.scss'

export default function LandingCTA({text = {}}) {
  return (
    <section className={styles.section}>
      <div className={styles.ctaCard}>
        <span className={styles.eyebrow}>{text.eyebrow || 'Inizia ora'}</span>

        <h2>{text.title || 'Pronto a creare la tua prima degustazione?'}</h2>

        <p>
          {text.description ||
            'Crea quiz sul vino, organizza degustazioni interattive e scopri quanto ne sanno davvero i tuoi amici o i tuoi clienti.'}
        </p>

        <div className={styles.ctaActions}>
          <Link href="/auth" className="btn success btn-inline">
            {text.primaryCta || 'Inizia gratis'}
          </Link>

          <a href="#come-funziona" className="btn tertiary btn-inline">
            {text.secondaryCta || 'Guarda come funziona'}
          </a>
        </div>
      </div>
    </section>
  )
}
