'use client'

import Link from 'next/link'
import {useMemo, useState} from 'react'
import {buildPartnerSlug} from '@/lib/partners'
import {useT} from '@/lib/i18n/useT'
import styles from './PartnerPublicSettings.module.scss'

export default function PartnerPublicSettings({profile, mode = 'panel'}) {
  const t = useT('profileSetup')
  const [isPublic, setIsPublic] = useState(profile?.is_partner_public === true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const partnerSlug = useMemo(() => buildPartnerSlug(profile || {}), [profile])
  const previewHref = `/partner/${partnerSlug}?preview=1`

  const handleToggle = async () => {
    setError('')
    setIsSaving(true)

    const nextValue = !isPublic
    try {
      const response = await fetch('/api/profile/setup', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          is_partner_public: nextValue,
          partner_slug: partnerSlug,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Unable to update public profile')
      setIsPublic(nextValue)
    } catch (nextError) {
      setError(nextError?.message || t('partnerPublic.error'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className={`${styles.card} ${mode === 'page' ? styles.cardPage : ''}`}>
      <div className={styles.header}>
        <div>
          {mode === 'page' ? <span className={styles.eyebrow}>{t('partnerPublic.eyebrow')}</span> : null}
          <h3 className={styles.title}>{t('partnerPublic.title')}</h3>
          <p className={styles.description}>{t('partnerPublic.description')}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-label={t('partnerPublic.toggleLabel')}
          className={`${styles.toggleBtn} ${isPublic ? styles.toggleBtnActive : ''}`}
          onClick={handleToggle}
          disabled={isSaving}>
          <span className={styles.toggleLabels}>
            <span className={`${styles.toggleLabel} ${isPublic ? styles.toggleLabelActive : ''}`}>
              {t('partnerPublic.active')}
            </span>
            <span className={`${styles.toggleLabel} ${!isPublic ? styles.toggleLabelActive : ''}`}>
              {t('partnerPublic.inactive')}
            </span>
          </span>
          <span className={styles.toggleTrack} aria-hidden="true">
            <span className={styles.toggleThumb} />
          </span>
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>{t('partnerPublic.slugLabel')}</span>
          <strong className={styles.metaValue}>/partner/{partnerSlug}</strong>
        </div>

        <p className={styles.helper}>{t('partnerPublic.helper')}</p>

        <div className={styles.actions}>
          <Link href={previewHref} className="btn primary btn-small btn-inline">
            {t('partnerPublic.preview')}
          </Link>
          <Link href="/partner" className="btn tertiary btn-small btn-inline">
            {t('partnerPublic.directory')}
          </Link>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  )
}
