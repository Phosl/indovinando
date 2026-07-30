import assert from 'node:assert/strict'
import {
  createAppDataRequestCoordinator,
  createAppDataSessionGuard,
  isAppDataProfilePatchSatisfied,
  patchAppDataProfileSnapshot,
} from '../src/lib/appDataSessionGuard.mjs'

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return {promise, reject, resolve}
}

const staleProfileSnapshot = {
  user: {id: 'user-a'},
  profile: {username: 'Andrea', profile_prompt_dismissed_at: null},
}
const confirmedDismissal = {profile_prompt_dismissed_at: '2026-07-30T12:00:00.000Z'}
const patchedProfileSnapshot = patchAppDataProfileSnapshot(
  staleProfileSnapshot,
  confirmedDismissal,
  'user-a',
)

assert.notEqual(
  patchedProfileSnapshot,
  staleProfileSnapshot,
  'a verified profile patch must create a new app-data snapshot',
)
assert.equal(
  patchedProfileSnapshot.profile.profile_prompt_dismissed_at,
  confirmedDismissal.profile_prompt_dismissed_at,
  'a verified dismissal must replace a stale cached reminder value',
)
assert.equal(
  patchAppDataProfileSnapshot(
    {user: {id: 'user-b'}, profile: null},
    confirmedDismissal,
    'user-b',
  )
    .profile.profile_prompt_dismissed_at,
  confirmedDismissal.profile_prompt_dismissed_at,
  'a verified patch must also seed a missing profile cache',
)
assert.equal(
  patchAppDataProfileSnapshot(null, confirmedDismissal, 'user-a'),
  null,
  'a profile patch must not invent an app-data identity',
)
assert.equal(
  patchAppDataProfileSnapshot(staleProfileSnapshot, confirmedDismissal, 'user-b'),
  staleProfileSnapshot,
  'a verified patch must never cross an authenticated identity boundary',
)
assert.equal(
  isAppDataProfilePatchSatisfied(patchedProfileSnapshot, confirmedDismissal, 'user-a'),
  true,
  'a matching server snapshot may retire its verified profile patch',
)
assert.equal(
  isAppDataProfilePatchSatisfied(staleProfileSnapshot, confirmedDismissal, 'user-a'),
  false,
  'a stale response must keep the verified profile patch active',
)
assert.equal(
  isAppDataProfilePatchSatisfied(patchedProfileSnapshot, confirmedDismissal, 'user-b'),
  false,
  'a patch must never be satisfied by another authenticated identity',
)

const guard = createAppDataSessionGuard()
const oldUserRequest = guard.beginRequest()

guard.invalidate({expectedUserId: 'user-b'})

assert.equal(
  guard.accept(oldUserRequest, 'user-a'),
  false,
  'a response started before an auth change must be ignored',
)

const newUserRequest = guard.beginRequest()
assert.equal(
  guard.accept(newUserRequest, 'user-a'),
  false,
  'a response for the previous account must not satisfy the new account refresh',
)
assert.equal(
  guard.accept(newUserRequest, 'user-b'),
  true,
  'the expected account response must be accepted',
)
assert.equal(
  guard.accept(newUserRequest, 'user-a'),
  false,
  'an accepted account must remain the identity constraint for the current generation',
)

const logoutRequest = guard.invalidate({expectedUserId: null})
assert.equal(
  guard.matchesExpectedUser('user-b'),
  false,
  'authenticated data must not be accepted after logout invalidation',
)
assert.equal(
  guard.accept(logoutRequest, null),
  true,
  'an unauthenticated response must be accepted after logout',
)

const unrestrictedRequest = guard.invalidate()
assert.equal(
  guard.accept(unrestrictedRequest, 'user-c'),
  true,
  'a normal route re-entry may establish the current authenticated account',
)
assert.equal(
  guard.accept(unrestrictedRequest, 'user-d'),
  false,
  'an unrestricted request must bind later responses to the first accepted account',
)

let currentGeneration = 0
const coordinator = createAppDataRequestCoordinator({
  isCurrent: (generation) => generation === currentGeneration,
})
const firstLoad = createDeferred()
const secondLoad = createDeferred()
let loadCalls = 0
const load = () => {
  loadCalls += 1
  return loadCalls === 1 ? firstLoad.promise : secondLoad.promise
}

const activeRequest = coordinator.run({
  generation: currentGeneration,
  load,
})
const duplicateRequest = coordinator.run({
  generation: currentGeneration,
  load,
})
const queuedForceRequest = coordinator.run({
  generation: currentGeneration,
  force: true,
  load,
})
const duplicateForceRequest = coordinator.run({
  generation: currentGeneration,
  force: true,
  load,
})

assert.equal(activeRequest, duplicateRequest, 'normal refreshes must share the active request')
assert.equal(
  queuedForceRequest,
  duplicateForceRequest,
  'forced refreshes must share one queued revalidation',
)
await Promise.resolve()
assert.equal(loadCalls, 1, 'a force refresh must not start concurrently')
firstLoad.resolve('stale')
assert.equal(await activeRequest, 'stale')
const forceAfterActiveSettled = coordinator.run({
  generation: currentGeneration,
  force: true,
  load,
})
assert.equal(
  forceAfterActiveSettled,
  queuedForceRequest,
  'a force refresh at the active-request boundary must reuse the queued revalidation',
)
await new Promise((resolve) => setTimeout(resolve, 0))
assert.equal(loadCalls, 2, 'a forced refresh must run after the active request')
secondLoad.resolve('fresh')
assert.equal(await queuedForceRequest, 'fresh')

const boundaryCoordinator = createAppDataRequestCoordinator({
  isCurrent: () => true,
})
const boundaryFirstLoad = createDeferred()
const boundarySecondLoad = createDeferred()
let boundaryLoadCalls = 0
const boundaryLoad = () => {
  boundaryLoadCalls += 1
  return boundaryLoadCalls === 1
    ? boundaryFirstLoad.promise
    : boundarySecondLoad.promise
}
const boundaryActiveRequest = boundaryCoordinator.run({
  generation: 0,
  load: boundaryLoad,
})
const boundaryQueuedRequest = boundaryCoordinator.run({
  generation: 0,
  force: true,
  load: boundaryLoad,
})
boundaryFirstLoad.resolve('boundary-stale')
assert.equal(await boundaryActiveRequest, 'boundary-stale')
const boundaryInterveningRequest = boundaryCoordinator.run({
  generation: 0,
  load: boundaryLoad,
})
await new Promise((resolve) => setTimeout(resolve, 0))
assert.equal(
  boundaryLoadCalls,
  2,
  'a queued force refresh must coalesce with a request started at the settle boundary',
)
boundarySecondLoad.resolve('boundary-fresh')
assert.equal(await boundaryInterveningRequest, 'boundary-fresh')
assert.equal(await boundaryQueuedRequest, 'boundary-fresh')

currentGeneration = 1
const staleLoad = createDeferred()
let staleGenerationLoadCalls = 0
const staleRequest = coordinator.run({
  generation: currentGeneration,
  load() {
    staleGenerationLoadCalls += 1
    return staleLoad.promise
  },
})
const skippedForceRequest = coordinator.run({
  generation: currentGeneration,
  force: true,
  load() {
    staleGenerationLoadCalls += 1
    return Promise.resolve('must-not-run')
  },
})

currentGeneration = 2
staleLoad.resolve('obsolete')
assert.equal(await staleRequest, 'obsolete')
assert.equal(
  await skippedForceRequest,
  undefined,
  'a queued refresh from an invalidated identity must be discarded',
)
assert.equal(
  staleGenerationLoadCalls,
  1,
  'identity invalidation must prevent the queued network request',
)

console.log('App data session checks passed.')
