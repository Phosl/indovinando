import assert from 'node:assert/strict'
import {createAppDataSessionGuard} from '../src/lib/appDataSessionGuard.mjs'

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

console.log('App data session checks passed.')
