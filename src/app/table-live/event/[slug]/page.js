import {notFound} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import TableLiveEventClient from './TableLiveEventClient'

export default async function TableLiveEventPage({params}) {
  const {slug} = await params
  const supabase = await createServerSupabase()

  const {data: event} = await supabase
    .from('table_live_events')
    .select('id, slug, title, status, game_id, games(name)')
    .eq('slug', slug)
    .maybeSingle()

  if (!event || event.status !== 'active') {
    notFound()
  }

  return (
    <TableLiveEventClient
      eventSlug={event.slug}
      eventTitle={event.title}
      gameName={event.games?.name || 'Gioco'}
    />
  )
}

