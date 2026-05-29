import {redirect} from 'next/navigation'
import Link from 'next/link'
import DashboardInfoFabWrapper from './DashboardInfoFabWrapper'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getAppVersion} from '@/lib/appVersion'
import {getWineCourseData} from '@/lib/wineCourseContent'
import ProgressBar from '@/components/ui/ProgressBar'
import Icon from '@/components/Icon'
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
    supabase.from('profiles').select('username, super_admin').eq('id', data.user.id).single(),
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

  return (
    <main className={styles.dashboard}>
      <div className={styles.container}>
        <section className={styles.arcadeHero}>
          <img src="/logo.svg" alt="Indovinando Logo" className={styles.logo} />
          <div className={styles.welcomeTextContainer}>
            <h1>
              {dashboardDict.welcome}, {profile?.username || data.user.email}!
            </h1>
          </div>
        </section>

        <nav className={styles.menuGrid}>
          <Link href="/game/create" className={styles.createGameLink}>
            <div className={styles.createGameCard}>
              <div className={styles.createGameContent}>
                <h2>{dashboardDict.createGameCardTitle}</h2>
                <p>{dashboardDict.createGameCardDescription}</p>
              </div>
              <div className={styles.createGameContainer}>
                <div className={styles.createGameBtn}>
                  <span>{dashboardDict.createGameCardAction}</span>
                  <img
                    src="/icons/forward-icon.svg"
                    alt=""
                    aria-hidden="true"
                    className={styles.createGameBtnIcon}
                  />
                </div>
              </div>
              <img
                src="/img-card-create.svg"
                alt=""
                aria-hidden="true"
                className={styles.createGameIllustration}
              />
            </div>
          </Link>

          <Link
            href="/miei-giochi"
            className={`${styles.sectionCard} ${styles.sectionCardPrimary} ${styles.sectionCardBottomArrow}`}>
            <div className={styles.sectionCardInfo}>
              <h3>{dashboardDict.myGames}</h3>
              <p>{dashboardDict.myGamesCardDescription}</p>
            </div>
            <div className={styles.sectionCardArrowRail} aria-hidden="true">
              <Icon name="forward" size={24} className={styles.sectionCardArrowIcon} />
            </div>
          </Link>

          {/* <Link
            href="/corso-vino"
            className={`${styles.sectionCard} ${styles.sectionCardTertiary} ${styles.sectionCardBottomArrow}`}>
            <div className={styles.sectionCardInfo}>
              <h3>{dashboardDict.wineCourse || 'Corso Vino'}</h3>
              <p>
                {lang === 'en'
                  ? 'Learn, discover and become a true expert.'
                  : 'Impara, scopri e diventa un esperto.'}
              </p>
            </div>
            <div className={styles.sectionCardArrowRail} aria-hidden="true">
              <Icon name="forward" size={24} className={styles.sectionCardArrowIcon} />
            </div>
          </Link> */}

          <Link
            href="/corso-vino"
            className={`${styles.sectionCard} ${styles.sectionCardTertiary} ${styles.sectionCardBottomArrow}`}>
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
              <Icon name="forward" size={24} className={styles.sectionCardArrowIcon} />
            </div>
          </Link>

          {isSuperAdmin && (
            <Link
              href="/admin"
              className={`${styles.sectionCard} ${styles.sectionCardPrimary} ${styles.sectionCardBottomArrow}`}>
              <div className={styles.sectionCardInfo}>
                <h3>{dashboardDict.admin || 'Admin'}</h3>
                <p>{lang === 'en' ? 'Catalog and course management tools.' : 'Strumenti gestione catalogo e corsi.'}</p>
              </div>
              <div className={styles.sectionCardArrowRail} aria-hidden="true">
                <Icon name="forward" size={24} className={styles.sectionCardArrowIcon} />
              </div>
            </Link>
          )}

          {/* <Link href="/miei-giochi" className="btn primary">
            <span className={styles.menuCardLabel}>{dashboardDict.myGames || 'I miei giochi'}</span>
          </Link>

          <Link href="/corso-vino" className="btn tertiary">
            <span className={styles.menuCardLabel}>{dashboardDict.wineCourse || 'Corso Vino'}</span>
          </Link>

          <Link href="/profilo" className="btn secondary">
            <span className={styles.menuCardLabel}>{dashboardDict.profile || 'Profilo'}</span>
          </Link> */}
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
