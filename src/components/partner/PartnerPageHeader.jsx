import LandingNav from '@/components/landing/LandingNav'
import TopBarBack from '@/components/TopBarBack'

export default function PartnerPageHeader({isLoggedIn, title, backHref, navText}) {
  if (isLoggedIn) {
    return <TopBarBack title={title} href={backHref} />
  }

  return <LandingNav text={navText} />
}
