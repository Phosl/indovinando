import Link from 'next/link'
import styles from './LandingPage.module.scss'
import PartnerPublicCard from '@/components/partner/PartnerPublicCard'
import PartnerLandingMap from '@/components/partner/PartnerLandingMap'

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
        <p className={styles.partnerIntro}>
          {text.mapDescription ||
            'Qui troverai enoteche, cantine e wine experience che fanno parte del network Indovinando.'}
        </p>
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

      <div className={styles.partnerShowcase}>
        <div className={styles.partnerMapCard}>
          <div className={styles.partnerMapHeader}>
            <h3>{text.mapTitle || 'Mappa partner'}</h3>
          </div>
          <div className={styles.partnerMapFrame}>
            {partners.length ? (
              <PartnerLandingMap partners={partners} className={styles.partnerMapCanvas} />
            ) : (
              <div className={styles.partnerMapEmpty}>
                <p>{text.mapEmpty || text.mapDescription}</p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.partnerScroller} aria-label={text.scrollerLabel || text.title}>
          {items.map((partner) => (
            <div key={partner.id} className={styles.partnerScrollerItem}>
              <PartnerPublicCard
                partner={partner}
                ctaLabel={text.cardCta || 'Apri scheda'}
                compact
              />
            </div>
          ))}
        </div>

        <div className={styles.mapActions}>
          <Link href="/partner" className="btn primary btn-inline">
            {text.directoryCta || 'Scopri tutti i partner'}
          </Link>
        </div>
      </div>
    </section>
  )
}
