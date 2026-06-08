import Link from 'next/link'
import LandingNav from '@/components/landing/LandingNav'
import TopBarBack from '@/components/TopBarBack'
import Icon from '@/components/Icon'
import styles from '@/app/partner/partner.module.scss'

export default function PartnerPageHeader({
  isLoggedIn,
  title,
  backHref,
  navText,
  landingBackHref = '',
  landingBackLabel = '',
}) {
  if (isLoggedIn) {
    return <TopBarBack title={title} href={backHref} />
  }

  return (
    <>
      <LandingNav text={navText} />
      {landingBackHref ? (
        <div className={styles.landingBackRow}>
          <Link href={landingBackHref} className={styles.landingBackLink}>
            <Icon src="/icons/back-icon.svg" size={18} className={styles.landingBackIcon} />
            <span>{landingBackLabel || 'Indietro'}</span>
          </Link>
        </div>
      ) : null}
    </>
  )
}
