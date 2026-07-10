import Link from 'next/link'
import styles from './LandingPage.module.scss'

export default function LandingCTA({
  text = {},
  primaryHref = '/auth',
  secondaryHref = '/demo',
  variant = 'default',
  sectionId,
}) {
  const cardClassName =
    variant === 'demo' ? `${styles.ctaCard} ${styles.ctaCardDemo}` : styles.ctaCard

  return (
    <section id={sectionId} className={styles.section}>
      <div className={cardClassName}>
        <span className={styles.eyebrow}>{text.eyebrow || 'Inizia ora'}</span>

        <h2>{text.title || 'Pronto a creare la tua prima degustazione?'}</h2>

        <p>
          {text.description ||
            'Crea quiz sul vino, organizza degustazioni interattive e scopri quanto ne sanno davvero i tuoi amici o i tuoi clienti.'}
        </p>

        {Array.isArray(text.proofItems) && text.proofItems.length ? (
          <ul className={styles.ctaProofList}>
            {text.proofItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        <div className={styles.ctaActions}>
          <Link href={primaryHref} className="btn success btn-inline">
            {text.primaryCta || 'Inizia gratis'}
          </Link>

          <Link href={secondaryHref} className="btn tertiary btn-inline">
            {text.secondaryCta || 'Gioca la demo'}
          </Link>
        </div>
      </div>
    </section>
  )
}
