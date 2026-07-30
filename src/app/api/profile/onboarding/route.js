import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'

const SUPPORTED_PREFERENCES = new Set(['create-overview', 'profile-reminder'])

function logPreferenceError({preference, error}) {
  console.error(
    JSON.stringify({
      scope: 'profile_onboarding',
      operation: 'update_and_verify',
      resource: 'profiles',
      preference,
      code: error?.code || 'PREFERENCE_NOT_VERIFIED',
    }),
  )
}

async function getAuthenticatedContext() {
  const supabase = await createServerSupabase()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  return {supabase, user}
}

async function persistPreference({supabase, userId, preference}) {
  const timestamp = new Date().toISOString()
  const isCreatePreference = preference === 'create-overview'
  const update = isCreatePreference
    ? {onboarding: false, updated_at: timestamp}
    : {profile_prompt_dismissed_at: timestamp, updated_at: timestamp}
  const verificationColumn = isCreatePreference
    ? 'onboarding'
    : 'profile_prompt_dismissed_at'

  const {data, error} = await supabase
    .from('profiles')
    .upsert({id: userId, ...update}, {onConflict: 'id'})
    .select(verificationColumn)
    .maybeSingle()

  const verified = isCreatePreference
    ? data?.onboarding === false
    : Boolean(data?.profile_prompt_dismissed_at)

  if (error || !verified) {
    logPreferenceError({preference, error})
    return NextResponse.json(
      {error: 'Unable to save this preference right now'},
      {status: 503},
    )
  }

  return NextResponse.json({ok: true})
}

async function handlePreferenceRequest(request, {legacy = false} = {}) {
  let preference = legacy ? 'create-overview' : 'unknown'

  try {
    const {supabase, user} = await getAuthenticatedContext()
    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const payload = await request.json().catch(() => null)
    if (legacy) {
      if (payload?.hidden !== true) {
        return NextResponse.json({error: 'Invalid preference'}, {status: 400})
      }
    } else {
      preference = payload?.preference
      if (!SUPPORTED_PREFERENCES.has(preference)) {
        return NextResponse.json({error: 'Invalid preference'}, {status: 400})
      }
    }

    return persistPreference({supabase, userId: user.id, preference})
  } catch (error) {
    logPreferenceError({preference, error})
    return NextResponse.json(
      {error: 'Unable to save this preference right now'},
      {status: 503},
    )
  }
}

export function POST(request) {
  return handlePreferenceRequest(request)
}

export function PATCH(request) {
  return handlePreferenceRequest(request, {legacy: true})
}
