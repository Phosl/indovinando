import {createServerSupabase} from '@/lib/supabaseServer'
import PlayerLiveClient from './PlayerLiveClient'

export const metadata = {
  title: 'Play',
}

export default async function PlayerPlayPage({params}) {
  const supabase = await createServerSupabase()
  const resolvedParams = await Promise.resolve(params)
  const sessionId = resolvedParams.sessionId

  const {data: session} = await supabase
    .from('live_sessions')
    .select(
      `
      id,
      status,
      game_id,
      host_user_id,
      current_question_index,
      round_status,
      updated_at,
      games(name)
    `,
    )
    .eq('id', sessionId)
    .maybeSingle()

  let questions = []
  let bottles = []

  if (session?.game_id) {
    const {data: questionsData} = await supabase
      .from('game_questions')
      .select(
        `
        id,
        text,
        kind,
        is_neutral,
        display_order,
        game_question_options (
          id,
          text,
          option_order
        )
      `,
      )
      .eq('game_id', session.game_id)
      .order('display_order')

    const {data: bottlesData} = await supabase
      .from('game_bottles')
      .select('*')
      .eq('game_id', session.game_id)
      .order('bottle_order')

    questions = questionsData || []
    bottles = bottlesData || []

    // Pre-load correct answers server-side so the client never needs to query
    // game_bottle_answers directly (avoids RLS/JWT auth differences between
    // host and guest that caused handleCheck to hang for authenticated users).
    if (bottles.length > 0) {
      const bottleIds = (bottlesData || []).map((b) => b.id)
      const {data: answersData} = await supabase
        .from('game_bottle_answers')
        .select('bottle_id, question_id, option_id')
        .in('bottle_id', bottleIds)

      // Build a map: { [bottleId]: { [questionId]: optionId } }
      const bottleAnswersMap = {}
      ;(answersData || []).forEach((a) => {
        if (!bottleAnswersMap[a.bottle_id]) bottleAnswersMap[a.bottle_id] = {}
        bottleAnswersMap[a.bottle_id][a.question_id] = a.option_id
      })
      bottles = (bottlesData || []).map((b) => ({
        ...b,
        _correctAnswers: bottleAnswersMap[b.id] || {},
      }))
    }
  }

  const {
    data: {user},
  } = await supabase.auth.getUser()

  let initialPlayerData = null

  if (user?.id) {
    const {data: player} = await supabase
      .from('live_players')
      .select('id, nickname, avatar_id, user_id, is_host')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle()

    initialPlayerData = player || null
  }

  // Pre-load all players server-side so the overlay leaderboard is never empty
  // on first render. The client still refreshes via Realtime + polling.
  const {data: initialPlayers} = await supabase
    .from('live_players')
    .select('id, nickname, avatar_id, total_score, updated_at, is_host')
    .eq('session_id', sessionId)
    .order('joined_at')

  return (
    <PlayerLiveClient
      sessionId={sessionId}
      questions={questions}
      bottles={bottles}
      initialStatus={session?.round_status || 'waiting_answers'}
      initialQuestionIndex={session?.current_question_index || 0}
      initialUpdatedAt={session?.updated_at || null}
      hostUserId={session?.host_user_id || null}
      userId={user?.id || null}
      initialPlayerData={initialPlayerData}
      initialPlayers={initialPlayers || []}
    />
  )
}
