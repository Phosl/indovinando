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
    const questionId = String(body?.questionId || '').trim()
    const selectedOptionId = String(body?.selectedOptionId || '').trim()

    if (!sessionId || !playerId || !playerToken || !questionId || !selectedOptionId) {
      return NextResponse.json({error: 'Missing required fields'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const db = createWriteClient(supabase)

    const {data: session, error: sessionError} = await db
      .from('table_live_sessions')
      .select('id, game_id, status, current_bottle_index')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({error: 'Session not found'}, {status: 404})
    }
    if (session.status !== 'playing') {
      return NextResponse.json({error: 'Session not in playing status'}, {status: 409})
    }

    const {data: player, error: playerError} = await db
      .from('table_live_players')
      .select('id')
      .eq('id', playerId)
      .eq('session_id', sessionId)
      .eq('player_token', playerToken)
      .maybeSingle()

    if (playerError || !player) {
      return NextResponse.json({error: 'Player auth failed'}, {status: 403})
    }

    const {data: bottleRows} = await db
      .from('game_bottles')
      .select('id')
      .eq('game_id', session.game_id)
      .order('bottle_order')
      .range(session.current_bottle_index, session.current_bottle_index)

    const bottleId = bottleRows?.[0]?.id
    if (!bottleId) {
      return NextResponse.json({error: 'Bottle not found for current round'}, {status: 400})
    }

    const {data: correctRow, error: correctError} = await db
      .from('game_bottle_answers')
      .select('option_id')
      .eq('bottle_id', bottleId)
      .eq('question_id', questionId)
      .maybeSingle()

    if (correctError || !correctRow?.option_id) {
      return NextResponse.json({error: 'Correct answer not configured'}, {status: 400})
    }

    const isCorrect = correctRow.option_id === selectedOptionId
    const points = isCorrect ? 10 : 0

    const {error: insertError} = await db.from('table_live_round_answers').upsert(
      {
        session_id: sessionId,
        player_id: playerId,
        bottle_index: session.current_bottle_index,
        question_id: questionId,
        selected_option_id: selectedOptionId,
        is_correct: isCorrect,
        points,
      },
      {
        onConflict: 'session_id,player_id,bottle_index,question_id',
      },
    )

    if (insertError) {
      return NextResponse.json({error: insertError.message}, {status: 500})
    }

    return NextResponse.json({ok: true, isCorrect, points})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}

