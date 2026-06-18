import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getLocaleText} from '@/lib/i18n/getLocaleText'
import {getPublicGlobalStatsSnapshot, getPublicRankingsSnapshot} from '@/lib/publicRankings'
import {listPublicPartners} from '@/lib/partners'
import LandingNav from './LandingNav'
import LandingHero from './LandingHero'
import LandingFeatures from './LandingFeatures'
import LandingForWineShops from './LandingForWineShops'
import LandingWineBox from './LandingWineBox'
import LandingPartnersMap from './LandingPartnersMap'
import LandingCTA from './LandingCTA'
import LandingFAQ from './LandingFAQ'
import CommunityHighlightsCard from '@/components/community/CommunityHighlightsCard'
import GlobalStatsStrip from '@/components/stats/GlobalStatsStrip'
import styles from './LandingPage.module.scss'

export default async function LandingPage() {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const text = getLocaleText(lang, 'landing', {})
  const communityWidgetText = getLocaleText(lang, 'communityWidget', {})
  const [partners, rankingsSnapshot, globalStatsSnapshot] = await Promise.all([
    listPublicPartners(supabase, lang),
    getPublicRankingsSnapshot(supabase),
    getPublicGlobalStatsSnapshot(supabase),
  ])

  return (
    <main className={styles.landingPage}>
      <LandingNav text={text.nav || {}} />
      <LandingHero text={text.hero || {}} />
      <LandingFeatures text={text.features || {}} />
      <LandingForWineShops text={text.audiences || {}} />
      <LandingWineBox />
      <section className={styles.section}>
        <GlobalStatsStrip
          statsSnapshot={globalStatsSnapshot}
          text={text.globalStats || {}}
        />
      </section>
      <section className={styles.section}>
        <CommunityHighlightsCard
          snapshot={rankingsSnapshot}
          text={communityWidgetText}
          disableTransition
        />
      </section>
      <LandingFAQ text={text.faq || {}} />
      <LandingPartnersMap text={text.partners || {}} partners={partners} />
      <LandingCTA text={text.cta || {}} />
    </main>
  )
}
