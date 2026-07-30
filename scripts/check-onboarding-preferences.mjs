import assert from 'node:assert/strict'
import {
  captureOnboardingPreferences,
  disableAllOnboarding,
  disableOnboarding,
  getOnboardingCookieName,
  getOnboardingPreferenceKey,
  hasSeenOnboardingThisSession,
  isOnboardingDisabled,
  isOnboardingPersistenceConfirmed,
  LEGACY_ONBOARDING_KEYS,
  markOnboardingSeenThisSession,
  migrateLegacyOnboardingPreference,
  ONBOARDING_GUIDES,
  restoreOnboardingPreferences,
} from '../src/lib/onboardingPreferences.mjs'
import {
  createOnboardingRemotePersistenceCoordinator,
  persistOnboardingDismissal,
} from '../src/lib/onboardingRemotePersistence.mjs'
import {shouldAutoOpenCreateOnboarding} from '../src/lib/createOnboardingGate.mjs'

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

assert.equal(
  isOnboardingPersistenceConfirmed({
    requiresRemote: true,
    persistedOnDevice: true,
    persistedRemotely: false,
  }),
  false,
  'an account preference must not report success when only device storage succeeded',
)
assert.equal(
  isOnboardingPersistenceConfirmed({
    requiresRemote: true,
    persistedOnDevice: false,
    persistedRemotely: true,
  }),
  true,
  'a verified account write must remain authoritative when browser storage is blocked',
)
assert.equal(
  isOnboardingPersistenceConfirmed({
    requiresRemote: false,
    persistedOnDevice: true,
    persistedRemotely: false,
  }),
  true,
  'a device-only preference must require a confirmed device write',
)
assert.equal(
  isOnboardingPersistenceConfirmed({
    requiresRemote: false,
    persistedOnDevice: false,
    persistedRemotely: true,
  }),
  false,
  'a device-only preference must not claim success without local persistence',
)

const remoteCoordinator = createOnboardingRemotePersistenceCoordinator()
let remoteCalls = 0
let resolveRemoteRequest
const pendingRemoteRequest = new Promise((resolve) => {
  resolveRemoteRequest = resolve
})
const firstRemoteRequest = remoteCoordinator.persist('user-a:all', () => {
  remoteCalls += 1
  return pendingRemoteRequest
})
const duplicateRemoteRequest = remoteCoordinator.persist('user-a:all', () => {
  remoteCalls += 1
  return Promise.resolve(true)
})

assert.equal(
  firstRemoteRequest,
  duplicateRemoteRequest,
  'concurrent preference writes must share the same request',
)
assert.equal(remoteCalls, 0, 'the remote write starts in the next microtask')
resolveRemoteRequest(true)
assert.deepEqual(await Promise.all([firstRemoteRequest, duplicateRemoteRequest]), [
  true,
  true,
])
assert.equal(remoteCalls, 1, 'concurrent preference writes must call the server once')
assert.equal(remoteCoordinator.hasPersisted('user-a:all'), true)
assert.equal(remoteCoordinator.hasRequestInFlight('user-a:all'), false)

await remoteCoordinator.persist('user-a:all', () => {
  remoteCalls += 1
  return Promise.resolve(true)
})
assert.equal(remoteCalls, 1, 'a confirmed remote preference must not be written twice')

let failedRemoteCalls = 0
await assert.rejects(
  remoteCoordinator.persist('user-b:all', () => {
    failedRemoteCalls += 1
    return Promise.resolve(false)
  }),
  /ONBOARDING_PREFERENCE_NOT_PERSISTED/,
)
assert.equal(remoteCoordinator.hasPersisted('user-b:all'), false)
assert.equal(remoteCoordinator.hasRequestInFlight('user-b:all'), false)
assert.equal(
  await remoteCoordinator.persist('user-b:all', () => {
    failedRemoteCalls += 1
    return Promise.resolve(true)
  }),
  true,
  'a failed remote preference must remain retryable',
)
assert.equal(failedRemoteCalls, 2)

let deviceWritesAfterRemoteFailure = 0
await assert.rejects(
  persistOnboardingDismissal({
    syncKey: 'user-c:all',
    persistOnDevice() {
      deviceWritesAfterRemoteFailure += 1
      return true
    },
    persistRemotely() {
      return Promise.resolve(false)
    },
    remotePersistence: createOnboardingRemotePersistenceCoordinator(),
  }),
  /ONBOARDING_PREFERENCE_NOT_PERSISTED/,
)
assert.equal(
  deviceWritesAfterRemoteFailure,
  0,
  'a failed account write must not leave a device preference that hides the guide after reload',
)

let deviceWritesWithoutRemotePersistence = 0
await assert.rejects(
  persistOnboardingDismissal({
    syncKey: 'user-missing-remote:all',
    requiresRemote: true,
    persistOnDevice() {
      deviceWritesWithoutRemotePersistence += 1
      return true
    },
    remotePersistence: createOnboardingRemotePersistenceCoordinator(),
  }),
  /ONBOARDING_REMOTE_PERSISTENCE_NOT_CONFIGURED/,
)
assert.equal(
  deviceWritesWithoutRemotePersistence,
  0,
  'an account guide must stay visible when its remote persistence callback is missing',
)

let deviceWritesAfterRemoteSuccess = 0
assert.equal(
  await persistOnboardingDismissal({
    syncKey: 'user-d:all',
    persistOnDevice() {
      deviceWritesAfterRemoteSuccess += 1
      return true
    },
    persistRemotely() {
      return Promise.resolve(true)
    },
    remotePersistence: createOnboardingRemotePersistenceCoordinator(),
  }),
  true,
)
assert.equal(
  deviceWritesAfterRemoteSuccess,
  1,
  'a verified account write must persist the matching device preference once',
)

assert.equal(
  shouldAutoOpenCreateOnboarding({
    profile: {onboarding: true},
    createdGamesCount: 0,
  }),
  true,
  'the create onboarding may open only from an explicit profile preference and a verified zero count',
)
assert.equal(
  shouldAutoOpenCreateOnboarding({
    profile: {onboarding: false},
    createdGamesCount: 0,
  }),
  false,
  'a disabled server preference must keep onboarding closed',
)
assert.equal(
  shouldAutoOpenCreateOnboarding({
    profile: {onboarding: true},
    createdGamesCount: 1,
  }),
  false,
  'existing games must keep onboarding closed',
)
assert.equal(
  shouldAutoOpenCreateOnboarding({
    profile: null,
    createdGamesCount: 0,
  }),
  false,
  'a missing profile must fail closed',
)
assert.equal(
  shouldAutoOpenCreateOnboarding({
    profile: {onboarding: null},
    createdGamesCount: 0,
  }),
  false,
  'an unverified profile preference must fail closed',
)
assert.equal(
  shouldAutoOpenCreateOnboarding({
    profile: {onboarding: true},
    profileError: {code: 'PROFILE_READ_FAILED'},
    createdGamesCount: 0,
  }),
  false,
  'a profile query error must fail closed even when partial data is present',
)
assert.equal(
  shouldAutoOpenCreateOnboarding({
    profile: {onboarding: true},
    createdGamesCount: null,
  }),
  false,
  'a missing exact count must fail closed',
)
assert.equal(
  shouldAutoOpenCreateOnboarding({
    profile: {onboarding: true},
    createdGamesCount: 0,
    gamesCountError: {code: 'COUNT_FAILED'},
  }),
  false,
  'a count query error must fail closed',
)
assert.equal(
  shouldAutoOpenCreateOnboarding({
    profile: {onboarding: true},
    createdGamesCount: '0',
  }),
  false,
  'a non-numeric count must not be treated as verified',
)

console.log('Onboarding preference checks passed.')
