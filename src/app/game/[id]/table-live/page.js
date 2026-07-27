import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createAdminSupabaseOrFallback} from '@/lib/supabaseAdmin'
import {getServerLanguage} from '@/lib/i18n/server'
import {ensureActiveTableLiveEvent} from '@/lib/tableLiveEvents'

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

  const db = createAdminSupabaseOrFallback(supabase)
  const {event, error} = await ensureActiveTableLiveEvent(db, {
    gameId: game.id,
    createdBy: user.id,
    title: game.name,
    inactivityTimeoutMinutes: 15,
  })

  if (error || !event?.url) {
    console.error('[table-live event]', {
      operation: 'legacy-route-redirect',
      gameId,
      code: error?.code || 'EVENT_UNAVAILABLE',
    })
    redirect(`/game/${gameId}`)
  }

  redirect(event.url)
}
