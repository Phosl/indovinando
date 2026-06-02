import CatalogLoadingState from '../../catalog/CatalogLoadingState'
import styles from '../../catalog/catalog.module.scss'

export default function AdminProduttoreDettaglioLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Lista bottiglie</h2>
          <p className={styles.hint}>Caricamento risultati...</p>
        </div>
        <CatalogLoadingState />
      </div>
    </main>
  )
}
