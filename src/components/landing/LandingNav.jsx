import Link from 'next/link'
import styles from './LandingPage.module.scss'

export default function LandingNav({text = {}}) {
  return (
    <header className={styles.navWrap}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.navBrand}>
          <img src="/logo.svg" alt="Indovinando" className={styles.navLogo} />
        </Link>

        <nav className={styles.navLinks} aria-label={text.ariaLabel || 'Menu'}>
          <a href="#come-funziona" className={styles.navLink}>
            {text.howItWorks || 'Come funziona'}
          </a>
          <Link href="/partner" className={styles.navLink}>
            {text.partners || 'Partner'}
          </Link>
          <Link href="/auth" className={styles.navLink}>
            {text.login || 'Accedi'}
          </Link>
        </nav>
      </div>
    </header>
  )
}
