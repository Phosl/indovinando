import Link from 'next/link'
import styles from './LandingPage.module.scss'

export default function LandingWineBox() {
  return (
    <section className={styles.section}>
      <div className={styles.wineBoxContent}>
        <div className={styles.wineBoxInfo}>
          <span className={styles.eyebrow}>Wine Box Experience</span>

          <h2>Trasforma una semplice box in un&apos;esperienza di degustazione completa</h2>

          <p>
            Ogni bottiglia diventa una sfida. Scansiona le etichette, genera il quiz automaticamente
            e scopri chi riconosce davvero i vini della degustazione.
          </p>

          <ul className={styles.wineBoxSteps}>
            <li>📦 Ricevi la box</li>
            <li>🍷 Degusta le bottiglie</li>
            <li>📱 Scansiona le etichette</li>
            <li>🏆 Scopri il punteggio finale</li>
          </ul>

          <Link href="/auth" className="btn primary-filled btn-inline">
            Scopri la Wine Box
          </Link>
        </div>

        <div className={styles.wineBoxVisual}>
          <img src="/img-wine-box.png" alt="Wine Box Indovinando" className={styles.wineBoxImage} />
        </div>
      </div>
    </section>
  )
}
