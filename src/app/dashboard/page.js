import {redirect} from 'next/navigation'
import Link from 'next/link'
import DashboardInfoFabWrapper from './DashboardInfoFabWrapper'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getAppVersion} from '@/lib/appVersion'
import {getWineCourseData} from '@/lib/wineCourseContent'
import ProgressBar from '@/components/ui/ProgressBar'
import Icon from '@/components/Icon'
import CreateGameCardLink from '@/components/CreateGameCardLink'
import ProfileSetupPanel from '@/components/profile/ProfileSetupPanel'
import {isProfileComplete} from '@/lib/profileSetup'
import it from '@/lib/i18n/locales/it.json'
import en from '@/lib/i18n/locales/en.json'
import styles from './dashboard.module.scss'

export default async function Dashboard() {
  const supabase = await createServerSupabase()
  const [lang, authResult] = await Promise.all([getServerLanguage(), supabase.auth.getUser()])
  const locale = lang === 'en' ? en : it
  const dashboardDict = locale.dashboard || it.dashboard || {}
  const {data} = authResult

  if (!data.user) {
    redirect('/auth')
  }

  const [profileResult, courseResult, completedLessonsResult, appVersion] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'username, super_admin, profile_type, experience_level, favorite_wine_types, favorite_countries, city, province, newsletter_opt_in, profile_completed_at, profile_prompt_dismissed_at',
      )
      .eq('id', data.user.id)
      .single(),
    getWineCourseData(lang).catch(() => ({levels: []})),
    supabase
      .from('wine_course_progress')
      .select('id', {count: 'exact', head: true})
      .eq('user_id', data.user.id)
      .eq('completed', true),
    getAppVersion(),
  ])

  const profile = profileResult.data
  const isSuperAdmin = profile?.super_admin === true
  const {levels} = courseResult
  const totalLessons = (levels || []).reduce(
    (sum, level) => sum + (level.lessonIds?.length || 0),
    0,
  )

  const {count: completedLessonsCount} = completedLessonsResult

  const completedLessons = completedLessonsCount || 0
  const progressPct =
    totalLessons > 0 ? Math.round(Math.min(100, (completedLessons / totalLessons) * 100)) : 0
  const hasStartedCourse = completedLessons > 0
  const showProfileSetupPanel = !isProfileComplete(profile || {})

  return (
    <main className={styles.dashboard}>
      <div className={styles.container}>
        <section className={styles.arcadeHero}>
          <img src="/logo.svg" alt="Indovinando Logo" className={styles.logo} />
          <div className={styles.welcomeTextContainer}>
            <h1>
              {dashboardDict.welcome}, {isSuperAdmin ? 'Supremo' : ''}{' '}
              {profile?.username || data.user.email}!
            </h1>
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
                  {dashboardDict.completedLessonsLabel
                    .replace('{completed}', String(completedLessons))
                    .replace('{total}', String(totalLessons))}
                </span>
                <span className={styles.courseProgressPercent}>{progressPct}%</span>
              </div>
            </div>
            <div className={styles.sectionCardArrowRail} aria-hidden="true">
              <span className={`btn icon-circle ${styles.sectionCardArrowBtn}`}>
                <Icon name="forward" size={22} className={styles.sectionCardArrowIcon} />
              </span>
            </div>
            <img
              src="/img-card-course.svg"
              alt=""
              aria-hidden="true"
              className="card-illustration-absolute"
            />
          </Link>

          {isSuperAdmin && (
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
          )}
        </nav>
      </div>

      {/* Pulsante informazioni client-side */}
      <DashboardInfoFabWrapper
        changelogLabel={dashboardDict.changelog}
        copyrightLabel={dashboardDict.copyright}
        dashboardDict={dashboardDict}
        appVersion={appVersion}
      />
    </main>
  )
}
