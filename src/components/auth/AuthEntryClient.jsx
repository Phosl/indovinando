'use client'

import Link from 'next/link'
import {useEffect, useState} from 'react'
import {useT} from '@/lib/i18n/useT'
import AuthInfoFab from './AuthInfoFab'
import styles from './AuthEntryClient.module.scss'

export default function AuthEntryClient({appVersion}) {
  const t = useT('home')
  const [shareHint, setShareHint] = useState('')
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null)
  const [installPlatform, setInstallPlatform] = useState('generic')
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const updateStandaloneState = () => {
      setIsStandalone(mediaQuery.matches || window.navigator.standalone === true)
    }

    const ua = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(ua)
    const isAndroidDevice = /android/.test(ua)

    setInstallPlatform(isIosDevice ? 'ios' : isAndroidDevice ? 'android' : 'generic')
    updateStandaloneState()

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredInstallPrompt(event)
    }

    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null)
      setIsStandalone(true)
      setShareHint(t('installAlready'))
      window.setTimeout(() => setShareHint(''), 2200)
    }

    mediaQuery.addEventListener?.('change', updateStandaloneState)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      mediaQuery.removeEventListener?.('change', updateStandaloneState)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [t])

  const showHint = (text, delay = 2600) => {
    setShareHint(text)
    window.setTimeout(() => setShareHint(''), delay)
  }

  const handleShare = async () => {
    if (typeof window === 'undefined') return

    if (isStandalone) {
      showHint(t('installAlready'), 2200)
      return
    }

    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt()
      const {outcome} = await deferredInstallPrompt.userChoice
      if (outcome !== 'accepted') {
        showHint(installPlatform === 'ios' ? t('installIosHint') : t('shareFallbackHint'), 3600)
      }
      setDeferredInstallPrompt(null)
      return
    }

    if (installPlatform === 'ios') {
      showHint(t('installIosHint'), 3800)
      return
    }

    const url = window.location.origin

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Indovinando',
          text: t('shareAppText'),
          url,
        })
        return
      } catch {
        // User cancelled or share unavailable in this context.
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      showHint(t('shareLinkCopied'), 2200)
    } catch {
      showHint(t('shareFallbackHint'), 3200)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.shell}>
          <div className={styles.brandBlock}>
            <img
              className={styles.logo}
              src="/logo.svg"
              alt="Indovinando Logo"
              className={styles.logo}
            />
            <div>
              <p className={styles.tagline}>{t('tagline')}</p>
            </div>
          </div>

          <div className={styles.quickActions}>
            <Link href="/auth" className="btn success">
              {t('loginOrRegister')}
            </Link>
            <Link href="/corso-vino" className="btn quaternary">
              <span className={styles.menuCardBadge}>NOVITA</span>
              {t('wineCourse')}
            </Link>
            <Link href="/info" className="btn neutral">
              {t('howItWorks')}
            </Link>
          </div>
        </section>
      </div>
      <AuthInfoFab
        changelogLabel={t('versionLabel') + ' ' + appVersion}
        copyrightLabel={t('copyrightLabel')}
      />
      {shareHint ? (
        <div className={styles.bottomSheetOverlay} onClick={() => setShareHint('')}>
          <div className={styles.bottomSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.bottomSheetHandle} />
            <p className={styles.bottomSheetText}>{shareHint}</p>
            <button
              type="button"
              className={styles.bottomSheetClose}
              onClick={() => setShareHint('')}>
              OK
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
