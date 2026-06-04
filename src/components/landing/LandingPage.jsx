import LandingHero from './LandingHero'
import LandingFeatures from './LandingFeatures'
import LandingForWineShops from './LandingForWineShops'
import LandingWineBox from './LandingWineBox'
import LandingPartnersMap from './LandingPartnersMap'
import LandingCTA from './LandingCTA'
import styles from './LandingPage.module.scss'

export default function LandingPage() {
  return (
    <main className={styles.landingPage}>
      <LandingHero />
      <LandingFeatures />
      <LandingForWineShops />
      <LandingWineBox />
      <LandingPartnersMap />
      <LandingCTA />
    </main>
  )
}
