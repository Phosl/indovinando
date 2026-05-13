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
 * POST /api/live/advance-bottle
 *
 * Host-only. Syncs round scores, purges current-round answers, and advances
 * the session to the next bottle. Uses the service-role key so all DB writes
 * succeed regardless of browser-side GoTrueClient init state.
 *
 * Body: { sessionId }
 * Response: { nextIndex: number, ok: true } | { error: string }
 */
export async function POST(request) {
  try {
    const {sessionId} = await request.json()
    if (!sessionId) {
      return NextResponse.json({error: 'Missing sessionId'}, {status: 400})
    }

    // Verify the caller is authenticated as the session host (cookie-based SSR auth)
    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const db = createWriteClient(supabase)

    const {data: session} = await db
      .from('live_sessions')
      .select('host_user_id, current_question_index, status')
      .eq('id', sessionId)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({error: 'Session not found'}, {status: 404})
    }
    if (session.host_user_id !== user.id) {
      return NextResponse.json({error: 'Only the host can advance the session'}, {status: 403})
    }
    if (session.status !== 'playing') {
      return NextResponse.json({error: 'Session is not in playing state'}, {status: 409})
    }

    // ── 1. Sync round scores to live_players.total_score ──────────────────────
    const {data: answers} = await db
      .from('live_round_answers')
      .select('player_id, points')
      .eq('session_id', sessionId)

    if (answers?.length) {
      const roundPointsByPlayer = {}
      answers.forEach((a) => {
        roundPointsByPlayer[a.player_id] = (roundPointsByPlayer[a.player_id] || 0) + (a.points || 0)
      })

      const {data: players} = await db
        .from('live_players')
        .select('id, total_score')
        .eq('session_id', sessionId)

      if (players?.length) {
        await Promise.all(
          players
            .map((p) => {
              const add = roundPointsByPlayer[p.id] || 0
              if (add <= 0) return null
              return db
                .from('live_players')
                .update({total_score: (p.total_score || 0) + add})
                .eq('id', p.id)
            })
            .filter(Boolean),
        )
      }
    }

    // ── 2. Clear current-round answers so next round starts fresh ─────────────
    await db.from('live_round_answers').delete().eq('session_id', sessionId)

    // ── 3. Advance session to next bottle ─────────────────────────────────────
    const nextIndex = (session.current_question_index ?? 0) + 1
    await db
      .from('live_sessions')
      .update({
        current_question_index: nextIndex,
        round_status: 'waiting_answers',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    return NextResponse.json({nextIndex, ok: true})
  } catch (err) {
    return NextResponse.json({error: err.message}, {status: 500})
  }
}
