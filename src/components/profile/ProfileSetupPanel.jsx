'use client'

import {useEffect, useId, useMemo, useRef, useState} from 'react'
import {usePathname} from 'next/navigation'
import {useAppData} from '@/components/AppDataContext'
import {Button, ButtonLink} from '@/components/ui/Button'
import {useT} from '@/lib/i18n/useT'
import {dismissProfileSetupPrompt} from '@/lib/profileOnboardingClient'
import {
  getProfileCompletionCount,
  isBusinessProfile,
  isProfileComplete,
  normalizeProfileSetup,
} from '@/lib/profileSetup'
import styles from './ProfileSetupPanel.module.scss'

function formatList(values, labelFor) {
  return values.map(labelFor).join(', ')
}

export default function ProfileSetupPanel({profile, mode = 'dashboard', onDismissed}) {
  const t = useT('profileSetup')
  const pathname = usePathname()
  const {applyVerifiedProfilePatch, user} = useAppData()
  const [isDismissing, setIsDismissing] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [dismissError, setDismissError] = useState('')
  const dismissErrorId = useId()
  const dismissErrorRef = useRef(null)
  const dismissConfirmationRef = useRef(null)
  const normalizedProfile = useMemo(() => normalizeProfileSetup(profile), [profile])
  const isComplete = useMemo(() => isProfileComplete(normalizedProfile), [normalizedProfile])
  const completionCount = useMemo(
    () => getProfileCompletionCount(normalizedProfile),
    [normalizedProfile],
  )
  const totalFields = isBusinessProfile(normalizedProfile) ? 13 : 6
  const nextHref = pathname || (mode === 'dashboard' ? '/dashboard' : '/profilo')
  const setupHref = `/profilo/completa?next=${encodeURIComponent(nextHref)}`

  const labelForProfileType = (value) => t(`profileTypes.${value}`)
  const labelForExperience = (value) => t(`experienceLevels.${value}`)
  const labelForWineType = (value) => t(`wineTypes.${value}`)
  const labelForCountry = (value) => t(`countries.${value}`)
  const canDismiss = mode === 'dashboard' && !isComplete

  useEffect(() => {
    if (!dismissError) return undefined

    const animationFrame = window.requestAnimationFrame(() => {
      dismissErrorRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(animationFrame)
  }, [dismissError])

  useEffect(() => {
    if (!isDismissed) return undefined

    const animationFrame = window.requestAnimationFrame(() => {
      dismissConfirmationRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(animationFrame)
  }, [isDismissed])

  async function handleDismiss() {
    if (isDismissing) return

    const expectedUserId = user?.id
    setIsDismissing(true)
    setDismissError('')

    try {
      const dismissedAt = await dismissProfileSetupPrompt(expectedUserId)
      const applied = applyVerifiedProfilePatch(
        {profile_prompt_dismissed_at: dismissedAt},
        {expectedUserId},
      )
      if (!applied) throw new Error('PROFILE_AUTH_IDENTITY_CHANGED')

      setIsDismissed(true)
      onDismissed?.()
    } catch (error) {
      setDismissError(
        error?.message === 'PROFILE_SAVE_TIMEOUT' ? t('errors.timeout') : t('errors.generic'),
      )
    } finally {
      setIsDismissing(false)
    }
  }

  if (isDismissed) {
    return (
      <div
        ref={dismissConfirmationRef}
        className={styles.dismissConfirmation}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        tabIndex={-1}>
        {t('dismissedConfirmation')}
      </div>
    )
  }

  return (
    <section
      className={`${styles.card} ${mode === 'dashboard' ? styles.cardDashboard : ''}`}
      aria-busy={isDismissing}>
      <div className={styles.cardHeader}>
        <div className={styles.cardCopy}>
          <span className={styles.eyebrow}>
            {isComplete ? t('summaryEyebrow') : t('reminderEyebrow')}
          </span>
          <h2 className={styles.title}>{isComplete ? t('summaryTitle') : t('reminderTitle')}</h2>
          <p className={styles.description}>
            {isComplete ? t('summaryDescription') : t('reminderDescription')}
          </p>
        </div>
        <div className={styles.progressBadge} role="status">
          {t('progressLabel', {current: completionCount, total: totalFields})}
        </div>
      </div>

      {isComplete ? (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t('fields.profileType')}</span>
            <strong>{labelForProfileType(normalizedProfile.profile_type)}</strong>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t('fields.experienceLevel')}</span>
            <strong>{labelForExperience(normalizedProfile.experience_level)}</strong>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t('fields.wineTypes')}</span>
            <strong>{formatList(normalizedProfile.favorite_wine_types, labelForWineType)}</strong>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t('fields.countries')}</span>
            <strong>{formatList(normalizedProfile.favorite_countries, labelForCountry)}</strong>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t('fields.location')}</span>
            <strong>
              {normalizedProfile.city}, {normalizedProfile.province}
            </strong>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>{t('fields.newsletter')}</span>
            <strong>
              {normalizedProfile.newsletter_opt_in
                ? t('newsletterEnabled')
                : t('newsletterDisabled')}
            </strong>
          </div>
          {isBusinessProfile(normalizedProfile) ? (
            <>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>{t('fields.businessName')}</span>
                <strong>{normalizedProfile.business_name}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>{t('fields.businessType')}</span>
                <strong>{normalizedProfile.business_type}</strong>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {dismissError ? (
        <div
          id={dismissErrorId}
          ref={dismissErrorRef}
          className={styles.error}
          role="alert"
          tabIndex={-1}>
          {dismissError}
        </div>
      ) : null}

      <div className={`${styles.actions} ${canDismiss ? '' : styles.actionsSingle}`}>
        <ButtonLink
          href={setupHref}
          variant={isComplete ? 'primary' : 'primary-filled'}
          size="small"
          className={styles.actionBtn}>
          {isComplete ? t('editAction') : t('completeAction')}
        </ButtonLink>
        {canDismiss ? (
          <Button
            variant="neutral"
            size="small"
            className={styles.actionBtn}
            onClick={handleDismiss}
            disabled={isDismissing}
            aria-describedby={dismissError ? dismissErrorId : undefined}>
            {isDismissing ? t('dismissingAction') : t('dontShowAgainAction')}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
