'use client'

import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import GuestWarningModal from '@/components/course/GuestWarningModal'
import {useWineCourseProgress} from './hooks/useWineCourseProgress'
import styles from './course.module.scss'
import {useT} from '@/lib/i18n/useT'

export default function CourseClient({levels}) {
  const router = useRouter()
  const {loaded, userId, getLevelCompletedCount} = useWineCourseProgress()
  const t = useT('course')
  const [showGuestWarning, setShowGuestWarning] = useState(false)

  useEffect(() => {
    if (loaded && !userId) {
      setShowGuestWarning(true)
    }
  }, [loaded, userId])

  return (
    <div className={styles.page}>
      <TopBar title={t('title')} onBack={() => router.push('/dashboard')}></TopBar>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroEmoji}>🍷</div>
        <h1 className={styles.heroTitle}>{t('heroTitle')}</h1>
        <p className={styles.heroSubtitle}>{t('heroSubtitle')}</p>
      </div>

      <GuestWarningModal
        isOpen={showGuestWarning && !userId}
        onClose={() => setShowGuestWarning(false)}
      />

      {/* Level list */}
      <div className={styles.levels}>
        {levels.map((level) => {
          const completed = loaded ? getLevelCompletedCount(level) : 0
          const total = level.lessonIds.length
          const pct = total ? Math.round((completed / total) * 100) : 0

          return (
            <div
              key={level.id}
              className={styles.levelCard}
              onClick={() => router.push(`/corso-vino/${level.id}`)}>
              <div className={styles.levelEmoji}>{level.emoji}</div>
              <div className={styles.levelInfo}>
                <div className={styles.levelMeta}>
                  <span className={styles.levelOrder}>Level {level.order}</span>
                  {completed === total && total > 0 && (
                    <span className={styles.levelBadge}>{t('completed')}</span>
                  )}
                </div>
                <h2 className={styles.levelTitle}>{level.title}</h2>
                <p className={styles.levelDesc}>{level.description}</p>
                <div className={styles.progressRow}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{width: `${pct}%`}} />
                  </div>
                  <span className={styles.progressText}>
                    {completed}/{total} {t('lessons')}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
