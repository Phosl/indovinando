import {redirect} from 'next/navigation'
import Link from 'next/link'
import DashboardInfoFabWrapper from './DashboardInfoFabWrapper'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getAppVersion} from '@/lib/appVersion'
import it from '@/lib/i18n/locales/it.json'
import en from '@/lib/i18n/locales/en.json'
import styles from './dashboard.module.scss'

export default async function Dashboard() {
  // Server-side data
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const locale = lang === 'en' ? en : it
  const dashboardDict = locale.dashboard || it.dashboard || {}
  const appVersion = await getAppVersion()
  const {data} = await supabase.auth.getUser()

  if (!data.user) {
    redirect('/auth')
  }

  const {data: profile} = await supabase
    .from('profiles')
    .select('username, super_admin, avatar_emoji')
    .eq('id', data.user.id)
    .single()

  const avatar = profile?.avatar_emoji || '👤'
  const isImgAvatar = typeof avatar === 'string' && avatar.includes('.svg')

  return (
    <main className={styles.dashboard}>
      <div className={styles.container}>
        <section className={styles.arcadeHero}>
          <img src="/logo.svg" alt="Indovinando Logo" className={styles.logo} />
          <div className={styles.welcomeTextContainer}>
            <h1>
              {dashboardDict.welcome || 'Benvenuto'}, {profile?.username || data.user.email}!
            </h1>
          </div>
        </section>

        <nav className={styles.menuGrid}>
          <Link href="/game/create" className={styles.createGameLink}>
            <div className={styles.createGameCard}>
              <div className={styles.createGameContent}>
                <h2>Crea una nuova degustazione</h2>
                <p>Inizia a creare la tua nuova degustazione e condividila con i tuoi amici.</p>
              </div>
              <div className={styles.createGameContainer}>
                <div className={styles.createGameBtn}>
                  <span>Iniziamo</span>
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

          <Link href="/miei-giochi" className="btn primary">
            <span className={styles.menuCardLabel}>{dashboardDict.myGames || 'I miei giochi'}</span>
          </Link>

          <Link href="/corso-vino" className="btn tertiary">
            <span className={styles.menuCardLabel}>{dashboardDict.wineCourse || 'Corso Vino'}</span>
          </Link>

          <Link href="/profilo" className="btn secondary">
            <span className={styles.menuCardLabel}>{dashboardDict.profile || 'Profilo'}</span>
          </Link>
        </nav>
      </div>

      {/* Pulsante informazioni client-side */}
      <DashboardInfoFabWrapper
        changelogLabel={dashboardDict.changelog || 'Changelog'}
        copyrightLabel={dashboardDict.copyright || 'Copyright'}
        dashboardDict={dashboardDict}
        appVersion={appVersion}
      />
    </main>
  )
}
