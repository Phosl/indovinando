import styles from './LandingPage.module.scss'

export default function LandingPartnersMap({text = {}}) {
  const partners = text.items || [
    'Enoteca Partner',
    'Wine Club',
    'Cantina Partner',
    'Wine Experience',
    'Degustazioni Milano',
    'Wine Hub',
  ]

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.eyebrow}>{text.eyebrow || 'Partner'}</span>
        <h2>{text.title || 'Enoteche e realtà che credono in Indovinando'}</h2>
      </div>

      <div className={styles.partnerGrid}>
        {partners.map((partner) => (
          <div key={partner} className={styles.partnerCard}>
            {partner}
          </div>
        ))}
      </div>

      <p className={styles.partnerCounter}>
        {text.counter || '+20 enoteche e professionisti del vino stanno già utilizzando Indovinando'}
      </p>

      <div className={styles.mapPlaceholder}>
        <h3>{text.mapTitle || 'Mappa partner'}</h3>
        <p>
          {text.mapDescription ||
            'Qui potrai visualizzare tutte le enoteche, cantine e wine experience aderenti.'}
        </p>
      </div>
    </section>
  )
}
