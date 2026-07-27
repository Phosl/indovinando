import Link from 'next/link'
import Image from 'next/image'
import styles from './LandingPage.module.scss'

export default function LandingWineBox({text = {}}) {
  const steps = text.steps || [
    'Prepara le bottiglie bendate',
    'Stampa schede professionali',
    "Condividi il QR dell'evento",
    'Raccogli classifiche e valutazioni',
  ]

  return (
    <section className={styles.section}>
      <div className={styles.wineBoxContent}>
        <div className={styles.wineBoxInfo}>
          <span className={styles.eyebrow}>{text.eyebrow || 'Kit degustazione'}</span>

          <h2>{text.title || 'Porta la degustazione alla cieca pronta sul tavolo'}</h2>

          <p>
            {text.description ||
              'Buste numerate, schede stampabili, QR partita e classifiche: tutto quello che serve per far giocare un gruppo e raccogliere valutazioni reali sui vini.'}
          </p>

          <ul className={styles.wineBoxSteps}>
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>

          <Link href="/auth" className="btn primary-filled btn-inline">
            {text.cta || 'Crea la tua degustazione'}
          </Link>
        </div>

        <div className={styles.wineBoxVisual}>
          <Image
            src="/landing/box.png"
            alt={text.imageAlt || 'Kit degustazione Indovinando'}
            className={styles.wineBoxImage}
            width={1536}
            height={1024}
            sizes="(max-width: 900px) calc(100vw - 48px), 520px"
          />
        </div>
      </div>
    </section>
  )
}
