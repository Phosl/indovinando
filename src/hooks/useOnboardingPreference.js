'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  disableAllOnboarding,
  disableOnboarding,
  getOnboardingPreferenceKey,
  hasSeenOnboardingThisSession,
  isOnboardingDisabled,
  LEGACY_ONBOARDING_KEYS,
  markOnboardingSeenThisSession,
  migrateLegacyOnboardingPreference,
  ONBOARDING_GUIDES,
} from '@/lib/onboardingPreferences.mjs'

const GUIDE_BY_PREFERENCE = Object.freeze({
  createOverview: ONBOARDING_GUIDES.all,
  createAutomatic: ONBOARDING_GUIDES.automatic,
  editorQuestionnaire: ONBOARDING_GUIDES.questionnaire,
  editorBottles: ONBOARDING_GUIDES.bottles,
  courseGuestWarning: ONBOARDING_GUIDES.courseGuest,
})
const PREFERENCE_CHANGE_EVENT = 'indovinando:onboarding-preference-change'
const SERVER_STATUS = 'pending'

function getServerStatus() {
  return SERVER_STATUS
}

function notifyPreferenceChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PREFERENCE_CHANGE_EVENT))
  }
}

export default function useOnboardingPreference({
  preference,
  userId,
  initiallyVisible = false,
  persistDisable,
}) {
  const guideId = GUIDE_BY_PREFERENCE[preference] || ONBOARDING_GUIDES.all
  const preferenceKey = useMemo(
    () => getOnboardingPreferenceKey(userId, guideId),
    [guideId, userId],
  )
  const globalPreferenceKey = useMemo(
    () => getOnboardingPreferenceKey(userId, ONBOARDING_GUIDES.all),
    [userId],
  )
  const isStandaloneGuide = guideId === ONBOARDING_GUIDES.courseGuest
  const [visibilityOverride, setVisibilityOverride] = useState({
    preferenceKey: '',
    value: null,
  })
  const [persistenceError, setPersistenceError] = useState(false)
  const retryStartedForKeyRef = useRef('')

  const getStatus = useCallback(() => {
    const globallyDisabled =
      !isStandaloneGuide &&
      isOnboardingDisabled(globalPreferenceKey, {
        legacyStorageKey: LEGACY_ONBOARDING_KEYS.all,
      })
    const guideDisabled =
      guideId === ONBOARDING_GUIDES.all
        ? globallyDisabled
        : isOnboardingDisabled(preferenceKey, {
            legacyStorageKey: LEGACY_ONBOARDING_KEYS[guideId],
          })

    if (globallyDisabled || guideDisabled) return 'disabled'
    if (hasSeenOnboardingThisSession(preferenceKey)) return 'seen'
    return 'available'
  }, [globalPreferenceKey, guideId, isStandaloneGuide, preferenceKey])

  const subscribe = useCallback((onStoreChange) => {
    if (typeof window === 'undefined') return () => {}

    window.addEventListener(PREFERENCE_CHANGE_EVENT, onStoreChange)
    window.addEventListener('storage', onStoreChange)
    return () => {
      window.removeEventListener(PREFERENCE_CHANGE_EVENT, onStoreChange)
      window.removeEventListener('storage', onStoreChange)
    }
  }, [])

  const status = useSyncExternalStore(subscribe, getStatus, getServerStatus)
  const isReady = status !== SERVER_STATUS
  const isDisabled = status === 'disabled'
  const currentVisibilityOverride =
    visibilityOverride.preferenceKey === preferenceKey
      ? visibilityOverride.value
      : null
  const isVisible =
    currentVisibilityOverride ??
    (isReady && Boolean(initiallyVisible) && status === 'available')

  useEffect(() => {
    const migratedGlobal = isStandaloneGuide
      ? false
      : migrateLegacyOnboardingPreference(
          globalPreferenceKey,
          LEGACY_ONBOARDING_KEYS.all,
        )
    const migratedGuide =
      guideId === ONBOARDING_GUIDES.all
        ? false
        : migrateLegacyOnboardingPreference(
            preferenceKey,
            LEGACY_ONBOARDING_KEYS[guideId],
          )

    if (migratedGlobal || migratedGuide) notifyPreferenceChange()
  }, [globalPreferenceKey, guideId, isStandaloneGuide, preferenceKey])

  useEffect(() => {
    if (
      !initiallyVisible ||
      !isReady ||
      !isDisabled ||
      !persistDisable ||
      retryStartedForKeyRef.current === preferenceKey
    ) {
      return
    }

    retryStartedForKeyRef.current = preferenceKey
    Promise.resolve(persistDisable())
      .then((persisted) => {
        if (persisted === false) {
          throw new Error('ONBOARDING_PREFERENCE_NOT_PERSISTED')
        }
      })
      .catch(() => {
        retryStartedForKeyRef.current = ''
        setPersistenceError(true)
      })
  }, [initiallyVisible, isDisabled, isReady, persistDisable, preferenceKey])

  const open = useCallback(() => {
    setPersistenceError(false)
    setVisibilityOverride({preferenceKey, value: true})
  }, [preferenceKey])

  const close = useCallback(() => {
    markOnboardingSeenThisSession(preferenceKey)
    setVisibilityOverride({preferenceKey, value: false})
    notifyPreferenceChange()
  }, [preferenceKey])

  const disable = useCallback(async () => {
    retryStartedForKeyRef.current = preferenceKey
    const persistedOnDevice = isStandaloneGuide
      ? disableOnboarding(preferenceKey)
      : disableAllOnboarding(userId)
    setPersistenceError(false)

    let persistedRemotely = false
    if (persistDisable) {
      try {
        persistedRemotely = (await persistDisable()) !== false
      } catch {
        persistedRemotely = false
      }
    }

    if (!persistedOnDevice && !persistedRemotely) {
      retryStartedForKeyRef.current = ''
      setPersistenceError(true)
      setVisibilityOverride({preferenceKey, value: true})
      return false
    }

    markOnboardingSeenThisSession(preferenceKey)
    setVisibilityOverride({preferenceKey, value: false})
    notifyPreferenceChange()
    return true
  }, [isStandaloneGuide, persistDisable, preferenceKey, userId])

  return {
    canOpenAutomatically: status === 'available',
    close,
    disable,
    isDisabled,
    isReady,
    isVisible,
    open,
    persistenceError,
  }
}
