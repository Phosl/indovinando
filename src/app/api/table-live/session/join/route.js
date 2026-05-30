import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createClient} from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function createWriteClient(fallback) {
  if (SUPABASE_URL && SERVICE_ROLE_KEY) {
    return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {persistSession: false, autoRefreshToken: false},
    })
  }
  return fallback
}

function isExpired(session, timeoutMinutes) {
  const lastActivity = new Date(session.last_activity_at).getTime()
  const now = Date.now()
  return now - lastActivity > timeoutMinutes * 60 * 1000
}

export async function POST(request) {
  try {
    const body = await request.json()
    const eventSlug = String(body?.eventSlug || '').trim()
    const joinCode = String(body?.joinCode || '').trim()
    const nickname = String(body?.nickname || '').trim()

    if (!eventSlug || !joinCode || !nickname) {
      return NextResponse.json({error: 'Missing required fields'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await supabase.auth.getUser()
    const userId = user?.id || null

    const db = createWriteClient(supabase)

    const {data: event, error: eventError} = await db
      .from('table_live_events')
      .select('id, inactivity_timeout_minutes, status')
      .eq('slug', eventSlug)
      .maybeSingle()

    if (eventError || !event || event.status !== 'active') {
      return NextResponse.json({error: 'Event not found or inactive'}, {status: 404})
    }

    const {data: session, error: sessionError} = await db
      .from('table_live_sessions')
      .select('id, join_code, status, last_activity_at')
      .eq('event_id', event.id)
      .eq('join_code', joinCode)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({error: 'Session not found'}, {status: 404})
    }

    if (session.status === 'finished' || session.status === 'expired') {
      return NextResponse.json({error: 'Session closed'}, {status: 409})
    }

    if (isExpired(session, event.inactivity_timeout_minutes || 15)) {
      await db
        .from('table_live_sessions')
        .update({status: 'expired', updated_at: new Date().toISOString()})
        .eq('id', session.id)
      return NextResponse.json({error: 'Session expired'}, {status: 409})
    }

    const {data: existingNick} = await db
      .from('table_live_players')
      .select('id')
      .eq('session_id', session.id)
      .eq('nickname', nickname)
      .maybeSingle()

    if (existingNick) {
      return NextResponse.json({error: 'Nickname already used in this session'}, {status: 409})
    }

    const playerToken = crypto.randomUUID()
    const {data: player, error: playerError} = await db
      .from('table_live_players')
      .insert({
        session_id: session.id,
        user_id: userId,
        nickname,
        player_token: playerToken,
        is_active: true,
      })
      .select('id, nickname')
      .maybeSingle()

    if (playerError || !player) {
      return NextResponse.json({error: playerError?.message || 'Failed to join session'}, {status: 500})
    }

    await db
      .from('table_live_sessions')
      .update({last_activity_at: new Date().toISOString(), updated_at: new Date().toISOString()})
      .eq('id', session.id)

    return NextResponse.json({
      sessionId: session.id,
      joinCode: session.join_code,
      playerId: player.id,
      playerToken,
      nickname: player.nickname,
    })
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
