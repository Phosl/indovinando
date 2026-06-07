import Link from 'next/link'
import styles from './LandingPage.module.scss'
import PartnerPublicCard from '@/components/partner/PartnerPublicCard'

export default function LandingPartnersMap({text = {}, partners = []}) {
  const fallbackPartners = (text.items || []).map((partner, index) => ({
    id: `fallback-${index}`,
    name: partner,
    category: text.fallbackCategory || 'Partner',
    description: '',
    location: '',
    slug: 'partner',
  }))
  const items = partners.length ? partners.slice(0, 6) : fallbackPartners

  return (
    <section id="partner" className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.eyebrow}>{text.eyebrow || 'Partner'}</span>
        <h2>{text.title || 'Enoteche e realtà che credono in Indovinando'}</h2>
      </div>

      <div className={styles.partnerGrid}>
        {items.map((partner) => (
          <PartnerPublicCard
            key={partner.id}
            partner={partner}
            ctaLabel={text.cardCta || 'Apri scheda'}
          />
        ))}
      </div>

      <p className={styles.partnerCounter}>
        {partners.length
          ? (text.counterDynamic || '{count} partner business sono già visibili su Indovinando').replace(
              '{count}',
              String(partners.length),
            )
          : text.counter ||
            '+20 enoteche e professionisti del vino stanno già utilizzando Indovinando'}
      </p>

      <div className={styles.mapPlaceholder}>
        <h3>{text.mapTitle || 'Mappa partner'}</h3>
        <p>
          {text.mapDescription ||
            'Qui potrai visualizzare tutte le enoteche, cantine e wine experience aderenti.'}
        </p>
        <div className={styles.mapActions}>
          <Link href="/partner" className="btn primary btn-inline">
            {text.directoryCta || 'Scopri tutti i partner'}
          </Link>
        </div>
      </div>
    </section>
  )
}
