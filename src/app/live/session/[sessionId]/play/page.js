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
  }

  const {
    data: {user},
  } = await supabase.auth.getUser()

  return (
    <PlayerLiveClient
      sessionId={sessionId}
      questions={questions}
      bottles={bottles}
      initialStatus={session?.round_status || 'waiting_answers'}
      initialQuestionIndex={session?.current_question_index || 0}
      hostUserId={session?.host_user_id || null}
      userId={user?.id || null}
    />
  )
}
