import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import TableLiveModeClient from './TableLiveModeClient'

export const metadata = {
  title: 'Live Tavoli',
}

export default async function TableLiveModePage({params}) {
  const supabase = await createServerSupabase()
  const {id: gameId} = await params

  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const {data: game, error: gameError} = await supabase
    .from('games')
    .select('id, name, created_by')
    .eq('id', gameId)
    .eq('created_by', user.id)
    .maybeSingle()

  if (gameError || !game) {
    redirect('/dashboard')
  }

  return <TableLiveModeClient gameId={game.id} gameName={game.name} />
}

