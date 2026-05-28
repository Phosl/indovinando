import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import it from '@/lib/i18n/locales/it.json'
import en from '@/lib/i18n/locales/en.json'
import {getGameAvatarOptions} from '@/lib/gameAvatarOptions'
import MieiGiochiClient from './MieiGiochiClient'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'I miei giochi'}

export default async function MieiGiochiPage() {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const locale = lang === 'en' ? en : it
  const dashboardDict = locale.dashboard || it.dashboard || {}
  const storicoDict = dashboardDict.storico || it.dashboard.storico || {}

  const {
    data: {user},
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{data: games}, {data: sessions}] = await Promise.all([
    supabase
      .from('games')
      .select(
        'id, name, status, created_at, cover_index, game_bottles(id, name, producer, bottle_order), game_questions(id)',
      )
      .eq('created_by', user.id)
      .order('created_at', {ascending: false}),
    supabase
      .from('live_session_results')
      .select('id, game_name, played_at, player_count, players')
      .eq('host_user_id', user.id)
      .order('played_at', {ascending: false})
      .limit(100),
  ])
  const avatarOptions = await getGameAvatarOptions()

  return (
    <MieiGiochiClient
      games={games || []}
      avatarOptions={avatarOptions}
      sessions={sessions || []}
      lang={lang}
      dashboardDict={dashboardDict}
      storicoDict={storicoDict}
    />
  )
}
