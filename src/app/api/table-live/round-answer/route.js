import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createClient} from '@supabase/supabase-js'

function isNeutralQuestion(question) {
  return question?.is_neutral === true || String(question?.kind || '').trim().toLowerCase() === 'neutral'
}

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
      .select('id, game_id, status, current_bottle_index, answer_reveal_mode')
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
      .eq('is_active', true)
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

    const {data: currentQuestion, error: questionError} = await db
      .from('game_questions')
      .select('id, kind, is_neutral')
      .eq('id', questionId)
      .eq('game_id', session.game_id)
      .maybeSingle()

    if (questionError || !currentQuestion) {
      return NextResponse.json({error: 'Question not found'}, {status: 404})
    }

    const {data: selectedOption, error: optionError} = await db
      .from('game_question_options')
      .select('id')
      .eq('id', selectedOptionId)
      .eq('question_id', questionId)
      .maybeSingle()

    if (optionError || !selectedOption) {
      return NextResponse.json({error: 'Option not found for question'}, {status: 400})
    }

    const isNeutral = isNeutralQuestion(currentQuestion)
    let correctOptionId = null
    if (!isNeutral) {
      const {data: correctRow, error: correctError} = await db
        .from('game_bottle_answers')
        .select('option_id')
        .eq('bottle_id', bottleId)
        .eq('question_id', questionId)
        .maybeSingle()

      if (correctError || !correctRow?.option_id) {
        return NextResponse.json({error: 'Correct answer not configured'}, {status: 400})
      }

      correctOptionId = correctRow.option_id
    }

    const isCorrect = isNeutral ? null : correctOptionId === selectedOptionId
    const points = isCorrect === true ? 10 : 0

    const {data: existingAnswer, error: existingAnswerError} = await db
      .from('table_live_round_answers')
      .select('selected_option_id, is_correct, points')
      .eq('session_id', sessionId)
      .eq('player_id', playerId)
      .eq('bottle_index', session.current_bottle_index)
      .eq('question_id', questionId)
      .maybeSingle()

    if (existingAnswerError) {
      return NextResponse.json({error: existingAnswerError.message}, {status: 500})
    }

    const revealInstantly = session.answer_reveal_mode !== 'end'

    if (existingAnswer) {
      if (existingAnswer.selected_option_id !== selectedOptionId) {
        return NextResponse.json({error: 'Answer already submitted'}, {status: 409})
      }

      return NextResponse.json({
        ok: true,
        alreadySubmitted: true,
        isCorrect: revealInstantly
          ? isNeutral
            ? null
            : existingAnswer.is_correct === true
          : null,
        points: revealInstantly ? existingAnswer.points || 0 : 0,
        correctOptionId: revealInstantly ? correctOptionId : null,
        isNeutral,
      })
    }

    const {error: insertError} = await db.from('table_live_round_answers').insert({
      session_id: sessionId,
      player_id: playerId,
      bottle_index: session.current_bottle_index,
      question_id: questionId,
      selected_option_id: selectedOptionId,
      is_correct: isCorrect === true,
      points,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({error: 'Answer already submitted'}, {status: 409})
      }
      return NextResponse.json({error: insertError.message}, {status: 500})
    }

    return NextResponse.json({
      ok: true,
      isCorrect: revealInstantly ? isCorrect : null,
      points: revealInstantly ? points : 0,
      correctOptionId: revealInstantly ? correctOptionId : null,
      isNeutral,
    })
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
