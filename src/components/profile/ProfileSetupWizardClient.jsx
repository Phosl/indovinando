'use client'

import {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import {useT} from '@/lib/i18n/useT'
import TopBar from '@/components/TopBar'
import Icon from '@/components/Icon'
import {Button} from '@/components/ui/Button'
import {useAppData} from '@/components/AppDataContext'
import {dismissProfileSetupPrompt} from '@/lib/profileOnboardingClient'
import BusinessLocationPicker from '@/components/profile/BusinessLocationPicker'
import {
  isBusinessProfile,
  isProfileComplete,
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
  const {refresh: refreshAppData} = useAppData()
  const [form, setForm] = useState(() => normalizeProfileSetup(profile))
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState('')
  const [errorField, setErrorField] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const titleId = useId()
  const descriptionId = useId()
  const progressLabelId = useId()
  const errorId = useId()
  const titleRef = useRef(null)
  const errorRef = useRef(null)
  const hasMountedRef = useRef(false)
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
  const canDismissReminder = !isProfileComplete(normalizeProfileSetup(profile))

  const updateField = useCallback((key, value) => {
    setForm((prev) => ({...prev, [key]: value}))
    setError('')
    setErrorField('')
  }, [])

  const toggleValue = useCallback((key, value) => {
    setForm((prev) => {
      const nextValues = prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value]
      return {...prev, [key]: nextValues}
    })
    setError('')
    setErrorField('')
  }, [])

  const validateStep = useCallback(() => {
    const currentStepId = steps[stepIndex]?.id
    if (currentStepId === 1 && !form.profile_type) {
      return {message: t('errors.profileType'), field: 'profile_type'}
    }
    if (currentStepId === 2 && !form.experience_level) {
      return {message: t('errors.experienceLevel'), field: 'experience_level'}
    }
    if (currentStepId === 3 && form.favorite_wine_types.length === 0) {
      return {message: t('errors.wineTypes'), field: 'favorite_wine_types'}
    }
    if (currentStepId === 4 && form.favorite_countries.length === 0) {
      return {message: t('errors.countries'), field: 'favorite_countries'}
    }
    if (currentStepId === 5 && !form.city.trim()) {
      return {message: t('errors.city'), field: 'city'}
    }
    if (currentStepId === 5 && !form.province.trim()) {
      return {message: t('errors.province'), field: 'province'}
    }
    if (currentStepId === 6 && businessFlow) {
      if (!form.business_name.trim()) {
        return {message: t('errors.businessName'), field: 'business_name'}
      }
      if (!form.business_type.trim()) {
        return {message: t('errors.businessType'), field: 'business_type'}
      }
      if (!form.business_description.trim()) {
        return {message: t('errors.businessDescription'), field: 'business_description'}
      }
      if (!form.business_website.trim()) {
        return {message: t('errors.businessWebsite'), field: 'business_website'}
      }
      if (!form.business_phone.trim()) {
        return {message: t('errors.businessPhone'), field: 'business_phone'}
      }
      if (!form.business_address.trim()) {
        return {message: t('errors.businessAddress'), field: 'business_address'}
      }
      if (form.business_latitude === null || form.business_longitude === null) {
        return {message: t('errors.businessCoordinates'), field: 'business_coordinates'}
      }
    }
    return null
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

  const persistReminderDismissal = useCallback(async () => {
    await dismissProfileSetupPrompt()
  }, [])

  const handleNext = useCallback(async () => {
    const validationError = validateStep()
    if (validationError) {
      setError(validationError.message)
      setErrorField(validationError.field)
      return
    }

    if (stepIndex < totalSteps - 1) {
      setError('')
      setErrorField('')
      setStepDirection('forward')
      setAnimateStep(true)
      setStepIndex((current) => current + 1)
      return
    }

    setIsSaving(true)
    setIsDismissing(false)
    setError('')
    setErrorField('')

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
      await refreshAppData({force: true})
      router.replace(nextPath)
      router.refresh()
    } catch (persistError) {
      setErrorField('')
      setError(
        persistError.message === 'PROFILE_SAVE_TIMEOUT'
          ? t('errors.timeout')
          : persistError.message || t('errors.generic'),
      )
    } finally {
      setIsSaving(false)
    }
  }, [
    form,
    nextPath,
    persistProfile,
    refreshAppData,
    router,
    stepIndex,
    t,
    totalSteps,
    userId,
    validateStep,
  ])

  const handleDismiss = useCallback(async () => {
    if (isSaving) return

    setIsSaving(true)
    setIsDismissing(true)
    setError('')
    setErrorField('')

    try {
      await persistReminderDismissal()
      await refreshAppData({force: true})
      router.replace(nextPath)
      router.refresh()
    } catch (dismissError) {
      setError(
        dismissError?.message === 'PROFILE_SAVE_TIMEOUT'
          ? t('errors.timeout')
          : t('errors.generic'),
      )
    } finally {
      setIsDismissing(false)
      setIsSaving(false)
    }
  }, [isSaving, nextPath, persistReminderDismissal, refreshAppData, router, t])

  const handleBack = useCallback(() => {
    if (stepIndex === 0) {
      router.push(nextPath)
      return
    }
    setStepDirection('back')
    setAnimateStep(true)
    setStepIndex((current) => current - 1)
    setError('')
    setErrorField('')
  }, [nextPath, router, stepIndex])

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return undefined
    }

    const animationFrame = window.requestAnimationFrame(() => {
      titleRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(animationFrame)
  }, [stepIndex])

  useEffect(() => {
    if (!error) return undefined

    const animationFrame = window.requestAnimationFrame(() => {
      errorRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(animationFrame)
  }, [error])

  const renderStep = () => {
    if (stepIndex === 0) {
      return (
        <div
          className={styles.optionGrid}
          role="group"
          aria-labelledby={titleId}
          aria-describedby={errorField === 'profile_type' ? errorId : undefined}>
          {PROFILE_TYPES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={form.profile_type === value}
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
        <div
          className={styles.pillGrid}
          role="group"
          aria-labelledby={titleId}
          aria-describedby={errorField === 'experience_level' ? errorId : undefined}>
          {EXPERIENCE_LEVELS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={form.experience_level === value}
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
        <div
          className={styles.pillGrid}
          role="group"
          aria-labelledby={titleId}
          aria-describedby={errorField === 'favorite_wine_types' ? errorId : undefined}>
          {WINE_TYPES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={form.favorite_wine_types.includes(value)}
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
        <div
          className={styles.pillGrid}
          role="group"
          aria-labelledby={titleId}
          aria-describedby={errorField === 'favorite_countries' ? errorId : undefined}>
          {COUNTRY_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={form.favorite_countries.includes(value)}
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
              aria-invalid={errorField === 'city'}
              aria-describedby={errorField === 'city' ? errorId : undefined}
              onChange={(event) => updateField('city', event.target.value)}
              placeholder={t('placeholders.city')}
            />
          </label>
          <label className={styles.field}>
            <span>{t('placeholders.province')}</span>
            <input
              type="text"
              value={form.province}
              aria-invalid={errorField === 'province'}
              aria-describedby={errorField === 'province' ? errorId : undefined}
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
              aria-invalid={errorField === 'business_name'}
              aria-describedby={errorField === 'business_name' ? errorId : undefined}
              onChange={(event) => updateField('business_name', event.target.value)}
              placeholder={t('businessPlaceholders.name')}
            />
          </label>
          <label className={styles.field}>
            <span>{t('businessFields.type')}</span>
            <input
              type="text"
              value={form.business_type}
              aria-invalid={errorField === 'business_type'}
              aria-describedby={errorField === 'business_type' ? errorId : undefined}
              onChange={(event) => updateField('business_type', event.target.value)}
              placeholder={t('businessPlaceholders.type')}
            />
          </label>
          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span>{t('businessFields.description')}</span>
            <textarea
              rows={4}
              value={form.business_description}
              aria-invalid={errorField === 'business_description'}
              aria-describedby={errorField === 'business_description' ? errorId : undefined}
              onChange={(event) => updateField('business_description', event.target.value)}
              placeholder={t('businessPlaceholders.description')}
            />
          </label>
          <label className={styles.field}>
            <span>{t('businessFields.website')}</span>
            <input
              type="url"
              value={form.business_website}
              aria-invalid={errorField === 'business_website'}
              aria-describedby={errorField === 'business_website' ? errorId : undefined}
              onChange={(event) => updateField('business_website', event.target.value)}
              placeholder={t('businessPlaceholders.website')}
            />
          </label>
          <label className={styles.field}>
            <span>{t('businessFields.phone')}</span>
            <input
              type="tel"
              value={form.business_phone}
              aria-invalid={errorField === 'business_phone'}
              aria-describedby={errorField === 'business_phone' ? errorId : undefined}
              onChange={(event) => updateField('business_phone', event.target.value)}
              placeholder={t('businessPlaceholders.phone')}
            />
          </label>
          <div
            className={`${styles.field} ${styles.fieldFull}`}
            role="group"
            aria-describedby={
              errorField === 'business_address' || errorField === 'business_coordinates'
                ? errorId
                : undefined
            }>
            <BusinessLocationPicker
              address={form.business_address}
              latitude={form.business_latitude}
              longitude={form.business_longitude}
              validationError={
                errorField === 'business_address'
                  ? 'address'
                  : errorField === 'business_coordinates'
                    ? 'coordinates'
                    : ''
              }
              errorId={errorId}
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
    <main className={styles.page} aria-busy={isSaving}>
      <div className={styles.container}>
        <TopBar
          title={t('modalTitle')}
          onBack={handleBack}
          maxWidth="760px"
          titleClassName={styles.topBarTitle}
        />

        <div className={styles.hero}>
          <div className={styles.heroMeta}>
            <span className={styles.eyebrow}>{t('modalEyebrow')}</span>
            <span className={styles.stepName}>{steps[stepIndex].label}</span>
          </div>
          <h2 id={titleId} ref={titleRef} className={styles.title} tabIndex={-1}>
            {steps[stepIndex].title}
          </h2>
          <p id={descriptionId} className={styles.description}>
            {steps[stepIndex].description}
          </p>
        </div>

        <div className={styles.progressWrap}>
          <div className={styles.progressMeta}>
            <span id={progressLabelId}>
              {t('wizard.stepLabel', {current: stepIndex + 1, total: totalSteps})}
            </span>
            <span>{progress}%</span>
          </div>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-labelledby={progressLabelId}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-valuetext={t('wizard.stepLabel', {
              current: stepIndex + 1,
              total: totalSteps,
            })}>
            <div className={styles.progressFill} style={{width: `${progress}%`}} />
          </div>
        </div>

        {error ? (
          <div
            id={errorId}
            ref={errorRef}
            className={styles.error}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}>
            {error}
          </div>
        ) : null}

        <div
          className={`${styles.stepFrame} ${
            animateStep
              ? stepDirection === 'back'
                ? styles.stepEnterBack
                : styles.stepEnterForward
              : ''
          }`}
          onAnimationEnd={() => setAnimateStep(false)}>
          <section
            className={`${styles.card} ${styles.stepBody}`}
            aria-labelledby={titleId}
            aria-describedby={descriptionId}>
            {renderStep()}
          </section>
        </div>

        <div className={styles.buttonDock}>
          <div
            className={styles.buttonRow}>
            {stepIndex > 0 ? (
              <Button
                variant="neutral"
                className={styles.secondaryAction}
                onClick={handleBack}
                disabled={isSaving}>
                <Icon name="back" size={20} />
                <span>{t('backAction')}</span>
              </Button>
            ) : canDismissReminder ? (
              <Button
                variant="neutral"
                className={styles.secondaryAction}
                onClick={handleDismiss}
                disabled={isSaving}>
                {isDismissing ? t('dismissingAction') : t('dontShowAgainAction')}
              </Button>
            ) : (
              <Button
                variant="neutral"
                className={styles.secondaryAction}
                onClick={handleBack}
                disabled={isSaving}>
                <Icon name="back" size={20} />
                <span>{t('backAction')}</span>
              </Button>
            )}
            <Button
              variant="primary-filled"
              className={styles.primaryAction}
              onClick={handleNext}
              disabled={isSaving}
              aria-busy={isSaving && !isDismissing}>
              {isSaving && !isDismissing
                ? t('savingAction')
                : stepIndex === totalSteps - 1
                  ? t('finishAction')
                  : t('nextAction')}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
