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

async function persistFinalResults(db, sessionId, eventId) {
  if (!eventId) return

  const {data: players, error: playersError} = await db
    .from('table_live_players')
    .select('id, total_score, joined_at')
    .eq('session_id', sessionId)
    .order('total_score', {ascending: false})
    .order('joined_at', {ascending: true})

  if (playersError) {
    throw new Error(playersError.message)
  }

  const orderedPlayers = players || []

  const {error: clearError} = await db
    .from('table_live_event_results')
    .delete()
    .eq('session_id', sessionId)
  if (clearError) {
    throw new Error(clearError.message)
  }

  if (!orderedPlayers.length) return

  const rows = orderedPlayers.map((player, index) => ({
    event_id: eventId,
    session_id: sessionId,
    player_id: player.id,
    score: player.total_score || 0,
    rank_in_session: index + 1,
    captured_at: new Date().toISOString(),
  }))

  const {error: insertError} = await db.from('table_live_event_results').insert(rows)
  if (insertError) {
    throw new Error(insertError.message)
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sessionId = String(body?.sessionId || '').trim()
    if (!sessionId) {
      return NextResponse.json({error: 'Missing sessionId'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const db = createWriteClient(supabase)

    const {data: session, error: sessionError} = await db
      .from('table_live_sessions')
      .select('id, event_id, game_id, status, current_bottle_index, round_status')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({error: 'Session not found'}, {status: 404})
    }

    if (session.status !== 'playing') {
      if (session.status === 'finished') {
        await persistFinalResults(db, sessionId, session.event_id)
        return NextResponse.json({ok: true, advanced: false, reason: 'already_finished'})
      }
      return NextResponse.json({ok: true, advanced: false, reason: 'not_playing'})
    }

    if (session.round_status === 'advancing') {
      return NextResponse.json({ok: true, advanced: false, reason: 'already_advancing'})
    }

    const {error: lockError} = await db
      .from('table_live_sessions')
      .update({round_status: 'advancing', updated_at: new Date().toISOString()})
      .eq('id', sessionId)
      .eq('round_status', 'waiting_answers')

    if (lockError) {
      return NextResponse.json({error: lockError.message}, {status: 500})
    }

    const {data: activePlayers, error: playersError} = await db
      .from('table_live_players')
      .select('id')
      .eq('session_id', sessionId)
      .eq('is_active', true)

    if (playersError) {
      await db
        .from('table_live_sessions')
        .update({round_status: 'waiting_answers'})
        .eq('id', sessionId)
      return NextResponse.json({error: playersError.message}, {status: 500})
    }

    const {count: questionsCount, error: questionsCountError} = await db
      .from('game_questions')
      .select('id', {count: 'exact', head: true})
      .eq('game_id', session.game_id)

    if (questionsCountError || !questionsCount) {
      await db
        .from('table_live_sessions')
        .update({round_status: 'waiting_answers'})
        .eq('id', sessionId)
      return NextResponse.json(
        {error: questionsCountError?.message || 'No questions configured'},
        {status: 400},
      )
    }

    const playerIds = (activePlayers || []).map((p) => p.id)
    if (!playerIds.length) {
      await db
        .from('table_live_sessions')
        .update({round_status: 'waiting_answers'})
        .eq('id', sessionId)
      return NextResponse.json({ok: true, advanced: false, reason: 'no_active_players'})
    }

    const {data: answers, error: answersError} = await db
      .from('table_live_round_answers')
      .select('player_id, points')
      .eq('session_id', sessionId)
      .eq('bottle_index', session.current_bottle_index)

    if (answersError) {
      await db
        .from('table_live_sessions')
        .update({round_status: 'waiting_answers'})
        .eq('id', sessionId)
      return NextResponse.json({error: answersError.message}, {status: 500})
    }

    const answersByPlayer = new Map()
    const scoreByPlayer = new Map()
    for (const answer of answers || []) {
      answersByPlayer.set(answer.player_id, (answersByPlayer.get(answer.player_id) || 0) + 1)
      scoreByPlayer.set(
        answer.player_id,
        (scoreByPlayer.get(answer.player_id) || 0) + (answer.points || 0),
      )
    }

    const allCompleted = playerIds.every((id) => (answersByPlayer.get(id) || 0) >= questionsCount)
    if (!allCompleted) {
      await db
        .from('table_live_sessions')
        .update({round_status: 'waiting_answers'})
        .eq('id', sessionId)
      return NextResponse.json({ok: true, advanced: false, reason: 'waiting_players'})
    }

    for (const playerId of playerIds) {
      const addScore = scoreByPlayer.get(playerId) || 0
      if (!addScore) continue

      const {data: playerRow} = await db
        .from('table_live_players')
        .select('total_score')
        .eq('id', playerId)
        .maybeSingle()

      const currentScore = playerRow?.total_score || 0
      await db
        .from('table_live_players')
        .update({total_score: currentScore + addScore, last_seen_at: new Date().toISOString()})
        .eq('id', playerId)
    }

    const {count: bottlesCount} = await db
      .from('game_bottles')
      .select('id', {count: 'exact', head: true})
      .eq('game_id', session.game_id)

    const nextIndex = session.current_bottle_index + 1
    const finished = !bottlesCount || nextIndex >= bottlesCount

    await db
      .from('table_live_sessions')
      .update({
        current_bottle_index: finished ? session.current_bottle_index : nextIndex,
        status: finished ? 'finished' : 'playing',
        round_status: 'waiting_answers',
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (finished) {
      await persistFinalResults(db, sessionId, session.event_id)
    }

    return NextResponse.json({ok: true, advanced: true, finished, nextBottleIndex: nextIndex})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
