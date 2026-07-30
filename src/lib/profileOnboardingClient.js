const DEFAULT_TIMEOUT_MS = 12000

async function persistPreference(
  preference,
  {keepalive = false, expectedUserId = null} = {},
) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch('/api/profile/onboarding', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        preference,
        ...(expectedUserId ? {expectedUserId} : {}),
      }),
      keepalive,
      signal: controller.signal,
    })
    const result = await response.json().catch(() => null)

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error('PROFILE_AUTH_IDENTITY_CHANGED')
      }
      throw new Error('PROFILE_ONBOARDING_PREFERENCE_FAILED')
    }

    if (!result?.ok) {
      throw new Error('PROFILE_ONBOARDING_PREFERENCE_FAILED')
    }

    return result
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('PROFILE_SAVE_TIMEOUT')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function disableCreateOnboarding() {
  await persistPreference('create-overview', {keepalive: true})
  return true
}

export async function dismissProfileSetupPrompt(expectedUserId) {
  const normalizedExpectedUserId = String(expectedUserId || '').trim()
  if (!normalizedExpectedUserId) {
    throw new Error('PROFILE_AUTH_IDENTITY_UNAVAILABLE')
  }

  const result = await persistPreference('profile-reminder', {
    expectedUserId: normalizedExpectedUserId,
  })

  if (
    result.userId !== normalizedExpectedUserId ||
    !result.value
  ) {
    throw new Error('PROFILE_AUTH_IDENTITY_CHANGED')
  }

  return result.value
}
