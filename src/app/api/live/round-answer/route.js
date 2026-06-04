import {NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'

function isNeutralQuestion(question) {
  return question?.is_neutral === true || String(question?.kind || '').trim().toLowerCase() === 'neutral'
}

function createWriteClient(fallback) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key)
    return createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}})
  return fallback
}

/**
 * POST /api/live/round-answer
 *
 * Persists a single player answer. Uses the service-role key so it works
 * regardless of browser-side GoTrueClient init state (same root cause as the
 * enoteca/logout freezes: createBrowserClient queues queries behind async
 * auth init, which hangs for live_round_answers due to auth.uid() in RLS).
 *
 * Body: { sessionId, playerId, questionId, selectedOptionId, currentBottleIndex }
 * Response: { ok: true, isCorrect, points } | { error: string }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const sessionId = String(body?.sessionId ?? '').trim()
    const playerId = String(body?.playerId ?? '').trim()
    const questionId = String(body?.questionId ?? '').trim()
    const selectedOptionId = String(body?.selectedOptionId ?? '').trim()
    const hasClientBottleIndex =
      body?.currentBottleIndex !== undefined && body?.currentBottleIndex !== null
    const clientBottleIndex = Number(body?.currentBottleIndex)

    if (!sessionId || !playerId || !questionId || !selectedOptionId) {
      return NextResponse.json({error: 'Missing required fields'}, {status: 400})
    }

    if (
      hasClientBottleIndex &&
      (!Number.isInteger(clientBottleIndex) || clientBottleIndex < 0)
    ) {
      return NextResponse.json({error: 'Invalid bottle index'}, {status: 400})
    }

    const db = createWriteClient(null)

    const {data: session, error: sessionError} = await db
      .from('live_sessions')
      .select('id, game_id, status, round_status, current_question_index')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({error: 'Session not found'}, {status: 404})
    }

    if (session.status !== 'playing') {
      return NextResponse.json({error: 'Session is not accepting answers'}, {status: 409})
    }

    const currentBottleIndex = Math.max(0, Number(session.current_question_index || 0))

    if (hasClientBottleIndex && clientBottleIndex !== currentBottleIndex) {
      return NextResponse.json(
        {error: 'Stale round answer ignored', stale: true},
        {status: 409},
      )
    }

    // Verify player is in this session (basic integrity check)
    const {data: player} = await db
      .from('live_players')
      .select('id')
      .eq('id', playerId)
      .eq('session_id', sessionId)
      .maybeSingle()

    if (!player) {
      return NextResponse.json({error: 'Player not found in session'}, {status: 403})
    }

    const {data: currentBottleRows, error: bottlesError} = await db
      .from('game_bottles')
      .select('id')
      .eq('game_id', session.game_id)
      .order('bottle_order')
      .range(currentBottleIndex, currentBottleIndex)

    if (bottlesError || !currentBottleRows?.length) {
      return NextResponse.json({error: 'No bottles available for this game'}, {status: 400})
    }

    const {data: questions, error: questionsError} = await db
      .from('game_questions')
      .select('id, display_order, kind, is_neutral')
      .eq('game_id', session.game_id)
      .order('display_order')

    if (questionsError || !questions?.length) {
      return NextResponse.json({error: 'Questions not found for game'}, {status: 400})
    }

    const currentQuestionIndex = questions.findIndex((question) => question.id === questionId)
    if (currentQuestionIndex < 0) {
      return NextResponse.json({error: 'Question not found for game'}, {status: 400})
    }

    const currentQuestion = questions[currentQuestionIndex]
    const isNeutral = isNeutralQuestion(currentQuestion)

    const currentBottleId = currentBottleRows[0]?.id
    let correctOptionId = null
    if (!isNeutral) {
      const {data: correctRow, error: correctError} = await db
        .from('game_bottle_answers')
        .select('option_id')
        .eq('bottle_id', currentBottleId)
        .eq('question_id', questionId)
        .maybeSingle()

      if (correctError || !correctRow?.option_id) {
        return NextResponse.json({error: 'Correct option not found for question'}, {status: 400})
      }

      correctOptionId = correctRow.option_id
    }

    const priorQuestionIds = questions.slice(0, currentQuestionIndex).map((question) => question.id)
    let currentCombo = 0

    if (priorQuestionIds.length > 0) {
      const {data: priorAnswers, error: priorAnswersError} = await db
        .from('live_round_answers')
        .select('question_id, is_correct')
        .eq('session_id', sessionId)
        .eq('player_id', playerId)
        .in('question_id', priorQuestionIds)

      if (priorAnswersError) {
        return NextResponse.json({error: priorAnswersError.message}, {status: 500})
      }

      if ((priorAnswers || []).length < priorQuestionIds.length) {
        return NextResponse.json(
          {error: 'Previous answers are not saved yet', retryable: true},
          {status: 409},
        )
      }

      const priorAnswerByQuestion = new Map(
        (priorAnswers || []).map((answer) => [answer.question_id, answer]),
      )

      priorQuestionIds.forEach((priorQuestionId) => {
        const answer = priorAnswerByQuestion.get(priorQuestionId)
        if (answer?.is_correct === true) currentCombo += 1
        else if (answer?.is_correct === false) currentCombo = 0
      })
    }

    const isCorrect = isNeutral ? null : correctOptionId === selectedOptionId
    const newCombo = isCorrect === true ? currentCombo + 1 : isCorrect === false ? 0 : currentCombo
    const comboBonus = isCorrect === true && newCombo >= 2 ? Math.min(newCombo - 1, 3) * 5 : 0
    const points = isCorrect === true ? 10 + comboBonus : 0

    const {error} = await db.from('live_round_answers').insert({
      session_id: sessionId,
      player_id: playerId,
      question_id: questionId,
      selected_option_id: selectedOptionId,
      is_correct: isCorrect,
      points: points ?? 0,
    })

    // 23505 = unique_violation (answer already saved, idempotent)
    if (error?.code === '23505') {
      return NextResponse.json({ok: true, duplicate: true})
    }

    if (error) {
      return NextResponse.json({error: error.message}, {status: 500})
    }

    return NextResponse.json({
      ok: true,
      isCorrect,
      points,
      comboBonus,
      newCombo,
      correctOptionId,
      isNeutral,
    })
  } catch (err) {
    return NextResponse.json({error: err.message}, {status: 500})
  }
}
