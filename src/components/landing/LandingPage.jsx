import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getLocaleText} from '@/lib/i18n/getLocaleText'
import {getPublicRankingsSnapshot} from '@/lib/publicRankings'
import {listPublicPartners} from '@/lib/partners'
import LandingNav from './LandingNav'
import LandingHero from './LandingHero'
import LandingFeatures from './LandingFeatures'
import LandingForWineShops from './LandingForWineShops'
import LandingWineBox from './LandingWineBox'
import LandingPartnersMap from './LandingPartnersMap'
import LandingCTA from './LandingCTA'
import LandingFAQ from './LandingFAQ'
import LandingFooter from './LandingFooter'
import CommunityHighlightsCard from '@/components/community/CommunityHighlightsCard'
import GlobalStatsStrip from '@/components/stats/GlobalStatsStrip'
import JsonLd from '@/components/JsonLd'
import {buildLandingStructuredData} from '@/lib/seo'
import styles from './LandingPage.module.scss'

export default async function LandingPage({includeStructuredData = true}) {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const text = getLocaleText(lang, 'landing', {})
  const communityWidgetText = getLocaleText(lang, 'communityWidget', {})
  const [partners, rankingsSnapshot] = await Promise.all([
    listPublicPartners(supabase, lang),
    getPublicRankingsSnapshot(supabase),
  ])
  const globalStatsSnapshot = rankingsSnapshot.globalStats
  const faqItems = text.faq?.items || []
  const structuredData = includeStructuredData
    ? buildLandingStructuredData({lang, faqItems})
    : null

  return (
    <>
      {structuredData ? <JsonLd data={structuredData} /> : null}
      <main className={styles.landingPage}>
        <LandingNav text={text.nav || {}} />
        <LandingHero text={text.hero || {}} />
        <LandingCTA
          text={text.demoPromo || {}}
          primaryHref="/demo"
          secondaryHref="#come-funziona"
          variant="demo"
          sectionId="demo"
        />
        <LandingFeatures text={text.features || {}} />
        <LandingForWineShops text={text.audiences || {}} />
        <LandingWineBox text={text.wineBox || {}} />
        {!globalStatsSnapshot?.isInitialData && globalStatsSnapshot?.items?.length ? (
          <section className={styles.section}>
            <GlobalStatsStrip
              statsSnapshot={globalStatsSnapshot}
              text={text.globalStats || {}}
            />
          </section>
        ) : null}
        {rankingsSnapshot.hasRankingData ? (
          <section className={styles.section}>
            <CommunityHighlightsCard
              snapshot={rankingsSnapshot}
              text={communityWidgetText}
              disableTransition
            />
          </section>
        ) : null}
        <LandingFAQ text={text.faq || {}} />
        <LandingPartnersMap text={text.partners || {}} partners={partners} />
        <LandingCTA text={text.cta || {}} />
        <LandingFooter text={text.footer || {}} />
      </main>
    </>
  )
}
