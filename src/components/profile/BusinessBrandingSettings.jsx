'use client'

import {useRef, useState} from 'react'
import {useT} from '@/lib/i18n/useT'
import styles from './BusinessBrandingSettings.module.scss'

export default function BusinessBrandingSettings({profile}) {
  const t = useT('profileSetup')
  const inputRef = useRef(null)
  const [logoUrl, setLogoUrl] = useState(String(profile?.business_logo_url || '').trim())
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  const handlePickFile = () => {
    inputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/profile/business-logo', {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Upload failed')

      setLogoUrl(payload?.logo?.url || '')
    } catch (nextError) {
      setError(nextError?.message || t('branding.error'))
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{t('branding.eyebrow')}</span>
          <h3 className={styles.title}>{t('branding.title')}</h3>
          <p className={styles.description}>{t('branding.description')}</p>
        </div>
      </div>

      <div className={styles.previewCard}>
        {logoUrl ? (
          <img src={logoUrl} alt={profile?.business_name || 'Business logo'} className={styles.logo} />
        ) : (
          <div className={styles.logoPlaceholder}>{t('branding.placeholder')}</div>
        )}
        <div className={styles.previewMeta}>
          <strong>{profile?.business_name || t('branding.activityNameFallback')}</strong>
          <span>{t('branding.usageHint')}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className="btn success btn-inline"
          onClick={handlePickFile}
          disabled={isUploading}>
          {isUploading ? t('branding.uploading') : t('branding.upload')}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className={styles.hiddenInput}
        onChange={handleFileChange}
      />

      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  )
}
