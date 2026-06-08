import Link from 'next/link'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getPublicRankingsSnapshot} from '@/lib/publicRankings'
import LandingNav from '@/components/landing/LandingNav'
import GlobalStatsStrip from '@/components/stats/GlobalStatsStrip'
import RankingsSectionsClient from '@/components/rankings/RankingsSectionsClient'
import TopBarBack from '@/components/TopBarBack'
import it from '@/lib/i18n/locales/it.json'
import en from '@/lib/i18n/locales/en.json'
import styles from './rankings.module.scss'

export const metadata = {
  title: 'Classifiche',
}

export default async function RankingsPage() {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const locale = lang === 'en' ? en : it
  const text = locale.rankingsPage || it.rankingsPage
  const landingText = locale.landing || it.landing || {}
  const {
    data: {user},
  } = await supabase.auth.getUser()
  const snapshot = await getPublicRankingsSnapshot(supabase)

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {user ? (
          <TopBarBack title={text.title} href="/dashboard" />
        ) : (
          <LandingNav text={landingText.nav || {}} />
        )}

        <section className={styles.hero}>
          <div className={styles.heroTopRow}>
            <span className={styles.eyebrow}>{text.eyebrow}</span>
          </div>
          <h1>{text.heading}</h1>
          <p>{text.description}</p>
          {text.realDataPills?.length ? (
            <div className={styles.heroPills}>
              {text.realDataPills.map((pill) => (
                <span key={pill} className={styles.heroPill}>
                  {pill}
                </span>
              ))}
            </div>
          ) : null}
          {text.realDataNote ? <div className={styles.heroNote}>{text.realDataNote}</div> : null}
        </section>

        <GlobalStatsStrip
          statsSnapshot={snapshot.globalStats}
          text={text.globalStats || {stats: text.stats || {}}}
        />

        <RankingsSectionsClient sections={snapshot.sections} text={text} />

        <section className={styles.ctaRow}>
          <Link href="/partner" className="btn secondary btn-inline">
            {text.explorePartners}
          </Link>
        </section>
      </div>
    </main>
  )
}
