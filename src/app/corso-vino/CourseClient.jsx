'use client'

import {useState, useEffect, useMemo, useCallback} from 'react'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import Icon from '@/components/Icon'
import GuestWarningModal from '@/components/course/GuestWarningModal'
import CourseLevelCover from '@/components/course/CourseLevelCover'
import ProgressBar from '@/components/ui/ProgressBar'
import {useWineCourseProgress} from './hooks/useWineCourseProgress'
import {computeUserLevelProgress} from '@/lib/playerLevelUtils'
import {canAccessLevel, getAuthRedirectPath, getLockedReason} from '@/lib/courseAccess'
import styles from './course.module.scss'
import {useT} from '@/lib/i18n/useT'

const PASS_THRESHOLD = 0.75

export default function CourseClient({levels, isAdmin = false, viewer, lang = 'it'}) {
  const router = useRouter()
  const {loaded, authChecked, userId, getLevelCompletedCount, getLessonProgress, getLessonStatus} =
    useWineCourseProgress()
  const t = useT('course')
  const [showGuestWarning, setShowGuestWarning] = useState(false)
  const backHref = authChecked && !userId ? '/' : '/dashboard'

  const handleLevelClick = useCallback(
    (level) => {
      const path = `/corso-vino/${level.id}`
      const canAccess = canAccessLevel(level, viewer)
      if (!canAccess) {
        const reason = getLockedReason(level, viewer)
        if (reason === 'registered') {
          router.push(getAuthRedirectPath(path, lang))
          return
        }
        router.push('/profilo')
        return
      }
      router.push(path)
    },
    [lang, router, viewer],
  )

  const nextLevelProgress = useMemo(() => {
    if (!levels?.length) return null

    const totalLessons = levels.reduce((sum, level) => sum + level.lessonIds.length, 0)
    const completedLessons = loaded
      ? levels.reduce((sum, level) => sum + getLevelCompletedCount(level), 0)
      : 0
    const userLevel = computeUserLevelProgress(completedLessons, totalLessons)

    return {
      isMax: userLevel.isMax,
      levelNum: userLevel.levelNum,
      pct: userLevel.progressInLevel,
      completed: completedLessons,
      total: totalLessons || 1,
      nextLevel: userLevel.nextLevelNum,
    }
  }, [levels, loaded, getLevelCompletedCount])

  useEffect(() => {
    if (loaded && authChecked && !userId) {
      setShowGuestWarning(true)
    }
  }, [loaded, authChecked, userId])

  return (
    <div className={styles.page}>
      <TopBar title={t('title')} onBack={() => router.push(backHref)}>
        {isAdmin && (
          <a
            href="/admin/corsi"
            className="btn secondary"
            style={{fontSize: '13px', padding: '6px 12px'}}>
            ⚙️ Admin
          </a>
        )}
      </TopBar>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>{t('heroTitle')}</h1>
          <p className={styles.heroSubtitle}>{t('heroSubtitle')}</p>
          {nextLevelProgress && (
            <div className={styles.heroProgress}>
              <div className={styles.heroProgressLabels}>
                <span className={styles.heroProgressLevel}>
                  {nextLevelProgress.isMax
                    ? t('nextLevelMax')
                    : t('nextLevelLabel', {index: nextLevelProgress.levelNum})}
                </span>
                <span className={styles.heroProgressNext}>
                  {nextLevelProgress.isMax
                    ? ''
                    : `→ ${t('nextLevelLabel', {index: nextLevelProgress.nextLevel})}`}
                </span>
              </div>
              <ProgressBar
                value={nextLevelProgress.pct}
                variant="course"
                className={styles.heroProgressTrack}
                ariaLabel="Course hero progress"
              />
            </div>
          )}
        </div>
      </div>

      <GuestWarningModal
        isOpen={showGuestWarning && !userId}
        onClose={() => setShowGuestWarning(false)}
      />

      {!viewer?.isRegistered && (
        <section className={styles.accessPanel}>
          <div className={styles.accessPanelText}>
            <strong>{t('accessPanelTitle')}</strong>
            <p>{t('accessPanelDescription')}</p>
          </div>
          <button
            type="button"
            className="btn success-filled btn-small"
            onClick={() => router.push(getAuthRedirectPath('/corso-vino', lang))}>
            {t('accessPanelCta')}
          </button>
        </section>
      )}

      {/* Level list */}
      <div className={styles.levels}>
        {levels.map((level) => {
          const canAccess = canAccessLevel(level, viewer)
          const lockedReason = getLockedReason(level, viewer)
          const completed = loaded ? getLevelCompletedCount(level) : 0
          const total = level.lessonIds.length

          return (
            <div
              key={level.id}
              className={`${styles.levelCard} ${!canAccess ? styles.locked : ''}`}
              onClick={() => handleLevelClick(level)}>
              <CourseLevelCover
                levelOrder={level.order}
                title={level.title}
                emoji={level.emoji}
                className={styles.levelMedia}
                imageClassName={styles.levelCoverImage}
                fallbackClassName={styles.levelMedia}
                overlayClassName={styles.levelCoverOverlay}
              />
              <div className={styles.levelInfo}>
                <div className={styles.levelMeta}>
                  <span className={styles.levelOrder}>
                    {t('chapterLabel', {index: level.order})}
                  </span>
                  {completed === total && total > 0 && (
                    <span className={styles.levelBadge}>{t('completed')}</span>
                  )}
                  {!canAccess && lockedReason === 'registered' && (
                    <span className={styles.levelBadgeLocked}>{t('lockedRegister')}</span>
                  )}
                  {!canAccess && lockedReason === 'premium' && (
                    <span className={styles.levelBadgeLocked}>{t('lockedPremium')}</span>
                  )}
                </div>
                <h2 className={styles.levelTitle}>{level.title}</h2>
                <p className={styles.levelDesc}>{level.description}</p>
                <div className={styles.progressRow}>
                  <span className={styles.progressLabel}>{t('lessons')}</span>
                  <div className={styles.progressDots}>
                    {level.lessonIds.map((lessonId, index) => {
                      const status = loaded ? getLessonStatus(level, index) : 'unlocked'
                      const lp = loaded ? getLessonProgress(level.id, lessonId) : null
                      const isCompleted = status === 'completed'
                      const hasPassed =
                        isCompleted && lp?.maxScore > 0
                          ? lp.score / lp.maxScore >= PASS_THRESHOLD
                          : isCompleted
                            ? true
                            : null
                      const needsReview = hasPassed === false

                      return (
                        <span
                          key={`${level.id}-dot-${index}`}
                          className={`${
                            needsReview
                              ? styles.progressDotReview
                              : hasPassed === true
                                ? styles.progressDotDone
                                : styles.progressDot
                          }`}
                        />
                      )
                    })}
                    <span className={styles.progressLabel}>
                      {completed}/{total}
                    </span>
                  </div>
                </div>
              </div>
              <div className={styles.cardArrowRail} aria-hidden="true">
                <Icon name="forward" size={24} className={styles.cardArrowIcon} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
