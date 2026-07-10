import {NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import {createServerSupabase} from '@/lib/supabaseServer'

function createWriteClient(fallback) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key) {
    return createClient(url, key, {
      auth: {persistSession: false, autoRefreshToken: false},
    })
  }
  return fallback
}

export async function GET(request) {
  const {searchParams} = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({error: 'Missing sessionId'}, {status: 400})
  }

  try {
    const serverSupabase = await createServerSupabase()
    const db = createWriteClient(serverSupabase)

    const {data: session} = await db
      .from('table_live_sessions')
      .select('id, status, round_status, current_bottle_index')
      .eq('id', sessionId)
      .maybeSingle()

    if (!session) return NextResponse.json({standings: []})

    const {data: players} = await db
      .from('table_live_players')
      .select('id, nickname, total_score, joined_at')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('joined_at')

    if (!players?.length) return NextResponse.json({standings: []})

    const shouldProjectRound =
      session.status === 'playing' &&
      (session.round_status === 'waiting_answers' || session.round_status === 'showing_results')

    const roundPointsByPlayer = {}
    if (shouldProjectRound) {
      const {data: answers} = await db
        .from('table_live_round_answers')
        .select('player_id, points')
        .eq('session_id', sessionId)
        .eq('bottle_index', session.current_bottle_index)

      for (const row of answers || []) {
        roundPointsByPlayer[row.player_id] = (roundPointsByPlayer[row.player_id] || 0) + (row.points || 0)
      }
    }

    const hostId = players[0]?.id || null
    const standings = players
      .map((p) => {
        const roundPoints = roundPointsByPlayer[p.id] || 0
        return {
          id: p.id,
          nickname: p.nickname,
          total_score: p.total_score || 0,
          is_host: p.id === hostId,
          avatar_id: 1,
          roundPoints,
          liveTotalScore: (p.total_score || 0) + roundPoints,
        }
      })
      .sort((a, b) => b.liveTotalScore - a.liveTotalScore)

    return NextResponse.json({standings})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Internal error'}, {status: 500})
  }
}
