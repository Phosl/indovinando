import {getWineCourseData} from '@/lib/wineCourseContent'
import TopBar from '@/components/TopBar'
import styles from './admin.module.scss'

const LEVEL_EMOJIS = {
  1: '😭',
  2: '🍷',
  3: '🏅',
  4: '📜',
  5: '🍽️',
  6: '⚗️',
  7: '🌍',
  8: '🥂',
  9: '🍇',
  10: '✨',
}

export default async function AdminCorsiPage() {
  const {levels} = await getWineCourseData('it')

  return (
    <main className={styles.page}>
      <TopBar title="⚙️ Admin — Corsi" back="/dashboard" backLabel="← Dashboard" />

      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Livelli disponibili</h2>
          <p className={styles.hint}>Seleziona un livello per modificarne le lezioni.</p>
        </div>

        <div className={styles.levelGrid}>
          {levels.map((level) => {
            const levelNum = level.order
            return (
              <a key={level.id} href={`/admin/corsi/${levelNum}`} className={styles.levelCard}>
                <span className={styles.levelEmoji}>{LEVEL_EMOJIS[levelNum] ?? '🍷'}</span>
                <div className={styles.levelInfo}>
                  <span className={styles.levelNum}>Livello {levelNum}</span>
                  <strong className={styles.levelTitle}>{level.title}</strong>
                  <span className={styles.levelDesc}>{level.description}</span>
                </div>
                <span className={styles.arrow}>›</span>
              </a>
            )
          })}
        </div>
      </div>
    </main>
  )
}
