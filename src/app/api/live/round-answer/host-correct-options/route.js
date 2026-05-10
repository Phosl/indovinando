import {NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'

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

export async function POST(request) {
  try {
    const body = await request.json()
    const sessionId = String(body?.sessionId ?? '').trim()
    const playerId = String(body?.playerId ?? '').trim()
    const bottleId = String(body?.bottleId ?? '').trim()

    if (!sessionId || !playerId || !bottleId) {
      return NextResponse.json({error: 'Missing required fields'}, {status: 400})
    }

    const admin = createAdminClient()

    const {data: session, error: sessionError} = await admin
      .from('live_sessions')
      .select('id, host_user_id')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({error: 'Session not found'}, {status: 404})
    }

    const {data: hostPlayer, error: playerError} = await admin
      .from('live_players')
      .select('id, session_id, user_id, is_host')
      .eq('id', playerId)
      .eq('session_id', sessionId)
      .maybeSingle()

    if (playerError || !hostPlayer) {
      return NextResponse.json({error: 'Host player not found in session'}, {status: 404})
    }

    if (!hostPlayer.is_host || !hostPlayer.user_id || hostPlayer.user_id !== session.host_user_id) {
      return NextResponse.json({error: 'Player is not the host for this session'}, {status: 403})
    }

    const {data: rows, error: rowsError} = await admin
      .from('game_bottle_answers')
      .select('question_id, option_id')
      .eq('bottle_id', bottleId)

    if (rowsError) {
      return NextResponse.json({error: rowsError.message}, {status: 500})
    }

    const map = {}
    ;(rows || []).forEach((row) => {
      if (row?.question_id && row?.option_id) {
        map[row.question_id] = row.option_id
      }
    })

    return NextResponse.json({ok: true, map})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
