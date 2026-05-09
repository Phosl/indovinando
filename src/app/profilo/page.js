import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getWineCourseData} from '@/lib/wineCourseContent'
import ProfileClient from './ProfileClient'

export const metadata = {
  title: 'Profilo',
}

export default async function ProfilePage() {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()

  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth?next=/profilo')

  const {data: profile} = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  const {count: gamesCount} = await supabase
    .from('games')
    .select('id', {count: 'exact', head: true})
    .eq('created_by', user.id)

  const {levels} = await getWineCourseData(lang)

  return (
    <ProfileClient
      userLabel={profile?.username || user.email}
      email={user.email || ''}
      levels={levels}
      gamesCount={gamesCount || 0}
    />
  )
}
