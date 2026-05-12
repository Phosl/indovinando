'use client'

import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import {useWineCourseProgress} from '../hooks/useWineCourseProgress'
import {useT} from '@/lib/i18n/useT'
import styles from './level.module.scss'

const PASS_THRESHOLD = 0.75

export default function LevelClient({level, lessons}) {
  const router = useRouter()
  const {loaded, getLessonStatus, getLessonProgress} = useWineCourseProgress()
  const t = useT('level')

  return (
    <div className={styles.page}>
      <TopBar
        title={t('levelTitle', {index: level.order})}
        onBack={() => router.push('/corso-vino')}></TopBar>

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
          const hasPassed =
            isCompleted && lp?.maxScore > 0 ? lp.score / lp.maxScore >= PASS_THRESHOLD : null

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
                      {t('lesson')} {i + 1}
                    </span>
                    {isCompleted && lp && (
                      <span className={styles.lessonScore}>
                        {lp.score}/{lp.maxScore > 0 ? lp.maxScore : lesson.questions.length}
                      </span>
                    )}
                    {hasPassed !== null && (
                      <span className={hasPassed ? styles.passBadge : styles.failBadge}>
                        {hasPassed ? '✓ Superato' : '↩ Da ripassare'}
                      </span>
                    )}
                    {isCompleted && <span className={styles.lessonRepeat}>{t('repeat')}</span>}
                  </div>
                  <span className={styles.lessonTitle}>{lesson.title}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
