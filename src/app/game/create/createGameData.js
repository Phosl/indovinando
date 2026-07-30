import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getGameAvatarOptions} from '@/lib/gameAvatarOptions'
import {normalizeAiScanCredits} from '@/lib/aiScanCredits'
import {shouldAutoOpenCreateOnboarding} from '@/lib/createOnboardingGate.mjs'

async function runSupabaseQuery(queryFactory) {
  try {
    const result = await queryFactory()
    if (result && typeof result === 'object') return result
  } catch (error) {
    return {data: null, count: null, error}
  }

  return {
    data: null,
    count: null,
    error: {code: 'UNVERIFIED_QUERY_RESULT'},
  }
}

function logOnboardingGateFallback({operation, resource, error, fallbackCode}) {
  console.error(
    JSON.stringify({
      scope: 'create_onboarding_gate',
      operation,
      resource,
      code: error?.code || fallbackCode,
    }),
  )
}

export async function getCreateGameData() {
  const supabase = await createServerSupabase()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const profileResult = await runSupabaseQuery(() =>
    supabase
      .from('profiles')
      .select('onboarding, ai_scan_credits_total, ai_scan_credits_bonus, ai_scan_credits_used')
      .eq('id', user.id)
      .maybeSingle(),
  )
  const gamesCountResult = await runSupabaseQuery(() =>
    supabase
      .from('games')
      .select('id', {count: 'exact', head: true})
      .eq('created_by', user.id),
  )
  const {data: profile = null, error: profileError = null} = profileResult
  const {count: createdGamesCount = null, error: gamesCountError = null} =
    gamesCountResult

  const profileGateIsVerified =
    !profileError && profile && typeof profile.onboarding === 'boolean'
  if (!profileGateIsVerified) {
    logOnboardingGateFallback({
      operation: 'read_profile_preference',
      resource: 'profiles',
      error: profileError,
      fallbackCode: profile ? 'ONBOARDING_NOT_VERIFIED' : 'PROFILE_NOT_FOUND',
    })
  }

  const gamesCountIsVerified =
    !gamesCountError &&
    Number.isInteger(createdGamesCount) &&
    createdGamesCount >= 0
  if (!gamesCountIsVerified) {
    logOnboardingGateFallback({
      operation: 'count_created_games',
      resource: 'games',
      error: gamesCountError,
      fallbackCode: 'COUNT_NOT_VERIFIED',
    })
  }

  const shouldShowOnboarding = shouldAutoOpenCreateOnboarding({
    profile,
    profileError,
    createdGamesCount,
    gamesCountError,
  })
  const avatarOptions = await getGameAvatarOptions()

  return {
    userId: user.id,
    initialShowOnboarding: shouldShowOnboarding,
    avatarOptions,
    initialAiScanCredits: normalizeAiScanCredits(profile || {}),
  }
}
