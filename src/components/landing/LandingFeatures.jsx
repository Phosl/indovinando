import styles from './LandingPage.module.scss'

export default function LandingFeatures({text = {}}) {
  const items = text.items || [
    {
      icon: '🍷',
      title: 'Scansiona le bottiglie',
      description: "L'AI riconosce etichetta, produttore, annata e caratteristiche del vino.",
    },
    {
      icon: '🎮',
      title: 'Genera il quiz',
      description: 'Crea automaticamente una degustazione interattiva in pochi secondi.',
    },
    {
      icon: '🏆',
      title: 'Gioca e confronta i risultati',
      description: 'Sfida amici, clienti o partecipanti e scopri chi conosce davvero il vino.',
    },
  ]

  return (
    <section id="come-funziona" className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.eyebrow}>{text.eyebrow || 'Come funziona'}</span>
        <h2>{text.title || 'Dal tavolo alla degustazione in meno di un minuto'}</h2>
      </div>

      <div className={styles.featureGrid}>
        {items.map((item) => (
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
