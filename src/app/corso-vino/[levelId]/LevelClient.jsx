'use client'

import {useRouter} from 'next/navigation'
import {useWineCourseProgress} from '../hooks/useWineCourseProgress'
import styles from './level.module.scss'
import {useLanguage} from '@/components/i18n/LanguageProvider'

export default function LevelClient({level, lessons}) {
  const router = useRouter()
  const {loaded, getLessonStatus, getLessonProgress} = useWineCourseProgress()
  const {lang} = useLanguage()
  const isEnglish = lang === 'en'

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.push('/corso-vino')}
          aria-label={isEnglish ? 'Back to course' : 'Torna al corso'}>
          ←
        </button>
        <span className={styles.headerTitle}>Level {level.order}</span>
      </div>

      {/* Level hero */}
      <div className={styles.levelHero}>
        <div className={styles.levelEmoji}>{level.emoji}</div>
        <h1 className={styles.levelTitle}>{level.title}</h1>
        <p className={styles.levelDesc}>{level.description}</p>
      </div>

      {/* Lesson path */}
      <div className={styles.path}>
        {lessons.map((lesson, i) => {
          const status = loaded ? getLessonStatus(level, i) : 'unlocked'
          const lp = loaded ? getLessonProgress(level.id, lesson.id) : null
          const isCompleted = status === 'completed'
          const isCurrent = !isCompleted

          return (
            <div key={lesson.id} className={styles.pathItem}>
              {/* Connector line (skip for first item) */}
              {i > 0 && (
                <div className={`${styles.connector} ${isCompleted ? styles.connectorDone : ''}`} />
              )}

              <div
                className={`${styles.lessonCard} ${
                  isCompleted
                    ? styles.lessonCompleted
                    : isCurrent
                      ? styles.lessonCurrent
                      : styles.lessonLocked
                }`}
                onClick={() => router.push(`/corso-vino/${level.id}/${lesson.id}`)}>
                <div className={styles.lessonIcon}>{isCompleted ? '✓' : lesson.emoji}</div>
                <div className={styles.lessonBody}>
                  <div className={styles.lessonMeta}>
                    <span className={styles.lessonOrder}>
                      {isEnglish ? 'Lesson' : 'Lezione'} {i + 1}
                    </span>
                    {isCompleted && lp && (
                      <span className={styles.lessonScore}>
                        {lp.score}/{lesson.questions.length}
                      </span>
                    )}
                    {isCompleted && (
                      <span className={styles.lessonRepeat}>{isEnglish ? 'Repeat' : 'Ripeti'}</span>
                    )}
                  </div>
                  <span className={styles.lessonTitle}>{lesson.title}</span>
                </div>
                <div className={styles.lessonArrow}>{isCompleted ? '↺' : '▶'}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
