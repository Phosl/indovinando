'use client'

import {useState} from 'react'
import {useT} from '@/lib/i18n/useT'
import styles from './AuthEntryClient.module.scss'

export default function AuthEntryClient({appVersion}) {
  const t = useT('home')
  const [shareHint, setShareHint] = useState('')

  const handleShare = async () => {
    if (typeof window === 'undefined') return
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
      setShareHint(t('shareLinkCopied'))
      window.setTimeout(() => setShareHint(''), 1800)
    } catch {
      setShareHint(t('shareFallbackHint'))
      window.setTimeout(() => setShareHint(''), 2600)
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
            <a href="/auth" className={`${styles.menuCard} ${styles.menuCardGreen}`}>
              <span className={styles.menuCardLabel}>{t('loginOrRegister')}</span>
            </a>
            <a href="/corso-vino" className={`${styles.menuCard} ${styles.menuCardWine}`}>
              <span className={styles.menuCardBadge}>NOVITA</span>
              <span className={styles.menuCardLabel}>{t('wineCourse')}</span>
            </a>
            <a href="/info" className={styles.menuCard}>
              <span className={styles.menuCardLabel}>{t('howItWorks')}</span>
            </a>
          </div>
        </section>
      </div>
      <div className={styles.legalLinks}>
        <button
          type="button"
          className={`${styles.badge} ${styles.badgeLink} ${styles.badgeButton}`}
          onClick={handleShare}>
          {t('shareApp')}
        </button>
        <a href="/changelog" className={`${styles.badge} ${styles.badgeLink}`}>
          {t('versionLabel')} {appVersion}
        </a>
        <a href="/copyright" className={`${styles.badge} ${styles.badgeLink}`}>
          {t('copyrightLabel')}
        </a>
      </div>
      {shareHint ? <p className={styles.shareHint}>{shareHint}</p> : null}
    </main>
  )
}
