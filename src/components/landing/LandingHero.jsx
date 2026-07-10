import Link from 'next/link'
import Image from 'next/image'
import styles from './LandingPage.module.scss'

export default function LandingHero({text = {}}) {
  const proofItems = text.proofItems || [
    'Quiz guidati',
    'Invito con QR',
    'Classifiche finali',
  ]

  return (
    <section className={styles.heroSection}>
      <div className={styles.heroMedia}>
        <Image
          src="/landing/hero.png"
          alt={text.imageAlt || 'Degustazione alla cieca con Indovinando'}
          className={styles.heroBackground}
          fill
          priority
          sizes="(max-width: 768px) calc(100vw - 24px), calc(100vw - 32px)"
        />
      </div>

      <div className={styles.heroOverlay} />

      <div className={styles.heroInner}>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>{text.badge || 'Degustazioni alla cieca'}</span>

          <h1 className={styles.heroTitle}>
            {text.title || 'Crea e organizza degustazioni alla cieca'}
          </h1>

          <p className={styles.heroSubtitle}>
            {text.subtitle ||
              'Prepara il quiz, invita i partecipanti e inizia la degustazione.'}
          </p>

          <div className={styles.heroActions}>
            <Link href="/auth" className="btn success btn-inline">
              {text.primaryCta || 'Prova gratis'}
            </Link>

            <Link href="/demo" className="btn tertiary btn-inline">
              {text.secondaryCta || 'Gioca la demo'}
            </Link>
          </div>

          <ul className={styles.heroProofList} aria-label={text.proofLabel || 'Cosa puoi fare con Indovinando'}>
            {proofItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
