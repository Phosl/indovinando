function normalizeUserId(userId) {
  const normalized = String(userId || '').trim()
  return normalized || null
}

export function createAppDataSessionGuard() {
  let generation = 0
  let constrainedUserId

  return Object.freeze({
    beginRequest() {
      return generation
    },

    invalidate(options = {}) {
      generation += 1
      constrainedUserId = Object.prototype.hasOwnProperty.call(options, 'expectedUserId')
        ? normalizeUserId(options.expectedUserId)
        : undefined
      return generation
    },

    isCurrent(requestGeneration) {
      return requestGeneration === generation
    },

    matchesExpectedUser(userId) {
      return constrainedUserId === undefined || normalizeUserId(userId) === constrainedUserId
    },

    accept(requestGeneration, userId) {
      if (requestGeneration !== generation) return false
      const normalizedUserId = normalizeUserId(userId)
      if (constrainedUserId !== undefined && normalizedUserId !== constrainedUserId) {
        return false
      }

      constrainedUserId = normalizedUserId
      return true
    },
  })
}
