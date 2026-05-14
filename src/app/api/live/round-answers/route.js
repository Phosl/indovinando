import {NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'

function createWriteClient(fallback) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key)
    return createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}})
  return fallback
}

/**
 * GET /api/live/round-answers?sessionId=<id>
 *
 * Returns all live_round_answers rows for a session. Uses the service-role
 * key to bypass RLS (which uses auth.uid() and can hang for authenticated
 * browser clients due to GoTrueClient init-queue delays).
 *
 * Response: { answers: [{player_id, question_id, selected_option_id, is_correct, points}] }
 */
export async function GET(request) {
  try {
    const sessionId = new URL(request.url).searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({answers: []})
    }

    const db = createWriteClient(null)

    const {data: answers, error} = await db
      .from('live_round_answers')
      .select('player_id, question_id, selected_option_id, is_correct, points')
      .eq('session_id', sessionId)

    if (error) {
      return NextResponse.json({error: error.message}, {status: 500})
    }

    return NextResponse.json({answers: answers || []})
  } catch (err) {
    return NextResponse.json({error: err.message}, {status: 500})
  }
}
