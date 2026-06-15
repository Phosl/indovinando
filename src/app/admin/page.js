import Link from 'next/link'
import {requireSuperAdmin} from '@/lib/courseAdmin'
import styles from './corsi/admin.module.scss'

export default async function AdminPage() {
  await requireSuperAdmin()

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Pannello amministrazione</h2>
          <p className={styles.hint}>Gestione corsi e catalogo vini.</p>
        </div>

        <div className={styles.levelGrid}>
          <Link href="/admin/corsi" className={styles.levelCard}>
            <span className={styles.levelEmoji}>C</span>
            <div className={styles.levelInfo}>
              <span className={styles.levelNum}>Modulo</span>
              <strong className={styles.levelTitle}>Corsi</strong>
              <span className={styles.levelDesc}>Editor livelli e lezioni</span>
            </div>
            <span className={styles.arrow}>{'>'}</span>
          </Link>

          <Link href="/admin/produttori" className={styles.levelCard}>
            <span className={styles.levelEmoji}>P</span>
            <div className={styles.levelInfo}>
              <span className={styles.levelNum}>Catalogo</span>
              <strong className={styles.levelTitle}>Produttori</strong>
              <span className={styles.levelDesc}>Vista aggregata dei produttori</span>
            </div>
            <span className={styles.arrow}>{'>'}</span>
          </Link>

          <Link href="/admin/vini" className={styles.levelCard}>
            <span className={styles.levelEmoji}>V</span>
            <div className={styles.levelInfo}>
              <span className={styles.levelNum}>Catalogo</span>
              <strong className={styles.levelTitle}>Vini</strong>
              <span className={styles.levelDesc}>Lista record con dati principali</span>
            </div>
            <span className={styles.arrow}>{'>'}</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
