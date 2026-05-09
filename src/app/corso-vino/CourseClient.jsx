'use client'

import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useWineCourseProgress} from './hooks/useWineCourseProgress'
import styles from './course.module.scss'

export default function CourseClient({levels}) {
  const router = useRouter()
  const {loaded, getLevelStatus, getLevelCompletedCount} = useWineCourseProgress()

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => router.back()} aria-label="Indietro">
          ←
        </button>
        <span className={styles.headerTitle}>Corso di Vino</span>
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroEmoji}>🍷</div>
        <h1 className={styles.heroTitle}>Impara il vino</h1>
        <p className={styles.heroSubtitle}>
          Lezioni brevi, quiz interattivi e contenuti accurati. Gratis, senza registrazione.
        </p>
      </div>

      {/* Level list */}
      <div className={styles.levels}>
        {levels.map((level, levelIndex) => {
          const status = loaded ? getLevelStatus(levels, levelIndex) : 'unlocked'
          const completed = loaded ? getLevelCompletedCount(level) : 0
          const total = level.lessonIds.length
          const pct = total ? Math.round((completed / total) * 100) : 0
          const isLocked = status === 'locked'

          return (
            <div
              key={level.id}
              className={`${styles.levelCard} ${isLocked ? styles.locked : ''}`}
              onClick={() => !isLocked && router.push(`/corso-vino/${level.id}`)}>
              <div className={styles.levelEmoji}>{isLocked ? '🔒' : level.emoji}</div>
              <div className={styles.levelInfo}>
                <div className={styles.levelMeta}>
                  <span className={styles.levelOrder}>Livello {level.order}</span>
                  {completed === total && total > 0 && (
                    <span className={styles.levelBadge}>✓ Completato</span>
                  )}
                </div>
                <h2 className={styles.levelTitle}>{level.title}</h2>
                <p className={styles.levelDesc}>{level.description}</p>
                {!isLocked && (
                  <div className={styles.progressRow}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{width: `${pct}%`}} />
                    </div>
                    <span className={styles.progressText}>
                      {completed}/{total} lezioni
                    </span>
                  </div>
                )}
                {isLocked && (
                  <p className={styles.lockHint}>Completa il livello precedente per sbloccare</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
