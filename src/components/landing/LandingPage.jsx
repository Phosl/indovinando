import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getLocaleText} from '@/lib/i18n/getLocaleText'
import {listPublicPartners} from '@/lib/partners'
import LandingNav from './LandingNav'
import LandingHero from './LandingHero'
import LandingFeatures from './LandingFeatures'
import LandingForWineShops from './LandingForWineShops'
import LandingWineBox from './LandingWineBox'
import LandingPartnersMap from './LandingPartnersMap'
import LandingCTA from './LandingCTA'
import styles from './LandingPage.module.scss'

export default async function LandingPage() {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const text = getLocaleText(lang, 'landing', {})
  const partners = await listPublicPartners(supabase, lang)

  return (
    <main className={styles.landingPage}>
      <LandingNav text={text.nav || {}} />
      <LandingHero text={text.hero || {}} />
      <LandingFeatures text={text.features || {}} />
      <LandingForWineShops text={text.audiences || {}} />
      <LandingWineBox />
      <LandingPartnersMap text={text.partners || {}} partners={partners} />
      <LandingCTA text={text.cta || {}} />
    </main>
  )
}
