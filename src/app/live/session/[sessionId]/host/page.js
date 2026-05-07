import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'

export const metadata = {
  title: 'Host - Sessione Live',
}

export default async function HostLivePage({params}) {
  const supabase = await createServerSupabase()
  const resolvedParams = await Promise.resolve(params)
  const sessionId = resolvedParams.sessionId

  // Check auth
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Load session - must own it
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

  redirect(`/live/session/${sessionId}/play`)
}
