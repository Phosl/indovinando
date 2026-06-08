'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import {usePathname} from 'next/navigation'
import {useT} from '@/lib/i18n/useT'
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

export default function ProfileSetupPanel({profile, mode = 'dashboard'}) {
  const t = useT('profileSetup')
  const pathname = usePathname()
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

  return (
    <section className={`${styles.card} ${mode === 'dashboard' ? styles.cardDashboard : ''}`}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.eyebrow}>
            {isComplete ? t('summaryEyebrow') : t('reminderEyebrow')}
          </span>
          <h2 className={styles.title}>{isComplete ? t('summaryTitle') : t('reminderTitle')}</h2>
          {/* <p className={styles.description}>
            {isComplete ? t('summaryDescription') : t('reminderDescription')}
          </p> */}
        </div>
        <div className={styles.progressBadge}>
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
      ) : (
        ''
        // <ul className={styles.checkList}>
        //   <li>{t('checklist.profileType')}</li>
        //   <li>{t('checklist.experience')}</li>
        //   <li>{t('checklist.preferences')}</li>
        //   <li>{t('checklist.location')}</li>
        //   {isBusinessProfile(normalizedProfile) ? <li>{t('checklist.business')}</li> : null}
        // </ul>
      )}

      <div className={styles.actions}>
        <Link
          href={setupHref}
          className={`btn ${isComplete ? 'primary' : 'success-filled'} btn-small ${styles.actionBtn}`}>
          {isComplete ? t('editAction') : t('completeAction')}
        </Link>
      </div>
    </section>
  )
}
