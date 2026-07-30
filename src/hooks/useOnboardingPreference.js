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
const disabledInMemory = new Set()
const seenInMemory = new Set()
const remotelyPersisted = new Set()
const remoteSyncInFlight = new Map()

function getServerStatus() {
  return SERVER_STATUS
}

function notifyPreferenceChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PREFERENCE_CHANGE_EVENT))
  }
}

function persistRemotePreference(syncKey, persistDisable) {
  if (!persistDisable) return Promise.resolve(false)
  if (remotelyPersisted.has(syncKey)) return Promise.resolve(true)

  const existingRequest = remoteSyncInFlight.get(syncKey)
  if (existingRequest) return existingRequest

  const request = Promise.resolve()
    .then(() => persistDisable())
    .then((persisted) => {
      if (persisted === false) {
        throw new Error('ONBOARDING_PREFERENCE_NOT_PERSISTED')
      }
      remotelyPersisted.add(syncKey)
      return true
    })
    .finally(() => {
      if (remoteSyncInFlight.get(syncKey) === request) {
        remoteSyncInFlight.delete(syncKey)
      }
    })

  remoteSyncInFlight.set(syncKey, request)
  return request
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
  const syncKey = isStandaloneGuide ? preferenceKey : globalPreferenceKey
  const [visibilityOverride, setVisibilityOverride] = useState({
    preferenceKey: '',
    value: null,
  })
  const [isPersisting, setIsPersisting] = useState(false)
  const [persistenceError, setPersistenceError] = useState(false)
  const persistenceInFlightRef = useRef(false)

  const getStatus = useCallback(() => {
    const globallyDisabled =
      !isStandaloneGuide &&
      (disabledInMemory.has(globalPreferenceKey) ||
        isOnboardingDisabled(globalPreferenceKey, {
          legacyStorageKey: LEGACY_ONBOARDING_KEYS.all,
        }))
    const guideDisabled =
      guideId === ONBOARDING_GUIDES.all
        ? globallyDisabled
        : disabledInMemory.has(preferenceKey) ||
          isOnboardingDisabled(preferenceKey, {
            legacyStorageKey: LEGACY_ONBOARDING_KEYS[guideId],
          })

    if (globallyDisabled || guideDisabled) return 'disabled'
    if (
      seenInMemory.has(preferenceKey) ||
      hasSeenOnboardingThisSession(preferenceKey)
    ) {
      return 'seen'
    }
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
      remotelyPersisted.has(syncKey) ||
      remoteSyncInFlight.has(syncKey)
    ) {
      return
    }

    persistRemotePreference(syncKey, persistDisable)
      .then(() => {
        setPersistenceError(false)
      })
      .catch(() => {
        setPersistenceError(true)
      })
  }, [initiallyVisible, isDisabled, isReady, persistDisable, syncKey])

  const open = useCallback(() => {
    setPersistenceError(false)
    setVisibilityOverride({preferenceKey, value: true})
  }, [preferenceKey])

  const close = useCallback(() => {
    seenInMemory.add(preferenceKey)
    markOnboardingSeenThisSession(preferenceKey)
    setVisibilityOverride({preferenceKey, value: false})
    notifyPreferenceChange()
  }, [preferenceKey])

  const disable = useCallback(async () => {
    if (persistenceInFlightRef.current) return false

    persistenceInFlightRef.current = true
    setIsPersisting(true)
    setPersistenceError(false)

    const persistedOnDevice = isStandaloneGuide
      ? disableOnboarding(preferenceKey)
      : disableAllOnboarding(userId)

    let persistedRemotely = false
    if (persistDisable) {
      try {
        persistedRemotely = await persistRemotePreference(syncKey, persistDisable)
      } catch {
        persistedRemotely = false
      }
    }

    try {
      const persistenceSucceeded = persistedOnDevice || persistedRemotely

      if (!persistenceSucceeded) {
        throw new Error('ONBOARDING_PREFERENCE_NOT_PERSISTED')
      }

      disabledInMemory.add(syncKey)
      seenInMemory.add(preferenceKey)
      markOnboardingSeenThisSession(preferenceKey)
      setVisibilityOverride({preferenceKey, value: false})
      notifyPreferenceChange()
      return true
    } catch {
      setPersistenceError(true)
      setVisibilityOverride({preferenceKey, value: true})
      return false
    } finally {
      persistenceInFlightRef.current = false
      setIsPersisting(false)
    }
  }, [isStandaloneGuide, persistDisable, preferenceKey, syncKey, userId])

  return {
    canOpenAutomatically: status === 'available',
    close,
    disable,
    isDisabled,
    isPersisting,
    isReady,
    isVisible,
    open,
    persistenceError,
  }
}
