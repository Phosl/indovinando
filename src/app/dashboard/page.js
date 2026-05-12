import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getAppVersion} from '@/lib/appVersion'
import it from '@/lib/i18n/locales/it.json'
import en from '@/lib/i18n/locales/en.json'
import styles from './dashboard.module.scss'

export default async function Dashboard() {
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
          <h4>
            {dashboardDict.versionLabel || 'Versione BETA'} {appVersion}
          </h4>
          <p>
            {dashboardDict.welcome || 'Benvenuto'}, {profile?.username || data.user.email}!
          </p>
        </section>

        <nav className={styles.menuGrid}>
          <a href="/game/create" className={`${styles.menuCard} ${styles.menuCardPrimary}`}>
            <span className={styles.menuCardEmoji}></span>
            <span className={styles.menuCardLabel}>{dashboardDict.createGame || 'Crea gioco'}</span>
          </a>

          <a href="/miei-giochi" className={styles.menuCard}>
            <span className={styles.menuCardEmoji}></span>
            <span className={styles.menuCardLabel}>{dashboardDict.myGames || 'I miei giochi'}</span>
          </a>

          <a href="/corso-vino" className={`${styles.menuCard} ${styles.menuCardWine}`}>
            <span className={styles.menuCardEmoji}></span>
            <span className={styles.menuCardLabel}>{dashboardDict.wineCourse || 'Corso Vino'}</span>
          </a>

          <a href="/profilo" className={styles.menuCard}>
            <span className={styles.menuCardEmoji}>
              {isImgAvatar ? (
                <img
                  src={avatar.startsWith('/') ? avatar : `/${avatar}`}
                  alt=""
                  style={{
                    width: '2rem',
                    height: '2rem',
                    objectFit: 'contain',
                    verticalAlign: 'middle',
                  }}
                />
              ) : (
                avatar
              )}
            </span>
            <span className={styles.menuCardLabel}>{dashboardDict.profile || 'Profilo'}</span>
          </a>
        </nav>
      </div>
    </main>
  )
}
