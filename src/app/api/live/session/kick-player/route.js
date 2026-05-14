import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createClient} from '@supabase/supabase-js'

function createWriteClient(fallback) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key)
    return createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}})
  return fallback
}

// POST /api/live/session/kick-player
// Body: { sessionId, playerId }
// Host-only: removes a participant from the live session.
export async function POST(request) {
  try {
    const {sessionId, playerId} = await request.json()
    const trimmedSessionId = String(sessionId ?? '').trim()
    const trimmedPlayerId = String(playerId ?? '').trim()

    if (!trimmedSessionId || !trimmedPlayerId) {
      return NextResponse.json({error: 'Missing required fields'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const db = createWriteClient(supabase)

    const {data: session, error: sessionError} = await db
      .from('live_sessions')
      .select('id, host_user_id')
      .eq('id', trimmedSessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({error: 'Session not found'}, {status: 404})
    }

    if (session.host_user_id !== user.id) {
      return NextResponse.json({error: 'Only the host can remove players'}, {status: 403})
    }

    const {data: targetPlayer, error: playerError} = await db
      .from('live_players')
      .select('id, is_host')
      .eq('id', trimmedPlayerId)
      .eq('session_id', trimmedSessionId)
      .maybeSingle()

    if (playerError || !targetPlayer) {
      return NextResponse.json({error: 'Player not found in session'}, {status: 404})
    }

    if (targetPlayer.is_host) {
      return NextResponse.json({error: 'Host cannot be removed'}, {status: 400})
    }

    const {error: deleteError} = await db
      .from('live_players')
      .delete()
      .eq('id', trimmedPlayerId)
      .eq('session_id', trimmedSessionId)

    if (deleteError) {
      return NextResponse.json({error: deleteError.message}, {status: 500})
    }

    return NextResponse.json({ok: true})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
