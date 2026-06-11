import Link from 'next/link'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getPublicRankingsSnapshot} from '@/lib/publicRankings'
import LandingNav from '@/components/landing/LandingNav'
import GlobalStatsStrip from '@/components/stats/GlobalStatsStrip'
import RankingsSectionsClient from '@/components/rankings/RankingsSectionsClient'
import TopBarBack from '@/components/TopBarBack'
import Icon from '@/components/Icon'
import it from '@/lib/i18n/locales/it.json'
import en from '@/lib/i18n/locales/en.json'
import styles from './rankings.module.scss'

export const metadata = {
  title: 'Classifiche',
}

export default async function RankingsPage({searchParams}) {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const locale = lang === 'en' ? en : it
  const text = locale.rankingsPage || it.rankingsPage
  const landingText = locale.landing || it.landing || {}
  const commonText = locale.common || it.common || {}
  const {
    data: {user},
  } = await supabase.auth.getUser()
  const snapshot = await getPublicRankingsSnapshot(supabase)
  const resolvedSearchParams = await searchParams
  const requestedBackHref =
    typeof resolvedSearchParams?.back === 'string' ? resolvedSearchParams.back : null
  const safeBackHref =
    requestedBackHref && requestedBackHref.startsWith('/') && !requestedBackHref.startsWith('//')
      ? requestedBackHref
      : '/dashboard'

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {user ? (
          <TopBarBack title={text.title} href={safeBackHref} />
        ) : (
          <>
            <LandingNav text={landingText.nav || {}} />
            <div className={styles.landingBackRow}>
              <Link href="/" className={styles.landingBackLink}>
                <Icon src="/icons/back-icon.svg" size={18} className={styles.landingBackIcon} />
                <span>{commonText.back || 'Indietro'}</span>
              </Link>
            </div>
          </>
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

        {snapshot.userSection?.items?.length ? (
          <section className={styles.userSectionCard}>
            <div className={styles.userSectionHeader}>
              <div>
                <span className={styles.eyebrow}>{text.userSection?.eyebrow || 'Players'}</span>
                <h2 className={styles.userSectionTitle}>
                  {text.userSection?.title || 'Most precise users'}
                </h2>
                <p className={styles.userSectionDescription}>
                  {text.userSection?.description ||
                    'Registered users ranked by correctness on objective questions.'}
                </p>
              </div>
            </div>

            <div className={styles.userRankingList}>
              {snapshot.userSection.items.map((item, index) => (
                <article key={item.id} className={styles.userRankingItem}>
                  <div className={styles.userRankIndex}>{index + 1}</div>
                  <div className={styles.userRankingContent}>
                    <h3>{item.name}</h3>
                    <p className={styles.userRankingMeta}>
                      {(text.userSection?.accuracyLabel || 'Precision') +
                        ` ${Math.round(Number(item.accuracyRatio || 0) * 100)}%`}
                    </p>
                    <p className={styles.userRankingSubMeta}>
                      {(text.userSection?.sessionsLabel || 'Sessions') +
                        ` ${item.sessionCount || 0} · ` +
                        (text.userSection?.answersLabel || 'Answers') +
                        ` ${item.objectiveAnswerCount || 0}`}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            {text.userSection?.note ? (
              <div className={styles.heroNote}>{text.userSection.note}</div>
            ) : null}
          </section>
        ) : null}

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
