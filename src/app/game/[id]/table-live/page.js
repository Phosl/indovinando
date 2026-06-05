import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import TableLiveModeClient from './TableLiveModeClient'

export async function generateMetadata() {
  const lang = await getServerLanguage()
  return {
    title: lang === 'en' ? 'Table Live' : 'Live Tavoli',
  }
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
