'use client'

import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import {useWineCourseProgress} from './hooks/useWineCourseProgress'
import styles from './course.module.scss'
import {useLanguage} from '@/components/i18n/LanguageProvider'

export default function CourseClient({levels}) {
  const router = useRouter()
  const {loaded, userId, getLevelCompletedCount} = useWineCourseProgress()
  const {lang} = useLanguage()
  const isEnglish = lang === 'en'

  return (
    <div className={styles.page}>
      <TopBar title={isEnglish ? 'Wine Course' : 'Corso Vino'}>
        <button
          type="button"
          className="btn secondary"
          onClick={() => router.push('/dashboard')}
          aria-label={isEnglish ? 'Back to dashboard' : 'Torna alla dashboard'}>
          ← {isEnglish ? 'Back' : 'Indietro'}
        </button>
      </TopBar>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroEmoji}>🍷</div>
        <h1 className={styles.heroTitle}>{isEnglish ? 'Learn wine' : 'Impara il vino'}</h1>
        <p className={styles.heroSubtitle}>
          {isEnglish
            ? 'Short lessons, interactive quizzes and accurate content. Free, no signup required.'
            : 'Lezioni brevi, quiz interattivi e contenuti accurati. Gratis, senza registrazione.'}
        </p>
      </div>

      {/* {!userId && (
        <div className={styles.guestWarning}>
          <div className={styles.guestWarningTitle}>
            {isEnglish ? 'Guest mode active' : 'Modalita ospite attiva'}
          </div>
          <p className={styles.guestWarningText}>
            {isEnglish
              ? 'Your course progress is only stored on this device and may be lost.'
              : 'I progressi del corso sono salvati solo su questo dispositivo e potrebbero andare persi.'}
          </p>
          <a href="/?next=/corso-vino" className="btn primary">
            {isEnglish ? 'Sign up to save progress' : 'Registrati per salvare i progressi'}
          </a>
        </div>
      )} */}

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
                    <span className={styles.levelBadge}>
                      {isEnglish ? '✓ Completed' : '✓ Completato'}
                    </span>
                  )}
                </div>
                <h2 className={styles.levelTitle}>{level.title}</h2>
                <p className={styles.levelDesc}>{level.description}</p>
                <div className={styles.progressRow}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{width: `${pct}%`}} />
                  </div>
                  <span className={styles.progressText}>
                    {completed}/{total} {isEnglish ? 'lessons' : 'lezioni'}
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
