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
          if (persisted === false) {
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
