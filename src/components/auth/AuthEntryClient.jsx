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
            <a href="/auth" className="btn primary">
              {t('loginOrRegister')}
            </a>
            <a href="/corso-vino" className="btn secondary">
              {t('wineCourse')}
            </a>
            <a href="/info" className="btn secondary">
              {t('howItWorks')}
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
