import Link from 'next/link'
import Image from 'next/image'
import styles from './LandingPage.module.scss'

export default function LandingWineBox() {
  return (
    <section className={styles.section}>
      <div className={styles.wineBoxContent}>
        <div className={styles.wineBoxInfo}>
          <span className={styles.eyebrow}>Kit degustazione</span>

          <h2>Porta la degustazione alla cieca pronta sul tavolo</h2>

          <p>
            Buste numerate, schede stampabili, QR partita e classifiche: tutto quello che serve per
            far giocare un gruppo e raccogliere valutazioni reali sui vini.
          </p>

          <ul className={styles.wineBoxSteps}>
            <li>Prepara le bottiglie bendate</li>
            <li>Stampa schede professionali</li>
            <li>Condividi il QR dell&apos;evento</li>
            <li>Raccogli classifiche e valutazioni</li>
          </ul>

          <Link href="/auth" className="btn primary-filled btn-inline">
            Crea la tua degustazione
          </Link>
        </div>

        <div className={styles.wineBoxVisual}>
          <Image
            src="/landing/box.png"
            alt="Kit degustazione Indovinando"
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
