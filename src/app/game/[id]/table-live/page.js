import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getBusinessBranding} from '@/lib/businessBranding'
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

  const {data: ownerProfile} = await supabase
    .from('profiles')
    .select(
      'username, business_name, business_type, business_website, business_phone, business_address, business_logo_path, business_logo_url, city, province',
    )
    .eq('id', user.id)
    .maybeSingle()

  return (
    <TableLiveModeClient
      gameId={game.id}
      gameName={game.name}
      branding={getBusinessBranding(ownerProfile || {})}
    />
  )
}
