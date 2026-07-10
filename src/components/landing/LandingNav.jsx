'use client'

import Link from 'next/link'
import Image from 'next/image'
import {useEffect, useMemo, useRef, useState} from 'react'
import {usePathname} from 'next/navigation'
import styles from './LandingPage.module.scss'

export default function LandingNav({text = {}}) {
  const pathname = usePathname()
  const [currentHash, setCurrentHash] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [navHeight, setNavHeight] = useState(92)
  const navWrapRef = useRef(null)

  useEffect(() => {
    const syncHash = () => setCurrentHash(window.location.hash || '')

    syncHash()
    window.addEventListener('hashchange', syncHash)

    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    const updateNavHeight = () => {
      const nextHeight = navWrapRef.current?.getBoundingClientRect?.().height
      if (nextHeight) setNavHeight(Math.ceil(nextHeight))
    }

    updateNavHeight()
    window.addEventListener('resize', updateNavHeight)

    return () => window.removeEventListener('resize', updateNavHeight)
  }, [])

  const howItWorksHref = useMemo(
    () => (pathname === '/' ? '#come-funziona' : '/#come-funziona'),
    [pathname],
  )

  const howItWorksActive = pathname === '/' && currentHash === '#come-funziona'
  const partnersActive = pathname === '/partner' || pathname.startsWith('/partner/')
  const rankingsActive = pathname === '/classifiche'
  const demoActive = pathname === '/demo'
  const loginActive = pathname === '/auth'

  const navLinkClassName = (isActive) =>
    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink

  const closeMenu = () => setMenuOpen(false)
  const openMenu = () => setMenuOpen(true)

  return (
    <>
      <header ref={navWrapRef} className={styles.navWrap}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navBrand}>
            <Image
              src="/logo-header.svg"
              alt="Indovinando"
              className={styles.navLogo}
              width={520}
              height={153}
              priority
            />
          </Link>

          <button
            type="button"
            className={styles.navBurger}
            onClick={openMenu}
            aria-label={text.ariaLabel || 'Apri menu'}>
            <span className={styles.navBurgerLine} />
            <span className={styles.navBurgerLine} />
            <span className={styles.navBurgerLine} />
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div className={styles.menuOverlay}>
          <div className={styles.menuPanel}>
            <div className={styles.menuHeader}>
              <Link href="/" className={styles.navBrand} onClick={closeMenu}>
                <Image
                  src="/logo-header.svg"
                  alt="Indovinando"
                  className={styles.navLogo}
                  width={520}
                  height={153}
                />
              </Link>

              <button
                type="button"
                className={styles.menuClose}
                onClick={closeMenu}
                aria-label={text.closeLabel || 'Chiudi menu'}>
                <span className={styles.menuCloseGlyph}>×</span>
              </button>
            </div>

            <nav className={styles.menuLinks} aria-label={text.ariaLabel || 'Menu'}>
              <a
                href={howItWorksHref}
                className={navLinkClassName(howItWorksActive)}
                onClick={closeMenu}>
                {text.howItWorks || 'Come funziona'}
              </a>
              <Link href="/demo" className={navLinkClassName(demoActive)} onClick={closeMenu}>
                {text.demo || 'Demo'}
              </Link>
              <Link
                href="/partner"
                className={navLinkClassName(partnersActive)}
                onClick={closeMenu}>
                {text.partners || 'Partner'}
              </Link>
              <Link
                href="/classifiche"
                className={navLinkClassName(rankingsActive)}
                onClick={closeMenu}>
                {text.rankings || 'Classifiche'}
              </Link>
              <Link href="/auth" className={navLinkClassName(loginActive)} onClick={closeMenu}>
                {text.login || 'Accedi'}
              </Link>
            </nav>
          </div>
        </div>
      ) : null}

      <div className={styles.navSpacer} style={{height: navHeight}} aria-hidden="true" />
    </>
  )
}
