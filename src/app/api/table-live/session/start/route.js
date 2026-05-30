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

export async function POST(request) {
  try {
    const body = await request.json()
    const sessionId = String(body?.sessionId || '').trim()
    const playerId = String(body?.playerId || '').trim()
    const playerToken = String(body?.playerToken || '').trim()

    if (!sessionId || !playerId || !playerToken) {
      return NextResponse.json({error: 'Missing required fields'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const db = createWriteClient(supabase)

    const {data: session, error: sessionError} = await db
      .from('table_live_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({error: 'Session not found'}, {status: 404})
    }

    if (session.status !== 'lobby') {
      return NextResponse.json({error: 'Session already started'}, {status: 409})
    }

    const {data: players, error: playersError} = await db
      .from('table_live_players')
      .select('id, player_token, joined_at')
      .eq('session_id', sessionId)
      .order('joined_at', {ascending: true})

    if (playersError || !players?.length) {
      return NextResponse.json({error: 'No players in session'}, {status: 409})
    }

    const requester = players.find((p) => p.id === playerId && p.player_token === playerToken)
    if (!requester) {
      return NextResponse.json({error: 'Player auth failed'}, {status: 403})
    }

    const host = players[0]
    if (!host || host.id !== playerId) {
      return NextResponse.json({error: 'Only host can start'}, {status: 403})
    }

    const {error: updateError} = await db
      .from('table_live_sessions')
      .update({
        status: 'playing',
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      return NextResponse.json({error: updateError.message}, {status: 500})
    }

    return NextResponse.json({ok: true})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}

