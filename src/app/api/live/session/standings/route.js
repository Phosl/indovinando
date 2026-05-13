import {NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import {createServerSupabase} from '@/lib/supabaseServer'

function createWriteClient(fallback) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key) return createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}})
  return fallback
}

/**
 * GET /api/live/session/standings?sessionId=<id>
 *
 * Returns the projected live standings for a session.
 * Uses the service-role key so both host (authenticated) and guest (anonymous)
 * always receive identical data — no RLS differences, no client-side race conditions.
 *
 * Response: { standings: [{id, nickname, avatar_id, is_host, total_score, roundPoints, liveTotalScore}] }
 */
export async function GET(request) {
  const {searchParams} = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({error: 'Missing sessionId'}, {status: 400})
  }

  try {
    const serverSupabase = await createServerSupabase()
    const db = createWriteClient(serverSupabase)

    // Fetch session to get round_status and updated_at (current-round anchor)
    const {data: session} = await db
      .from('live_sessions')
      .select('round_status')
      .eq('id', sessionId)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({standings: []})
    }

    // Fetch all players
    const {data: players} = await db
      .from('live_players')
      .select('id, nickname, avatar_id, total_score, is_host')
      .eq('session_id', sessionId)
      .order('joined_at')

    if (!players?.length) {
      return NextResponse.json({standings: []})
    }

    // Add projected round points when a round is in progress
    const showProjectedLive =
      session.round_status === 'waiting_answers' || session.round_status === 'showing_results'

    const roundPointsByPlayer = {}

    if (showProjectedLive) {
      const {data: answers} = await db
        .from('live_round_answers')
        .select('player_id, points')
        .eq('session_id', sessionId)

      ;(answers || []).forEach((a) => {
        roundPointsByPlayer[a.player_id] = (roundPointsByPlayer[a.player_id] || 0) + (a.points || 0)
      })
    }

    const standings = players
      .map((p) => {
        const roundPoints = roundPointsByPlayer[p.id] || 0
        return {
          ...p,
          roundPoints,
          liveTotalScore: (p.total_score || 0) + roundPoints,
        }
      })
      .sort((a, b) => b.liveTotalScore - a.liveTotalScore)

    return NextResponse.json({standings})
  } catch (err) {
    console.error('Error fetching standings:', err)
    return NextResponse.json({error: 'Internal error'}, {status: 500})
  }
}
