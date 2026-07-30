function normalizeUserId(userId) {
  const normalized = String(userId || '').trim()
  return normalized || null
}

export function createAppDataSessionGuard() {
  let generation = 0
  let expectedUserId

  return Object.freeze({
    beginRequest() {
      return generation
    },

    invalidate(options = {}) {
      generation += 1
      expectedUserId = Object.prototype.hasOwnProperty.call(options, 'expectedUserId')
        ? normalizeUserId(options.expectedUserId)
        : undefined
      return generation
    },

    isCurrent(requestGeneration) {
      return requestGeneration === generation
    },

    matchesExpectedUser(userId) {
      return expectedUserId === undefined || normalizeUserId(userId) === expectedUserId
    },

    accept(requestGeneration, userId) {
      if (requestGeneration !== generation) return false
      if (expectedUserId !== undefined && normalizeUserId(userId) !== expectedUserId) {
        return false
      }

      expectedUserId = undefined
      return true
    },
  })
}
