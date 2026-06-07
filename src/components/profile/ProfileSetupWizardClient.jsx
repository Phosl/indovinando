'use client'

import {useCallback, useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import {supabaseClient} from '@/lib/supabaseClient'
import {useT} from '@/lib/i18n/useT'
import TopBar from '@/components/TopBar'
import Icon from '@/components/Icon'
import {
  COUNTRY_OPTIONS,
  EXPERIENCE_LEVELS,
  PROFILE_TYPES,
  WINE_TYPES,
  normalizeProfileSetup,
} from '@/lib/profileSetup'
import styles from './ProfileSetupWizardClient.module.scss'

const TOTAL_STEPS = 6

export default function ProfileSetupWizardClient({userId, profile, nextPath = '/dashboard'}) {
  const router = useRouter()
  const t = useT('profileSetup')
  const [form, setForm] = useState(() => normalizeProfileSetup(profile))
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const steps = useMemo(
    () => [
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
      {
        id: 6,
        title: t('wizard.newsletter.title'),
        label: t('sections.newsletter'),
        description: t('wizard.newsletter.description'),
      },
    ],
    [t],
  )

  const progress = Math.round(((stepIndex + 1) / TOTAL_STEPS) * 100)
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
    if (stepIndex === 0 && !form.profile_type) return t('errors.profileType')
    if (stepIndex === 1 && !form.experience_level) return t('errors.experienceLevel')
    if (stepIndex === 2 && form.favorite_wine_types.length === 0) return t('errors.wineTypes')
    if (stepIndex === 3 && form.favorite_countries.length === 0) return t('errors.countries')
    if (stepIndex === 4 && !form.city.trim()) return t('errors.city')
    if (stepIndex === 4 && !form.province.trim()) return t('errors.province')
    return ''
  }, [form, stepIndex, t])

  const persistProfile = useCallback(async (payload) => {
    const {error: persistError} = await supabaseClient.from('profiles').upsert(payload, {
      onConflict: 'id',
    })
    if (persistError) throw persistError
  }, [])

  const handleNext = useCallback(async () => {
    const validationError = validateStep()
    if (validationError) {
      setError(validationError)
      return
    }

    if (stepIndex < TOTAL_STEPS - 1) {
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
        profile_completed_at: timestamp,
        profile_prompt_dismissed_at: null,
        updated_at: timestamp,
      })
      router.replace(nextPath)
      router.refresh()
    } catch (persistError) {
      setError(persistError.message || t('errors.generic'))
    } finally {
      setIsSaving(false)
    }
  }, [form, nextPath, persistProfile, router, stepIndex, t, userId, validateStep])

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

  const handleSkip = useCallback(async () => {
    setIsSaving(true)
    setError('')
    const timestamp = new Date().toISOString()
    try {
      await persistProfile({
        id: userId,
        profile_prompt_dismissed_at: timestamp,
        updated_at: timestamp,
      })
      router.replace(nextPath)
      router.refresh()
    } catch (persistError) {
      setError(persistError.message || t('errors.generic'))
    } finally {
      setIsSaving(false)
    }
  }, [nextPath, persistProfile, router, t, userId])

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

    if (stepIndex === 4) {
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
            <span>{t('wizard.stepLabel', {current: stepIndex + 1, total: TOTAL_STEPS})}</span>
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
            <button
              type="button"
              className="btn neutral"
              onClick={handleSkip}
              disabled={isSaving}
              aria-label={t('skipAction')}>
              {t('skipAction')}
            </button>
          )}
          <button
            type="button"
            className="btn success-filled"
            onClick={handleNext}
            disabled={isSaving}>
            {isSaving
              ? t('savingAction')
              : stepIndex === TOTAL_STEPS - 1
                ? t('finishAction')
                : t('nextAction')}
          </button>
        </div>
      </div>
    </main>
  )
}
