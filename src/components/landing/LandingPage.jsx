import {getServerLanguage} from '@/lib/i18n/server'
import {getLocaleText} from '@/lib/i18n/getLocaleText'
import LandingHero from './LandingHero'
import LandingFeatures from './LandingFeatures'
import LandingForWineShops from './LandingForWineShops'
import LandingWineBox from './LandingWineBox'
import LandingPartnersMap from './LandingPartnersMap'
import LandingCTA from './LandingCTA'
import styles from './LandingPage.module.scss'

export default async function LandingPage() {
  const lang = await getServerLanguage()
  const text = getLocaleText(lang, 'landing', {})

  return (
    <main className={styles.landingPage}>
      <LandingHero text={text.hero || {}} />
      <LandingFeatures text={text.features || {}} />
      <LandingForWineShops text={text.audiences || {}} />
      <LandingWineBox />
      <LandingPartnersMap text={text.partners || {}} />
      <LandingCTA text={text.cta || {}} />
    </main>
  )
}
