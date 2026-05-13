import {NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import {createServerSupabase} from '@/lib/supabaseServer'

function createWriteClient(fallback) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key)
    return createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}})
  return fallback
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sessionId = String(body?.sessionId ?? '').trim()
    const playerId = String(body?.playerId ?? '').trim()
    const questionId = String(body?.questionId ?? '').trim()
    const selectedOptionId = String(body?.selectedOptionId ?? '').trim()
    const comboCount = Number.isFinite(Number(body?.comboCount)) ? Number(body.comboCount) : 0

    if (!sessionId || !playerId || !questionId || !selectedOptionId) {
      return NextResponse.json({error: 'Missing required fields'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const db = createWriteClient(supabase)

    const {data: session, error: sessionError} = await db
      .from('live_sessions')
      .select('id, host_user_id, game_id, current_question_index')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({error: 'Session not found'}, {status: 404})
    }

    const {data: hostPlayer, error: playerError} = await db
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

    const currentBottleIndex = Math.max(0, Number(session.current_question_index || 0))

    const {data: currentBottleRows, error: bottlesError} = await db
      .from('game_bottles')
      .select('id')
      .eq('game_id', session.game_id)
      .order('bottle_order')
      .range(currentBottleIndex, currentBottleIndex)

    if (bottlesError || !currentBottleRows?.length) {
      return NextResponse.json({error: 'No bottles available for this game'}, {status: 400})
    }

    const currentBottle = currentBottleRows[0]
    if (!currentBottle?.id) {
      return NextResponse.json({error: 'Invalid current bottle index'}, {status: 400})
    }

    const {data: correctRow, error: correctError} = await db
      .from('game_bottle_answers')
      .select('option_id')
      .eq('bottle_id', currentBottle.id)
      .eq('question_id', questionId)
      .maybeSingle()

    if (correctError || !correctRow?.option_id) {
      return NextResponse.json({error: 'Correct option not found for question'}, {status: 400})
    }

    const correctOptionId = correctRow.option_id
    const isCorrect = correctOptionId === selectedOptionId
    const newCombo = isCorrect ? comboCount + 1 : 0
    const comboBonus = isCorrect && newCombo >= 2 ? Math.min(newCombo - 1, 3) * 5 : 0
    const points = isCorrect ? 10 + comboBonus : 0

    const {error: answerError} = await db.from('live_round_answers').upsert(
      {
        session_id: sessionId,
        player_id: playerId,
        question_id: questionId,
        selected_option_id: selectedOptionId,
        is_correct: isCorrect,
        points,
      },
      {onConflict: 'session_id,player_id,question_id'},
    )

    if (answerError) {
      return NextResponse.json({error: answerError.message}, {status: 500})
    }

    return NextResponse.json({
      ok: true,
      isCorrect,
      points,
      comboBonus,
      newCombo,
      correctOptionId,
    })
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
