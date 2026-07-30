const DEFAULT_TIMEOUT_MS = 12000

async function persistPreference(preference, {keepalive = false} = {}) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch('/api/profile/onboarding', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({preference}),
      keepalive,
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error('PROFILE_ONBOARDING_PREFERENCE_FAILED')
    }

    return true
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('PROFILE_SAVE_TIMEOUT')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export function disableCreateOnboarding() {
  return persistPreference('create-overview', {keepalive: true})
}

export function dismissProfileSetupPrompt() {
  return persistPreference('profile-reminder')
}
