'use client'

import {useCallback, useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import {useT} from '@/lib/i18n/useT'
import TopBar from '@/components/TopBar'
import Icon from '@/components/Icon'
import BusinessLocationPicker from '@/components/profile/BusinessLocationPicker'
import {
  isBusinessProfile,
  COUNTRY_OPTIONS,
  EXPERIENCE_LEVELS,
  PROFILE_TYPES,
  WINE_TYPES,
  normalizeProfileSetup,
} from '@/lib/profileSetup'
import styles from './ProfileSetupWizardClient.module.scss'

export default function ProfileSetupWizardClient({userId, profile, nextPath = '/dashboard'}) {
  const router = useRouter()
  const t = useT('profileSetup')
  const [form, setForm] = useState(() => normalizeProfileSetup(profile))
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const businessFlow = isBusinessProfile(form)

  const steps = useMemo(
    () => {
      const baseSteps = [
        {
          id: 1,
          title: t('wizard.profileType.title'),
          label: t('sections.profileType'),
          description: t('wizard.profileType.description'),
        },
        {
          id: 2,
          title: t('wizard.experience.title'),
          label: t('sections.experience'),
          description: t('wizard.experience.description'),
        },
        {
          id: 3,
          title: t('wizard.wineTypes.title'),
          label: t('sections.wineTypes'),
          description: t('wizard.wineTypes.description'),
        },
        {
          id: 4,
          title: t('wizard.countries.title'),
          label: t('sections.countries'),
          description: t('wizard.countries.description'),
        },
        {
          id: 5,
          title: t('wizard.location.title'),
          label: t('sections.location'),
          description: t('wizard.location.description'),
        },
      ]

      if (!businessFlow) {
        return [
          ...baseSteps,
          {
            id: 6,
            title: t('wizard.newsletter.title'),
            label: t('sections.newsletter'),
            description: t('wizard.newsletter.description'),
          },
        ]
      }

      return [
        ...baseSteps,
        {
          id: 6,
          title: t('wizard.business.title'),
          label: t('sections.business'),
          description: t('wizard.business.description'),
        },
        {
          id: 7,
          title: t('wizard.newsletter.title'),
          label: t('sections.newsletter'),
          description: t('wizard.newsletter.description'),
        },
      ]
    },
    [businessFlow, t],
  )
  const totalSteps = steps.length
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100)
  const [stepDirection, setStepDirection] = useState('forward')
  const [animateStep, setAnimateStep] = useState(false)

  const updateField = useCallback((key, value) => {
    setForm((prev) => ({...prev, [key]: value}))
    setError('')
  }, [])

  const toggleValue = useCallback((key, value) => {
    setForm((prev) => {
      const nextValues = prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value]
      return {...prev, [key]: nextValues}
    })
    setError('')
  }, [])

  const validateStep = useCallback(() => {
    const currentStepId = steps[stepIndex]?.id
    if (currentStepId === 1 && !form.profile_type) return t('errors.profileType')
    if (currentStepId === 2 && !form.experience_level) return t('errors.experienceLevel')
    if (currentStepId === 3 && form.favorite_wine_types.length === 0) return t('errors.wineTypes')
    if (currentStepId === 4 && form.favorite_countries.length === 0) return t('errors.countries')
    if (currentStepId === 5 && !form.city.trim()) return t('errors.city')
    if (currentStepId === 5 && !form.province.trim()) return t('errors.province')
    if (currentStepId === 6 && businessFlow) {
      if (!form.business_name.trim()) return t('errors.businessName')
      if (!form.business_type.trim()) return t('errors.businessType')
      if (!form.business_description.trim()) return t('errors.businessDescription')
      if (!form.business_website.trim()) return t('errors.businessWebsite')
      if (!form.business_phone.trim()) return t('errors.businessPhone')
      if (!form.business_address.trim()) return t('errors.businessAddress')
      if (form.business_latitude === null || form.business_longitude === null) {
        return t('errors.businessCoordinates')
      }
    }
    return ''
  }, [businessFlow, form, stepIndex, steps, t])

  const persistProfile = useCallback(async (payload) => {
    const response = await Promise.race([
      fetch('/api/profile/setup', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PROFILE_SAVE_TIMEOUT')), 12000),
      ),
    ])

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result?.error || 'Profile save failed')
    }
  }, [])

  const handleNext = useCallback(async () => {
    const validationError = validateStep()
    if (validationError) {
      setError(validationError)
      return
    }

    if (stepIndex < totalSteps - 1) {
      setStepDirection('forward')
      setAnimateStep(true)
      setStepIndex((current) => current + 1)
      return
    }

    setIsSaving(true)
    setError('')

    const timestamp = new Date().toISOString()
    try {
      await persistProfile({
        id: userId,
        profile_type: form.profile_type,
        experience_level: form.experience_level,
        favorite_wine_types: form.favorite_wine_types,
        favorite_countries: form.favorite_countries,
        city: form.city.trim(),
        province: form.province.trim(),
        newsletter_opt_in: form.newsletter_opt_in,
        business_name: form.business_name.trim(),
        business_type: form.business_type.trim(),
        business_description: form.business_description.trim(),
        business_website: form.business_website.trim(),
        business_phone: form.business_phone.trim(),
        business_address: form.business_address.trim(),
        business_latitude: form.business_latitude,
        business_longitude: form.business_longitude,
        profile_completed_at: timestamp,
        profile_prompt_dismissed_at: null,
        updated_at: timestamp,
      })
      router.replace(nextPath)
      router.refresh()
    } catch (persistError) {
      setError(
        persistError.message === 'PROFILE_SAVE_TIMEOUT'
          ? t('errors.timeout')
          : persistError.message || t('errors.generic'),
      )
    } finally {
      setIsSaving(false)
    }
  }, [form, nextPath, persistProfile, router, stepIndex, t, totalSteps, userId, validateStep])

  const handleBack = useCallback(() => {
    if (stepIndex === 0) {
      router.push(nextPath)
      return
    }
    setStepDirection('back')
    setAnimateStep(true)
    setStepIndex((current) => current - 1)
    setError('')
  }, [nextPath, router, stepIndex])

  const handleStepClick = useCallback(
    (stepId) => {
      const nextIndex = stepId - 1
      setStepDirection(nextIndex < stepIndex ? 'back' : 'forward')
      setAnimateStep(true)
      setStepIndex(nextIndex)
      setError('')
    },
    [stepIndex],
  )

  const renderStep = () => {
    if (stepIndex === 0) {
      return (
        <div className={styles.optionGrid}>
          {PROFILE_TYPES.map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.optionCard} ${
                form.profile_type === value ? styles.optionCardActive : ''
              }`}
              onClick={() => updateField('profile_type', value)}>
              <strong>{t(`profileTypes.${value}`)}</strong>
              <span>{t(`profileTypeDescriptions.${value}`)}</span>
            </button>
          ))}
        </div>
      )
    }

    if (stepIndex === 1) {
      return (
        <div className={styles.pillGrid}>
          {EXPERIENCE_LEVELS.map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.pill} ${
                form.experience_level === value ? styles.pillActive : ''
              }`}
              onClick={() => updateField('experience_level', value)}>
              {t(`experienceLevels.${value}`)}
            </button>
          ))}
        </div>
      )
    }

    if (stepIndex === 2) {
      return (
        <div className={styles.pillGrid}>
          {WINE_TYPES.map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.pill} ${
                form.favorite_wine_types.includes(value) ? styles.pillActive : ''
              }`}
              onClick={() => toggleValue('favorite_wine_types', value)}>
              {t(`wineTypes.${value}`)}
            </button>
          ))}
        </div>
      )
    }

    if (stepIndex === 3) {
      return (
        <div className={styles.pillGrid}>
          {COUNTRY_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.pill} ${
                form.favorite_countries.includes(value) ? styles.pillActive : ''
              }`}
              onClick={() => toggleValue('favorite_countries', value)}>
              {t(`countries.${value}`)}
            </button>
          ))}
        </div>
      )
    }

    if (steps[stepIndex]?.id === 5) {
      return (
        <div className={styles.inputGrid}>
          <label className={styles.field}>
            <span>{t('placeholders.city')}</span>
            <input
              type="text"
              value={form.city}
              onChange={(event) => updateField('city', event.target.value)}
              placeholder={t('placeholders.city')}
            />
          </label>
          <label className={styles.field}>
            <span>{t('placeholders.province')}</span>
            <input
              type="text"
              value={form.province}
              onChange={(event) => updateField('province', event.target.value)}
              placeholder={t('placeholders.province')}
            />
          </label>
        </div>
      )
    }

    if (steps[stepIndex]?.id === 6 && businessFlow) {
      return (
        <div className={styles.businessGrid}>
          <label className={styles.field}>
            <span>{t('businessFields.name')}</span>
            <input
              type="text"
              value={form.business_name}
              onChange={(event) => updateField('business_name', event.target.value)}
              placeholder={t('businessPlaceholders.name')}
            />
          </label>
          <label className={styles.field}>
            <span>{t('businessFields.type')}</span>
            <input
              type="text"
              value={form.business_type}
              onChange={(event) => updateField('business_type', event.target.value)}
              placeholder={t('businessPlaceholders.type')}
            />
          </label>
          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span>{t('businessFields.description')}</span>
            <textarea
              rows={4}
              value={form.business_description}
              onChange={(event) => updateField('business_description', event.target.value)}
              placeholder={t('businessPlaceholders.description')}
            />
          </label>
          <label className={styles.field}>
            <span>{t('businessFields.website')}</span>
            <input
              type="url"
              value={form.business_website}
              onChange={(event) => updateField('business_website', event.target.value)}
              placeholder={t('businessPlaceholders.website')}
            />
          </label>
          <label className={styles.field}>
            <span>{t('businessFields.phone')}</span>
            <input
              type="tel"
              value={form.business_phone}
              onChange={(event) => updateField('business_phone', event.target.value)}
              placeholder={t('businessPlaceholders.phone')}
            />
          </label>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <BusinessLocationPicker
              address={form.business_address}
              latitude={form.business_latitude}
              longitude={form.business_longitude}
              onAddressChange={(value) => updateField('business_address', value)}
              onLatitudeChange={(value) => updateField('business_latitude', value)}
              onLongitudeChange={(value) => updateField('business_longitude', value)}
            />
          </div>
        </div>
      )
    }

    return (
      <label className={styles.newsletterCard}>
        <input
          type="checkbox"
          checked={form.newsletter_opt_in}
          onChange={(event) => updateField('newsletter_opt_in', event.target.checked)}
        />
        <span>
          <strong>{t('sections.newsletter')}</strong>
          <small>{t('newsletterHint')}</small>
        </span>
      </label>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <TopBar title={t('modalTitle')} onBack={handleBack} />

        <div className={styles.hero}>
          <span className={styles.eyebrow}>{t('modalEyebrow')}</span>
          <h1 className={styles.title}>{steps[stepIndex].title}</h1>
          <p className={styles.description}>{steps[stepIndex].description}</p>
        </div>

        <div className={styles.progressWrap}>
          <div className={styles.progressMeta}>
            <span>{t('wizard.stepLabel', {current: stepIndex + 1, total: totalSteps})}</span>
            <span>{progress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{width: `${progress}%`}} />
          </div>
        </div>

        <div
          className={`${styles.stepFrame} ${
            animateStep
              ? stepDirection === 'back'
                ? styles.stepEnterBack
                : styles.stepEnterForward
              : ''
          }`}
          onAnimationEnd={() => setAnimateStep(false)}>
          <section className={`${styles.card} ${styles.stepBody}`}>{renderStep()}</section>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.buttonRow}>
          {stepIndex > 0 ? (
            <button
              type="button"
              className="btn neutral"
              onClick={handleBack}
              disabled={isSaving}
              aria-label={t('backAction')}>
              <Icon name="back" />
            </button>
          ) : (
            <div className={styles.buttonSpacer} aria-hidden="true" />
          )}
          <button
            type="button"
            className="btn success-filled"
            onClick={handleNext}
            disabled={isSaving}>
            {isSaving
              ? t('savingAction')
              : stepIndex === totalSteps - 1
                ? t('finishAction')
                : t('nextAction')}
          </button>
        </div>
      </div>
    </main>
  )
}
