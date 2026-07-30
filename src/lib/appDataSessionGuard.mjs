function normalizeUserId(userId) {
  const normalized = String(userId || '').trim()
  return normalized || null
}

export function patchAppDataProfileSnapshot(snapshot, profilePatch, expectedUserId) {
  const normalizedExpectedUserId = normalizeUserId(expectedUserId)
  if (
    !normalizedExpectedUserId ||
    normalizeUserId(snapshot?.user?.id) !== normalizedExpectedUserId ||
    !profilePatch ||
    typeof profilePatch !== 'object' ||
    Array.isArray(profilePatch)
  ) {
    return snapshot
  }

  return {
    ...snapshot,
    profile: {
      ...(snapshot.profile || {}),
      ...profilePatch,
    },
  }
}

export function isAppDataProfilePatchSatisfied(snapshot, profilePatch, expectedUserId) {
  const normalizedExpectedUserId = normalizeUserId(expectedUserId)
  if (
    !normalizedExpectedUserId ||
    normalizeUserId(snapshot?.user?.id) !== normalizedExpectedUserId ||
    !profilePatch ||
    typeof profilePatch !== 'object' ||
    Array.isArray(profilePatch)
  ) {
    return false
  }

  return Object.entries(profilePatch).every(([key, value]) =>
    Object.is(snapshot.profile?.[key], value),
  )
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

export function createAppDataRequestCoordinator({isCurrent}) {
  let activeRequest = null
  let queuedForceRequest = null

  function start({generation, load}) {
    let promise
    promise = Promise.resolve()
      .then(load)
      .finally(() => {
        if (activeRequest?.promise === promise) {
          activeRequest = null
        }
      })

    activeRequest = {generation, promise}
    return promise
  }

  function run({generation, force = false, load}) {
    if (force && queuedForceRequest?.generation === generation) {
      return queuedForceRequest.promise
    }

    if (activeRequest?.generation !== generation) {
      return start({generation, load})
    }

    if (!force) return activeRequest.promise

    const currentRequest = activeRequest.promise
    let promise
    promise = currentRequest
      .catch(() => undefined)
      .then(() => {
        if (!isCurrent(generation)) return undefined
        if (activeRequest?.generation === generation) {
          return activeRequest.promise
        }
        return start({generation, load})
      })
      .finally(() => {
        if (queuedForceRequest?.promise === promise) {
          queuedForceRequest = null
        }
      })

    queuedForceRequest = {generation, promise}
    return promise
  }

  return Object.freeze({
    hasActive(generation) {
      return activeRequest?.generation === generation
    },
    run,
  })
}
