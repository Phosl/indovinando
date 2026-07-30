import assert from 'node:assert/strict'
import {
  captureOnboardingPreferences,
  disableAllOnboarding,
  disableOnboarding,
  getOnboardingCookieName,
  getOnboardingPreferenceKey,
  hasSeenOnboardingThisSession,
  isOnboardingDisabled,
  LEGACY_ONBOARDING_KEYS,
  markOnboardingSeenThisSession,
  migrateLegacyOnboardingPreference,
  ONBOARDING_GUIDES,
  restoreOnboardingPreferences,
} from '../src/lib/onboardingPreferences.mjs'

class MemoryStorage {
  constructor(entries = []) {
    this.values = new Map(entries)
  }

  get length() {
    return this.values.size
  }

  key(index) {
    return [...this.values.keys()][index] ?? null
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null
  }

  setItem(key, value) {
    this.values.set(key, String(value))
  }

  removeItem(key) {
    this.values.delete(key)
  }

  clear() {
    this.values.clear()
  }
}

const localStorage = new MemoryStorage()
const sessionStorage = new MemoryStorage()
const userAOverviewKey = getOnboardingPreferenceKey('user-a', ONBOARDING_GUIDES.all)
const userBOverviewKey = getOnboardingPreferenceKey('user-b', ONBOARDING_GUIDES.all)
const userAQuestionnaireKey = getOnboardingPreferenceKey(
  'user-a',
  ONBOARDING_GUIDES.questionnaire,
)

assert.equal(isOnboardingDisabled(userAOverviewKey, {storage: localStorage}), false)
assert.equal(
  disableOnboarding(userAOverviewKey, {
    storage: localStorage,
    writeCookie: () => false,
  }),
  true,
)
assert.equal(isOnboardingDisabled(userAOverviewKey, {storage: localStorage}), true)
assert.equal(
  isOnboardingDisabled(userBOverviewKey, {storage: localStorage}),
  false,
  'a preference must not leak between accounts',
)

localStorage.setItem(LEGACY_ONBOARDING_KEYS.questionnaire, '1')
assert.equal(
  isOnboardingDisabled(userAQuestionnaireKey, {
    legacyStorageKey: LEGACY_ONBOARDING_KEYS.questionnaire,
    storage: localStorage,
  }),
  true,
)
assert.equal(
  migrateLegacyOnboardingPreference(
    userAQuestionnaireKey,
    LEGACY_ONBOARDING_KEYS.questionnaire,
    {storage: localStorage},
  ),
  true,
)
assert.equal(localStorage.getItem(LEGACY_ONBOARDING_KEYS.questionnaire), null)
assert.equal(
  localStorage.getItem(userAQuestionnaireKey),
  '1',
  'legacy preferences must migrate to the current account scope',
)

assert.equal(
  hasSeenOnboardingThisSession(userAOverviewKey, {storage: sessionStorage}),
  false,
)
assert.equal(
  markOnboardingSeenThisSession(userAOverviewKey, {storage: sessionStorage}),
  true,
)
assert.equal(
  hasSeenOnboardingThisSession(userAOverviewKey, {storage: sessionStorage}),
  true,
)

const allStorage = new MemoryStorage()
assert.equal(
  disableAllOnboarding('user-a', {
    storage: allStorage,
    writeCookie: () => false,
  }),
  true,
)
for (const guideId of [
  ONBOARDING_GUIDES.all,
  ONBOARDING_GUIDES.automatic,
  ONBOARDING_GUIDES.questionnaire,
  ONBOARDING_GUIDES.bottles,
]) {
  const preferenceKey = getOnboardingPreferenceKey('user-a', guideId)
  assert.equal(
    isOnboardingDisabled(preferenceKey, {storage: allStorage}),
    true,
    `guide ${guideId} must stay disabled`,
  )
}
assert.equal(
  isOnboardingDisabled(
    getOnboardingPreferenceKey('user-a', ONBOARDING_GUIDES.courseGuest),
    {storage: allStorage},
  ),
  false,
  'guest progress warnings must stay independent from dismissible creation guides',
)
assert.equal(
  isOnboardingDisabled(userBOverviewKey, {storage: allStorage}),
  false,
  'disabling onboarding must remain scoped to the current account',
)
for (const legacyKey of Object.values(LEGACY_ONBOARDING_KEYS).filter(Boolean)) {
  assert.equal(
    allStorage.getItem(legacyKey),
    null,
    'new preferences must not recreate global legacy keys',
  )
}

allStorage.setItem('unrelated-value', 'keep-out')
allStorage.setItem(LEGACY_ONBOARDING_KEYS.bottles, '1')
const captured = captureOnboardingPreferences(allStorage)
allStorage.clear()
assert.equal(restoreOnboardingPreferences(captured, allStorage), true)
assert.equal(allStorage.getItem('unrelated-value'), null)
assert.equal(
  allStorage.getItem(LEGACY_ONBOARDING_KEYS.bottles),
  null,
  'logout must not carry an unscoped legacy preference into another account',
)
assert.equal(
  isOnboardingDisabled(userAOverviewKey, {storage: allStorage}),
  true,
  'logout cleanup must preserve onboarding choices',
)

const legacyLogoutStorage = new MemoryStorage([
  [LEGACY_ONBOARDING_KEYS.bottles, '1'],
])
const scopedLegacyPreferences = captureOnboardingPreferences(
  legacyLogoutStorage,
  {userId: 'user-a'},
)
legacyLogoutStorage.clear()
assert.equal(
  restoreOnboardingPreferences(scopedLegacyPreferences, legacyLogoutStorage),
  true,
)
assert.equal(legacyLogoutStorage.getItem(LEGACY_ONBOARDING_KEYS.bottles), null)
assert.equal(
  isOnboardingDisabled(
    getOnboardingPreferenceKey('user-a', ONBOARDING_GUIDES.bottles),
    {storage: legacyLogoutStorage},
  ),
  true,
  'logout must migrate legacy choices into the current account scope',
)

const unavailableStorage = {
  getItem() {
    throw new Error('STORAGE_UNAVAILABLE')
  },
  setItem() {
    throw new Error('STORAGE_UNAVAILABLE')
  },
  removeItem() {
    throw new Error('STORAGE_UNAVAILABLE')
  },
}
const fallbackKey = getOnboardingPreferenceKey('user-a', ONBOARDING_GUIDES.bottles)
const fallbackCookie = `${getOnboardingCookieName(fallbackKey)}=1`

assert.doesNotThrow(() =>
  isOnboardingDisabled(fallbackKey, {
    storage: unavailableStorage,
  }),
)
assert.equal(
  disableOnboarding(fallbackKey, {
    storage: unavailableStorage,
    writeCookie: () => true,
  }),
  true,
)
assert.equal(
  isOnboardingDisabled(fallbackKey, {
    storage: unavailableStorage,
    cookieString: fallbackCookie,
  }),
  true,
  'the cookie fallback must preserve the preference when localStorage is unavailable',
)
assert.equal(
  disableOnboarding(fallbackKey, {
    storage: unavailableStorage,
    writeCookie: () => false,
  }),
  false,
)
assert.doesNotThrow(() =>
  disableOnboarding(fallbackKey, {
    storage: unavailableStorage,
    writeCookie: () => {
      throw new Error('COOKIE_WRITE_BLOCKED')
    },
  }),
)

const migrationStorage = new MemoryStorage([
  [LEGACY_ONBOARDING_KEYS.questionnaire, '1'],
])
const originalMigrationSetItem = migrationStorage.setItem.bind(migrationStorage)
migrationStorage.setItem = (key, value) => {
  if (key === userAQuestionnaireKey) throw new Error('MIGRATION_WRITE_BLOCKED')
  originalMigrationSetItem(key, value)
}
assert.equal(
  migrateLegacyOnboardingPreference(
    userAQuestionnaireKey,
    LEGACY_ONBOARDING_KEYS.questionnaire,
    {storage: migrationStorage},
  ),
  false,
)
assert.equal(
  migrationStorage.getItem(LEGACY_ONBOARDING_KEYS.questionnaire),
  '1',
  'a failed migration must keep the legacy preference for the next reload',
)

const partialStorage = new MemoryStorage()
const blockedGlobalKey = getOnboardingPreferenceKey('partial-user', ONBOARDING_GUIDES.all)
const originalPartialSetItem = partialStorage.setItem.bind(partialStorage)
partialStorage.setItem = (key, value) => {
  if (key === blockedGlobalKey) throw new Error('GLOBAL_WRITE_BLOCKED')
  originalPartialSetItem(key, value)
}
assert.equal(
  disableAllOnboarding('partial-user', {
    storage: partialStorage,
    writeCookie: () => false,
  }),
  false,
  'partial storage must not report that every guide was disabled',
)
assert.equal(isOnboardingDisabled(blockedGlobalKey, {storage: partialStorage}), false)

const individuallyDisabledStorage = new MemoryStorage()
assert.equal(
  disableOnboarding(userAQuestionnaireKey, {
    storage: individuallyDisabledStorage,
    writeCookie: () => false,
  }),
  true,
)
assert.equal(
  isOnboardingDisabled(
    getOnboardingPreferenceKey('user-a', ONBOARDING_GUIDES.bottles),
    {storage: individuallyDisabledStorage},
  ),
  false,
  'individual guide preferences must remain isolated',
)

Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    get cookie() {
      throw new Error('COOKIE_READ_BLOCKED')
    },
  },
})
assert.doesNotThrow(() =>
  isOnboardingDisabled(fallbackKey, {
    storage: unavailableStorage,
  }),
)
delete globalThis.document

console.log('Onboarding preference checks passed.')
