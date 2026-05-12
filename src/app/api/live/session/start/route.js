import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createClient} from '@supabase/supabase-js'
import {profileAvatarToGameId} from '@/lib/avatarUtils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function createAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase service credentials')
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {persistSession: false, autoRefreshToken: false},
  })
}

async function resolveHostAvatarId(admin, userId) {
  const {data: profile} = await admin.from('profiles').select('avatar_emoji').eq('id', userId).maybeSingle()
  return profileAvatarToGameId(profile?.avatar_emoji)
}

export async function POST(request) {
  try {
    const {sessionId} = await request.json()
    const trimmedSessionId = String(sessionId ?? '').trim()

    if (!trimmedSessionId) {
      return NextResponse.json({error: 'Missing session id'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const {data: session, error: sessionError} = await supabase
      .from('live_sessions')
      .select('id, host_user_id, status')
      .eq('id', trimmedSessionId)
      .eq('host_user_id', user.id)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({error: 'Session not found'}, {status: 404})
    }

    const admin = createAdminClient()
    const hostAvatarId = await resolveHostAvatarId(admin, user.id)

    const {data: existingHostPlayer, error: hostPlayerError} = await admin
      .from('live_players')
      .select('id, avatar_id')
      .eq('session_id', trimmedSessionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (hostPlayerError) {
      return NextResponse.json({error: hostPlayerError.message}, {status: 500})
    }

    if (existingHostPlayer) {
      const nextAvatarId = existingHostPlayer.avatar_id || hostAvatarId || 1
      const {error: updateHostError} = await admin
        .from('live_players')
        .update({nickname: 'Host', avatar_id: nextAvatarId, is_host: true})
        .eq('id', existingHostPlayer.id)

      if (updateHostError) {
        return NextResponse.json({error: updateHostError.message}, {status: 500})
      }
    } else {
      const {data: existingHostNicknamePlayer, error: hostNicknameError} = await admin
        .from('live_players')
        .select('id')
        .eq('session_id', trimmedSessionId)
        .eq('nickname', 'Host')
        .maybeSingle()

      if (hostNicknameError) {
        return NextResponse.json({error: hostNicknameError.message}, {status: 500})
      }

      if (existingHostNicknamePlayer) {
        const {error: claimHostError} = await admin
          .from('live_players')
          .update({user_id: user.id, avatar_id: hostAvatarId || 1, is_host: true})
          .eq('id', existingHostNicknamePlayer.id)

        if (claimHostError) {
          return NextResponse.json({error: claimHostError.message}, {status: 500})
        }
      } else {
        const {error: insertHostError} = await admin.from('live_players').insert({
          session_id: trimmedSessionId,
          nickname: 'Host',
          avatar_id: hostAvatarId || 1,
          user_id: user.id,
          is_host: true,
        })

        if (insertHostError) {
          if (insertHostError.code !== '23505') {
            return NextResponse.json({error: insertHostError.message}, {status: 500})
          }

          // Another concurrent start request created the Host row first.
          const {data: racedHostPlayer, error: racedHostError} = await admin
            .from('live_players')
            .select('id')
            .eq('session_id', trimmedSessionId)
            .eq('nickname', 'Host')
            .maybeSingle()

          if (racedHostError || !racedHostPlayer) {
            return NextResponse.json(
              {error: racedHostError?.message || insertHostError.message},
              {status: 500},
            )
          }

          const {error: recoverHostError} = await admin
            .from('live_players')
            .update({user_id: user.id, avatar_id: hostAvatarId || 1, is_host: true})
            .eq('id', racedHostPlayer.id)

          if (recoverHostError) {
            return NextResponse.json({error: recoverHostError.message}, {status: 500})
          }
        }
      }
    }

    const {error: updateError} = await admin
      .from('live_sessions')
      .update({
        status: 'playing',
        started_at: new Date().toISOString(),
        round_status: 'waiting_answers',
        updated_at: new Date().toISOString(),
      })
      .eq('id', trimmedSessionId)
      .eq('host_user_id', user.id)

    if (updateError) {
      return NextResponse.json({error: updateError.message}, {status: 500})
    }

    return NextResponse.json({ok: true, sessionId: trimmedSessionId})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
