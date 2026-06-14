import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createAdminSupabase} from '@/lib/supabaseAdmin'

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
    const db = createAdminSupabase()

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
