import styles from './LandingPage.module.scss'

export default function LandingPartnersMap() {
  const partners = [
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
        <span className={styles.eyebrow}>Partner</span>
        <h2>Enoteche e realtà che credono in Indovinando</h2>
      </div>

      <div className={styles.partnerGrid}>
        {partners.map((partner) => (
          <div key={partner} className={styles.partnerCard}>
            {partner}
          </div>
        ))}
      </div>

      <p className={styles.partnerCounter}>
        +20 enoteche e professionisti del vino stanno già utilizzando Indovinando
      </p>

      <div className={styles.mapPlaceholder}>
        <h3>Mappa partner</h3>
        <p>Qui potrai visualizzare tutte le enoteche, cantine e wine experience aderenti.</p>
      </div>
    </section>
  )
}
