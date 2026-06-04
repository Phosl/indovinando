import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createClient} from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function createReadClient(fallback) {
  if (SUPABASE_URL && SERVICE_ROLE_KEY) {
    return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {persistSession: false, autoRefreshToken: false},
    })
  }
  return fallback
}

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const playerId = url.searchParams.get('playerId')
    const playerToken = url.searchParams.get('playerToken')

    if (!sessionId) {
      return NextResponse.json({error: 'Missing sessionId'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const db = createReadClient(supabase)

    const {data: session, error: sessionError} = await db
      .from('table_live_sessions')
      .select(
        `
        id,
        event_id,
        game_id,
        join_code,
        status,
        current_bottle_index,
        round_status,
        last_activity_at,
        created_at,
        table_live_events(id, slug, title, inactivity_timeout_minutes),
        games(name)
      `,
      )
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({error: 'Session not found'}, {status: 404})
    }

    const {data: players, error: playersError} = await db
      .from('table_live_players')
      .select('id, nickname, total_score, joined_at, is_active, player_token')
      .eq('session_id', sessionId)
      .order('joined_at', {ascending: true})

    if (playersError) {
      return NextResponse.json({error: playersError.message}, {status: 500})
    }

    const hostId = players?.[0]?.id || null
    const rankedPlayers = [...(players || [])]
      .sort((a, b) => {
        if ((b.total_score || 0) !== (a.total_score || 0)) return (b.total_score || 0) - (a.total_score || 0)
        return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
      })
      .map((p) => ({
        id: p.id,
        nickname: p.nickname,
        total_score: p.total_score,
        joined_at: p.joined_at,
        is_active: p.is_active,
        is_host: p.id === hostId,
      }))

    const {data: questions} = await db
      .from('game_questions')
      .select('id, text, kind, is_neutral, display_order, game_question_options(id, text, option_order)')
      .eq('game_id', session.game_id)
      .order('display_order')

    const {data: bottles} = await db
      .from('game_bottles')
      .select('id, name, producer, year, bottle_order')
      .eq('game_id', session.game_id)
      .order('bottle_order')

    const currentBottle = (bottles || [])[session.current_bottle_index] || null
    let correctOptionByQuestion = {}
    if (currentBottle?.id) {
      const {data: correctRows} = await db
        .from('game_bottle_answers')
        .select('question_id, option_id')
        .eq('bottle_id', currentBottle.id)
      correctOptionByQuestion = (correctRows || []).reduce((acc, row) => {
        acc[row.question_id] = row.option_id
        return acc
      }, {})
    }

    const {data: roundAnswersRows} = await db
      .from('table_live_round_answers')
      .select('player_id, question_id, selected_option_id, is_correct, points')
      .eq('session_id', sessionId)
      .eq('bottle_index', session.current_bottle_index)

    let myPlayer = null
    let myAnswers = []
    if (playerId && playerToken) {
      const me = (players || []).find((p) => p.id === playerId && p.player_token === playerToken)
      if (me) {
        myPlayer = {
          id: me.id,
          nickname: me.nickname,
          isHost: me.id === hostId,
        }
        const {data: answers} = await db
          .from('table_live_round_answers')
          .select('question_id, selected_option_id, is_correct, points')
          .eq('session_id', sessionId)
          .eq('player_id', me.id)
          .eq('bottle_index', session.current_bottle_index)
        myAnswers = answers || []
      }
    }

    return NextResponse.json({
      session: {
        id: session.id,
        joinCode: session.join_code,
        status: session.status,
        currentBottleIndex: session.current_bottle_index,
        roundStatus: session.round_status,
        lastActivityAt: session.last_activity_at,
        createdAt: session.created_at,
      },
      event: {
        id: session.table_live_events?.id,
        slug: session.table_live_events?.slug,
        title: session.table_live_events?.title,
        inactivityTimeoutMinutes: session.table_live_events?.inactivity_timeout_minutes,
      },
      game: {
        id: session.game_id,
        name: session.games?.name || 'Gioco',
      },
      players: rankedPlayers,
      questions:
        (questions || []).map((q) => ({
          id: q.id,
          text: q.text,
          kind: q.kind || null,
          isNeutral: q.is_neutral === true,
          displayOrder: q.display_order,
          options: [...(q.game_question_options || [])].sort((a, b) => a.option_order - b.option_order),
        })) || [],
      bottles:
        (bottles || []).map((b) => ({
          id: b.id,
          name: b.name,
          producer: b.producer,
          year: b.year,
          bottleOrder: b.bottle_order,
        })) || [],
      roundAnswers: roundAnswersRows || [],
      correctOptionByQuestion,
      me: myPlayer,
      myAnswers,
    })
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
