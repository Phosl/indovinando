import styles from './LandingPage.module.scss'

export default function LandingFAQ({text = {}}) {
  const items = text.items || [
    {
      question: 'Cos’è Indovinando?',
      answer:
        'Una piattaforma per creare degustazioni alla cieca, giocarle dal telefono e raccogliere classifiche e valutazioni reali sui vini.',
    },
    {
      question: 'Serve solo per fare quiz?',
      answer:
        'No. Il gioco è una parte dell’esperienza: puoi anche stampare schede, gestire eventi, usare QR e leggere i risultati dopo la degustazione.',
    },
    {
      question: 'È pensato per enoteche o per appassionati?',
      answer:
        'Per entrambi. Funziona per una serata tra amici, per eventi in enoteca, per sommelier e per wine box che vogliono aggiungere un’esperienza guidata.',
    },
    {
      question: 'Che dati raccoglie?',
      answer:
        'Raccoglie risposte, punteggi e valutazioni alla cieca: dati utili per capire cosa piace davvero ai degustatori, non solo cosa dice l’etichetta.',
    },
  ]

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.eyebrow}>{text.eyebrow || 'FAQ'}</span>
        <h2>{text.title || 'Domande veloci, risposte chiare'}</h2>
      </div>

      <div className={styles.faqList}>
        {items.map((item) => (
          <details key={item.question} className={styles.faqItem}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
