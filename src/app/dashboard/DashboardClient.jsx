'use client'

import Image from 'next/image'
import Link from 'next/link'
import DashboardInfoFabWrapper from './DashboardInfoFabWrapper'
import ProgressBar from '@/components/ui/ProgressBar'
import {SkeletonBone} from '@/components/ui/Skeleton'
import Icon from '@/components/Icon'
import CreateGameCardLink from '@/components/CreateGameCardLink'
import ProfileSetupPanel from '@/components/profile/ProfileSetupPanel'
import {useAppData} from '@/components/AppDataContext'
import {isProfileComplete} from '@/lib/profileSetup'
import styles from './dashboard.module.scss'

function getWelcomeTitle({dashboardDict, profile, userEmail}) {
  const isSuperAdmin = profile?.super_admin === true
  const normalizedUsername = String(profile?.username || '').trim().toLowerCase()
  const normalizedEmail = String(userEmail || '').trim().toLowerCase()
  const isPapaWelcome =
    normalizedUsername === 'cesare' || normalizedEmail === 'cesare.degennaro@gmail.com'
  const welcomeName = isPapaWelcome ? 'papà' : profile?.username || userEmail

  return isPapaWelcome
    ? `${dashboardDict.welcome} ${isSuperAdmin ? 'Supremo ' : ''}${welcomeName}!`
    : `${dashboardDict.welcome}, ${isSuperAdmin ? 'Supremo ' : ''}${welcomeName}!`
}

export default function DashboardClient({dashboardDict, lang, userEmail}) {
  const {profile, courseProgress, appVersion} = useAppData()
  const isSuperAdmin = profile?.super_admin === true
  const showProfileSetupPanel =
    Boolean(profile) &&
    !isProfileComplete(profile || {}) &&
    !profile?.profile_prompt_dismissed_at
  const courseIsLoading = !courseProgress
  const completedLessons = courseProgress?.completedLessons || 0
  const totalLessons = courseProgress?.totalLessons || 0
  const progressPct = courseProgress?.progressPct || 0
  const hasStartedCourse = courseProgress?.hasStartedCourse || false
  const welcomeTitle = getWelcomeTitle({dashboardDict, profile, userEmail})

  return (
    <main className={styles.dashboard}>
      <div className={styles.container}>
        <section className={styles.arcadeHero}>
          <div className={styles.welcomeTextContainer}>
            <h1>{welcomeTitle}</h1>
            <h3 className={styles.subtitle}>{dashboardDict.subtitle}</h3>
          </div>
        </section>

        {showProfileSetupPanel && <ProfileSetupPanel profile={profile || {}} mode="dashboard" />}
        <nav className={styles.menuGrid}>
          <CreateGameCardLink
            title={dashboardDict.createGameCardTitle}
            description={dashboardDict.createGameCardDescription}
            action={dashboardDict.createGameCardAction}
          />

          <Link
            href="/demo"
            className={`${styles.sectionCard} ${styles.sectionCardSecondary} ${styles.sectionCardBottomArrow}`}>
            <div className={styles.sectionCardInfo}>
              <span className={styles.sectionCardEyebrow}>
                {dashboardDict.demoEyebrow || 'Gioca subito'}
              </span>
              <h3>{dashboardDict.demoTitle || 'Prova la demo'}</h3>
              <p>
                {dashboardDict.demoDescription ||
                  'Scopri come funziona una degustazione alla cieca con una partita guidata.'}
              </p>
            </div>
            <div className={styles.sectionCardArrowRail} aria-hidden="true">
              <span className={`btn icon-circle ${styles.sectionCardArrowBtn}`}>
                <Icon name="forward" size={22} className={styles.sectionCardArrowIcon} />
              </span>
            </div>
          </Link>

          <Link
            href="/corso-vino"
            className={`${styles.sectionCard} ${styles.sectionCardFifteenthary} ${styles.sectionCardBottomArrow}`}>
            <div className={styles.sectionCardInfo}>
              <span className={styles.sectionCardEyebrow}>{dashboardDict.yourProgress}</span>
              <h3>{dashboardDict.wineCourse}</h3>
              <p>
                {hasStartedCourse
                  ? dashboardDict.courseStartedDescription
                  : dashboardDict.courseNotStartedDescription}
              </p>
              <ProgressBar
                value={progressPct}
                variant="course"
                className={styles.courseProgressBar}
                ariaLabel={dashboardDict.yourProgress}
              />
              <div className={styles.courseProgressMeta}>
                <span className={styles.courseProgressLessons}>
                  {courseIsLoading ? (
                    <SkeletonBone className={styles.courseProgressSkeleton} />
                  ) : (
                    dashboardDict.completedLessonsLabel
                      .replace('{completed}', String(completedLessons))
                      .replace('{total}', String(totalLessons))
                  )}
                </span>
                <span className={styles.courseProgressPercent}>
                  {courseIsLoading ? '…' : `${progressPct}%`}
                </span>
              </div>
            </div>
            <div className={styles.sectionCardArrowRail} aria-hidden="true">
              <span className={`btn icon-circle ${styles.sectionCardArrowBtn}`}>
                <Icon name="forward" size={22} className={styles.sectionCardArrowIcon} />
              </span>
            </div>
            <Image
              src="/img-card-course.svg"
              alt=""
              aria-hidden="true"
              className="card-illustration-absolute"
              width={220}
              height={220}
            />
          </Link>

          <Link
            href="/classifiche"
            className={`${styles.sectionCard} ${styles.sectionCardTertiary} ${styles.sectionCardBottomArrow}`}>
            <div className={styles.sectionCardInfo}>
              <span className={styles.sectionCardEyebrow}>
                {dashboardDict.communityEyebrow || 'Community'}
              </span>
              <h3>{dashboardDict.rankingsTitle || 'Classifiche pubbliche'}</h3>
              <p>
                {dashboardDict.rankingsDescription ||
                  'Scopri i vini più votati, sorprendenti e divisivi della community.'}
              </p>
            </div>
            <div className={styles.sectionCardArrowRail} aria-hidden="true">
              <span className={`btn icon-circle ${styles.sectionCardArrowBtn}`}>
                <Icon name="forward" size={22} className={styles.sectionCardArrowIcon} />
              </span>
            </div>
          </Link>

          {isSuperAdmin && (
            <>
              <Link
                href="/landingpage"
                className={`${styles.sectionCard} ${styles.sectionCardPrimary} ${styles.sectionCardBottomArrow}`}>
                <div className={styles.sectionCardInfo}>
                  <h3>{dashboardDict.landingPreviewTitle || 'Landing page'}</h3>
                  <p>
                    {dashboardDict.landingPreviewDescription ||
                      (lang === 'en'
                        ? 'Preview the public landing while signed in.'
                        : 'Vedi la landing pubblica anche da loggato.')}
                  </p>
                </div>
                <div className={styles.sectionCardArrowRail} aria-hidden="true">
                  <span className={`btn icon-circle ${styles.sectionCardArrowBtn}`}>
                    <Icon name="forward" size={22} className={styles.sectionCardArrowIcon} />
                  </span>
                </div>
              </Link>

              <Link
                href="/admin"
                className={`${styles.sectionCard} ${styles.sectionCardNeutral} ${styles.sectionCardBottomArrow}`}>
                <div className={styles.sectionCardInfo}>
                  <h3>{dashboardDict.admin || 'Admin'}</h3>
                  <p>
                    {lang === 'en'
                      ? 'Catalog and course management tools.'
                      : 'Strumenti gestione catalogo e corsi.'}
                  </p>
                </div>
                <div className={styles.sectionCardArrowRail} aria-hidden="true">
                  <span className={`btn icon-circle ${styles.sectionCardArrowBtn}`}>
                    <Icon name="forward" size={22} className={styles.sectionCardArrowIcon} />
                  </span>
                </div>
              </Link>
            </>
          )}
        </nav>
      </div>

      <DashboardInfoFabWrapper
        changelogLabel={dashboardDict.changelog}
        copyrightLabel={dashboardDict.copyright}
        dashboardDict={dashboardDict}
        appVersion={appVersion}
      />
    </main>
  )
}
