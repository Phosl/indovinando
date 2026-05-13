import {NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'

function createWriteClient(fallback) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key) return createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}})
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
 * Body: { sessionId, playerId, questionId, selectedOptionId, isCorrect, points }
 * Response: { ok: true } | { error: string }
 */
export async function POST(request) {
  try {
    const {sessionId, playerId, questionId, selectedOptionId, isCorrect, points} =
      await request.json()

    if (!sessionId || !playerId || !questionId || !selectedOptionId) {
      return NextResponse.json({error: 'Missing required fields'}, {status: 400})
    }

    const db = createWriteClient(null)

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

    const {error} = await db.from('live_round_answers').insert({
      session_id: sessionId,
      player_id: playerId,
      question_id: questionId,
      selected_option_id: selectedOptionId,
      is_correct: isCorrect,
      points: points ?? 0,
    })

    // 23505 = unique_violation (answer already saved, idempotent)
    if (error && error.code !== '23505') {
      return NextResponse.json({error: error.message}, {status: 500})
    }

    return NextResponse.json({ok: true})
  } catch (err) {
    return NextResponse.json({error: err.message}, {status: 500})
  }
}
