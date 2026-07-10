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
        answer_reveal_mode,
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
    const me = (players || []).find(
      (player) => player.id === playerId && player.player_token === playerToken,
    )

    if (!me) {
      const eventSlug = session.table_live_events?.slug
      const joinUrl = eventSlug
        ? session.status === 'lobby'
          ? `/table-live/event/${eventSlug}/join?code=${encodeURIComponent(session.join_code)}`
          : `/table-live/event/${eventSlug}`
        : null
      return NextResponse.json(
        {error: 'Player auth required', joinUrl},
        {status: 403},
      )
    }

    const visiblePlayers = (players || []).filter((player) => player.is_active)
    const rankedPlayers = [...visiblePlayers]
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

    const {data: roundAnswersRows} = await db
      .from('table_live_round_answers')
      .select('player_id, question_id, selected_option_id, is_correct, points')
      .eq('session_id', sessionId)
      .eq('bottle_index', session.current_bottle_index)

    const {data: answers} = await db
      .from('table_live_round_answers')
      .select('question_id, selected_option_id, is_correct, points')
      .eq('session_id', sessionId)
      .eq('player_id', me.id)
      .eq('bottle_index', session.current_bottle_index)
    const myAnswers = answers || []

    const answeredQuestionIds = new Set(myAnswers.map((answer) => answer.question_id))
    const answeredAllQuestions =
      (questions || []).length > 0 &&
      (questions || []).every((question) => answeredQuestionIds.has(question.id))
    const revealAllCorrectAnswers =
      session.status === 'finished' ||
      (session.answer_reveal_mode === 'end' && answeredAllQuestions)
    const revealMyResults =
      session.answer_reveal_mode === 'instant' || revealAllCorrectAnswers
    const visibleCorrectAnswerIds = revealAllCorrectAnswers
      ? new Set((questions || []).map((question) => question.id))
      : session.answer_reveal_mode === 'instant'
        ? answeredQuestionIds
        : new Set()

    let correctOptionByQuestion = {}
    if (currentBottle?.id && visibleCorrectAnswerIds.size > 0) {
      const {data: correctRows} = await db
        .from('game_bottle_answers')
        .select('question_id, option_id')
        .eq('bottle_id', currentBottle.id)
      correctOptionByQuestion = (correctRows || []).reduce((acc, row) => {
        if (visibleCorrectAnswerIds.has(row.question_id)) {
          acc[row.question_id] = row.option_id
        }
        return acc
      }, {})
    }

    const myPlayer = {
      id: me.id,
      nickname: me.nickname,
      isHost: me.id === hostId,
    }

    return NextResponse.json({
      session: {
        id: session.id,
        joinCode: session.join_code,
        status: session.status,
        currentBottleIndex: session.current_bottle_index,
        answerRevealMode: session.answer_reveal_mode || 'instant',
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
      roundAnswers: (roundAnswersRows || []).map((answer) => ({
        player_id: answer.player_id,
        question_id: answer.question_id,
        ...(answer.player_id === me.id
          ? {
              selected_option_id: answer.selected_option_id,
              is_correct: revealMyResults ? answer.is_correct : null,
              points: revealMyResults ? answer.points : 0,
            }
          : {}),
      })),
      correctOptionByQuestion,
      me: myPlayer,
      myAnswers: myAnswers.map((answer) => ({
        ...answer,
        is_correct: revealMyResults ? answer.is_correct : null,
        points: revealMyResults ? answer.points : 0,
      })),
    })
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
