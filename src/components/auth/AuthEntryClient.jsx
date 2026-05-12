'use client'

import {useT} from '@/lib/i18n/useT'
import styles from './AuthEntryClient.module.scss'

export default function AuthEntryClient({appVersion}) {
  const t = useT('home')

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
      <div className={styles.badge}>
        {t('versionLabel')} {appVersion}
      </div>
    </main>
  )
}
