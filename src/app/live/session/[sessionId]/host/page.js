import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import HostLiveClient from './HostLiveClient'

export const metadata = {
  title: 'Host - Sessione Live',
}

export default async function HostLivePage({params}) {
  const supabase = await createServerSupabase()
  const resolvedParams = await Promise.resolve(params)
  const sessionId = resolvedParams.sessionId

  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const {data: session, error: sessionError} = await supabase
    .from('live_sessions')
    .select(
      `
      id,
      status,
      game_id,
      current_question_index,
      round_status,
      games(name),
      host_user_id
    `,
    )
    .eq('id', sessionId)
    .eq('host_user_id', user.id)
    .single()

  if (sessionError || !session) {
    redirect('/dashboard')
  }

  const {data: questions} = await supabase
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

  const {data: bottles} = await supabase
    .from('game_bottles')
    .select('*')
    .eq('game_id', session.game_id)
    .order('bottle_order')

  return (
    <HostLiveClient
      sessionId={sessionId}
      gameName={session.games?.name || 'Gioco'}
      questions={questions || []}
      bottles={bottles || []}
      initialStatus={session.round_status || 'waiting_answers'}
      initialQuestionIndex={session.current_question_index || 0}
    />
  )
}
