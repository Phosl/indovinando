import Link from 'next/link'
import styles from './PartnerPublicCard.module.scss'

export default function PartnerPublicCard({partner, ctaLabel}) {
  if (!partner) return null

  return (
    <article className={styles.card}>
      {partner.logoUrl ? (
        <div className={styles.logoWrap}>
          <img src={partner.logoUrl} alt={partner.name} className={styles.logo} />
        </div>
      ) : null}

      <div className={styles.header}>
        <span className={styles.badge}>{partner.category}</span>
        {partner.location ? <span className={styles.location}>{partner.location}</span> : null}
      </div>

      <h3 className={styles.title}>{partner.name}</h3>

      {partner.description ? <p className={styles.description}>{partner.description}</p> : null}

      <div className={styles.footer}>
        <Link href={`/partner/${partner.slug}`} className="btn primary btn-small btn-inline">
          {ctaLabel}
        </Link>
      </div>
    </article>
  )
}
