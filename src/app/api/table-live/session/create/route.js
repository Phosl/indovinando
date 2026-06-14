import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createAdminSupabase} from '@/lib/supabaseAdmin'

function randomJoinCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export async function POST(request) {
  try {
    const body = await request.json()
    const eventSlug = String(body?.eventSlug || '').trim()
    const nickname = String(body?.nickname || '').trim()
    const answerRevealMode = String(body?.answerRevealMode || 'instant')
      .trim()
      .toLowerCase()

    if (!eventSlug || !nickname) {
      return NextResponse.json({error: 'Missing required fields'}, {status: 400})
    }

    const normalizedAnswerRevealMode = answerRevealMode === 'end' ? 'end' : 'instant'

    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await supabase.auth.getUser()
    const userId = user?.id || null

    const db = createAdminSupabase()

    const {data: event, error: eventError} = await db
      .from('table_live_events')
      .select('id, game_id, status, inactivity_timeout_minutes')
      .eq('slug', eventSlug)
      .maybeSingle()

    if (eventError || !event || event.status !== 'active') {
      return NextResponse.json({error: 'Event not found or inactive'}, {status: 404})
    }

    let session = null
    for (let i = 0; i < 30; i++) {
      const joinCode = randomJoinCode()

      const {data, error} = await db
        .from('table_live_sessions')
        .insert({
          event_id: event.id,
          game_id: event.game_id,
          join_code: joinCode,
          status: 'lobby',
          current_bottle_index: 0,
          answer_reveal_mode: normalizedAnswerRevealMode,
          round_status: 'waiting_answers',
          last_activity_at: new Date().toISOString(),
        })
        .select('id, join_code, status')
        .maybeSingle()

      if (!error && data) {
        session = data
        break
      }

      if (error?.code !== '23505') {
        return NextResponse.json({error: error.message}, {status: 500})
      }
    }

    if (!session) {
      return NextResponse.json({error: 'Unable to generate join code'}, {status: 500})
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
      return NextResponse.json({error: playerError?.message || 'Failed to create player'}, {status: 500})
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
