'use client'

import {useT} from '@/lib/i18n/useT'
import styles from './AuthEntryClient.module.scss'

export default function AuthEntryClient() {
  const t = useT('home')

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.shell}>
          <div className={styles.brandBlock}>
            <h1 className={styles.brand}>INDOVINANDO</h1>
            <p className={styles.tagline}>{t('tagline')}</p>
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
    </main>
  )
}
