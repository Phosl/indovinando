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
  const [lang, authResult] = await Promise.all([getServerLanguage(), supabase.auth.getUser()])
  const locale = lang === 'en' ? en : it
  const dashboardDict = locale.dashboard || it.dashboard || {}

  const {
    data: {user},
  } = authResult
  if (!user) redirect('/auth')

  const [gamesResult, avatarOptions] = await Promise.all([
    supabase
      .from('games')
      .select(
        'id, name, status, created_at, cover_index, game_bottles(id, name, producer, bottle_order), game_questions(id)',
      )
      .eq('created_by', user.id)
      .order('created_at', {ascending: false}),
    getGameAvatarOptions(),
  ])

  const games = gamesResult.data || []

  return (
    <MieiGiochiClient
      games={games}
      avatarOptions={avatarOptions}
      lang={lang}
      dashboardDict={dashboardDict}
    />
  )
}
