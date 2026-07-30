const HIDDEN_VALUE = '1'
const COOKIE_PREFIX = 'indovinando_onboarding_'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export const ONBOARDING_COOKIE_PREFIX = COOKIE_PREFIX

export const ONBOARDING_GUIDES = Object.freeze({
  all: 'all',
  automatic: 'automatic',
  questionnaire: 'questionnaire',
  bottles: 'bottles',
  courseGuest: 'course-guest',
})

export const LEGACY_ONBOARDING_KEYS = Object.freeze({
  all: 'hideCreateOnboarding',
  automatic: '',
  questionnaire: 'hideQuestionnaireIntro',
  bottles: 'hideBottlesIntro',
  courseGuest: '',
})

const DISMISSIBLE_GUIDES = Object.freeze([
  ONBOARDING_GUIDES.all,
  ONBOARDING_GUIDES.automatic,
  ONBOARDING_GUIDES.questionnaire,
  ONBOARDING_GUIDES.bottles,
])

function getBrowserStorage(name) {
  if (typeof window === 'undefined') return null

  try {
    return window[name]
  } catch {
    return null
  }
}

function getBrowserCookieString() {
  if (typeof document === 'undefined') return ''

  try {
    return document.cookie || ''
  } catch {
    return ''
  }
}

function readStorage(storage, key) {
  if (!storage || !key) return false

  try {
    return storage.getItem(key) === HIDDEN_VALUE
  } catch {
    return false
  }
}

function writeStorage(storage, key, value = HIDDEN_VALUE) {
  if (!storage || !key) return false

  try {
    storage.setItem(key, value)
    return storage.getItem(key) === String(value)
  } catch {
    return false
  }
}

function removeStorage(storage, key) {
  if (!storage || !key) return

  try {
    storage.removeItem(key)
  } catch {
    // A blocked storage backend is handled by the cookie fallback.
  }
}

export function getOnboardingPreferenceKey(userId, guideId) {
  const safeUserId = String(userId || 'guest').replace(/[^a-z0-9_-]/gi, '_')
  const safeGuideId = String(guideId || ONBOARDING_GUIDES.all).replace(
    /[^a-z0-9_-]/gi,
    '_',
  )
  return `indovinando:onboarding:v1:${safeUserId}:${safeGuideId}:hidden`
}

export function getOnboardingCookieName(preferenceKey) {
  return `${COOKIE_PREFIX}${String(preferenceKey).replace(/[^a-z0-9_-]/gi, '_')}`
}

export function getOnboardingSessionKey(preferenceKey) {
  return `${preferenceKey}:seen-session`
}

export function isOnboardingDisabled(
  preferenceKey,
  {
    legacyStorageKey,
    storage = getBrowserStorage('localStorage'),
    cookieString = getBrowserCookieString(),
  } = {},
) {
  if (readStorage(storage, preferenceKey)) return true

  const cookieName = getOnboardingCookieName(preferenceKey)
  const savedInCookie = String(cookieString)
    .split(';')
    .some((entry) => entry.trim() === `${cookieName}=${HIDDEN_VALUE}`)
  if (savedInCookie) return true

  return readStorage(storage, legacyStorageKey)
}

export function migrateLegacyOnboardingPreference(
  preferenceKey,
  legacyStorageKey,
  {storage = getBrowserStorage('localStorage')} = {},
) {
  if (!readStorage(storage, legacyStorageKey)) return false
  if (!writeStorage(storage, preferenceKey)) return false

  removeStorage(storage, legacyStorageKey)
  return true
}

export function disableOnboarding(
  preferenceKey,
  {
    storage = getBrowserStorage('localStorage'),
    writeCookie = (value, cookieName) => {
      if (typeof document === 'undefined') return false
      document.cookie = value
      return String(document.cookie || '')
        .split(';')
        .some((entry) => entry.trim() === `${cookieName}=${HIDDEN_VALUE}`)
    },
  } = {},
) {
  const savedInStorage = writeStorage(storage, preferenceKey)
  const cookieName = getOnboardingCookieName(preferenceKey)
  let savedInCookie = false

  try {
    savedInCookie =
      writeCookie(
        `${cookieName}=${HIDDEN_VALUE}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax`,
        cookieName,
      ) === true
  } catch {
    savedInCookie = false
  }

  return savedInStorage || savedInCookie
}

export function disableAllOnboarding(
  userId,
  {
    storage = getBrowserStorage('localStorage'),
    writeCookie = (value, cookieName) => {
      if (typeof document === 'undefined') return false
      document.cookie = value
      return String(document.cookie || '')
        .split(';')
        .some((entry) => entry.trim() === `${cookieName}=${HIDDEN_VALUE}`)
    },
  } = {},
) {
  const guideResults = DISMISSIBLE_GUIDES.map((guideId) =>
    disableOnboarding(getOnboardingPreferenceKey(userId, guideId), {
      storage,
      writeCookie,
    }),
  )

  return guideResults.every(Boolean)
}

export function hasSeenOnboardingThisSession(
  preferenceKey,
  {storage = getBrowserStorage('sessionStorage')} = {},
) {
  return readStorage(storage, getOnboardingSessionKey(preferenceKey))
}

export function markOnboardingSeenThisSession(
  preferenceKey,
  {storage = getBrowserStorage('sessionStorage')} = {},
) {
  return writeStorage(storage, getOnboardingSessionKey(preferenceKey))
}

export function captureOnboardingPreferences(
  storage = getBrowserStorage('localStorage'),
  {userId} = {},
) {
  if (!storage) return []

  const entries = []
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (!key) continue

      const isCurrentPreference = key.startsWith('indovinando:onboarding:')
      const legacyGuideEntry = Object.entries(LEGACY_ONBOARDING_KEYS).find(
        ([, legacyKey]) => legacyKey && legacyKey === key,
      )
      if (!isCurrentPreference && (!legacyGuideEntry || !userId)) continue

      const value = storage.getItem(key)
      if (value === null) continue

      const destinationKey = isCurrentPreference
        ? key
        : getOnboardingPreferenceKey(
            userId,
            ONBOARDING_GUIDES[legacyGuideEntry[0]],
          )
      entries.push([destinationKey, value])
    }
  } catch {
    return []
  }

  return entries
}

export function restoreOnboardingPreferences(
  entries,
  storage = getBrowserStorage('localStorage'),
) {
  if (!storage || !Array.isArray(entries)) return false

  let restored = true
  for (const entry of entries) {
    if (!Array.isArray(entry) || entry.length !== 2) continue
    restored = writeStorage(storage, entry[0], entry[1]) && restored
  }
  return restored
}

export function isOnboardingPersistenceConfirmed({
  requiresRemote,
  persistedOnDevice,
  persistedRemotely,
}) {
  return (
    persistedOnDevice === true ||
    (requiresRemote === true && persistedRemotely === true)
  )
}
