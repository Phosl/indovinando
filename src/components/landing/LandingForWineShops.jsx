import styles from './LandingPage.module.scss'

export default function LandingForWineShops({text = {}}) {
  const audiences = text.items || [
    {
      icon: '🍷',
      title: 'Per appassionati',
      description:
        'Trasforma una semplice degustazione tra amici in una sfida divertente e coinvolgente.',
    },
    {
      icon: '🏪',
      title: 'Per enoteche',
      description:
        'Organizza degustazioni guidate, eventi e serate a tema senza preparare manualmente quiz e schede.',
    },
    {
      icon: '📦',
      title: 'Per wine box e aziende',
      description:
        'Aggiungi un’esperienza interattiva alle tue box degustazione e aumenta il coinvolgimento dei clienti.',
    },
  ]

  return (
    <section className={styles.sectionAlt}>
      <div className={styles.sectionHeader}>
        <span className={styles.eyebrow}>{text.eyebrow || 'A chi si rivolge'}</span>
        <h2>{text.title || 'Una piattaforma per ogni esperienza di degustazione'}</h2>
      </div>

      <div className={styles.featureGrid}>
        {audiences.map((item) => (
          <article key={item.title} className={styles.featureCard}>
            <div className={styles.featureIcon}>{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
