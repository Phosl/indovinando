import {isOnboardingPersistenceConfirmed} from './onboardingPreferences.mjs'

export function createOnboardingRemotePersistenceCoordinator() {
  const persistedKeys = new Set()
  const requestsInFlight = new Map()

  return Object.freeze({
    hasPersisted(syncKey) {
      return persistedKeys.has(syncKey)
    },

    hasRequestInFlight(syncKey) {
      return requestsInFlight.has(syncKey)
    },

    persist(syncKey, persistPreference) {
      if (!persistPreference) return Promise.resolve(false)
      if (persistedKeys.has(syncKey)) return Promise.resolve(true)

      const existingRequest = requestsInFlight.get(syncKey)
      if (existingRequest) return existingRequest

      const request = Promise.resolve()
        .then(() => persistPreference())
        .then((persisted) => {
          if (persisted !== true) {
            throw new Error('ONBOARDING_PREFERENCE_NOT_PERSISTED')
          }

          persistedKeys.add(syncKey)
          return true
        })
        .finally(() => {
          if (requestsInFlight.get(syncKey) === request) {
            requestsInFlight.delete(syncKey)
          }
        })

      requestsInFlight.set(syncKey, request)
      return request
    },
  })
}

export const onboardingRemotePersistence =
  createOnboardingRemotePersistenceCoordinator()

export async function persistOnboardingDismissal({
  syncKey,
  persistOnDevice,
  persistRemotely,
  requiresRemote = typeof persistRemotely === 'function',
  remotePersistence = onboardingRemotePersistence,
}) {
  let persistedRemotely = false

  if (requiresRemote) {
    if (typeof persistRemotely !== 'function') {
      throw new Error('ONBOARDING_REMOTE_PERSISTENCE_NOT_CONFIGURED')
    }
    persistedRemotely = await remotePersistence.persist(syncKey, persistRemotely)
  }

  let persistedOnDevice = false
  try {
    persistedOnDevice = persistOnDevice?.() === true
  } catch {
    persistedOnDevice = false
  }

  return isOnboardingPersistenceConfirmed({
    requiresRemote,
    persistedOnDevice,
    persistedRemotely,
  })
}
