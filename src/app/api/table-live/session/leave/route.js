import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createAdminSupabaseOrFallback} from '@/lib/supabaseAdmin'

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
    const db = createAdminSupabaseOrFallback(supabase)

    const {data: session, error: sessionError} = await db
      .from('table_live_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({error: 'Session not found'}, {status: 404})
    }

    const {data: players, error: playersError} = await db
      .from('table_live_players')
      .select('id, player_token, joined_at')
      .eq('session_id', sessionId)
      .order('joined_at', {ascending: true})

    if (playersError || !players?.length) {
      return NextResponse.json({error: 'No players in session'}, {status: 409})
    }

    const requester = players.find(
      (player) => player.id === playerId && player.player_token === playerToken,
    )
    if (!requester) {
      return NextResponse.json({error: 'Player auth failed'}, {status: 403})
    }

    const isHost = players[0]?.id === requester.id
    const shouldCloseSession =
      isHost && session.status !== 'finished' && session.status !== 'expired'

    if (shouldCloseSession) {
      const now = new Date().toISOString()
      const {error: closeError} = await db
        .from('table_live_sessions')
        .update({status: 'expired', updated_at: now, last_activity_at: now})
        .eq('id', sessionId)
      if (closeError) {
        return NextResponse.json({error: closeError.message}, {status: 500})
      }

      const {error: deactivateError} = await db
        .from('table_live_players')
        .update({is_active: false, last_seen_at: now})
        .eq('session_id', sessionId)
      if (deactivateError) {
        return NextResponse.json({error: deactivateError.message}, {status: 500})
      }
    } else {
      const {error: deactivateError} = await db
        .from('table_live_players')
        .update({is_active: false, last_seen_at: new Date().toISOString()})
        .eq('id', requester.id)
      if (deactivateError) {
        return NextResponse.json({error: deactivateError.message}, {status: 500})
      }
    }

    return NextResponse.json({ok: true, sessionClosed: shouldCloseSession})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
