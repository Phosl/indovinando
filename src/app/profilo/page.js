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
  const [lang, authResult] = await Promise.all([getServerLanguage(), supabase.auth.getUser()])

  const {
    data: {user},
  } = authResult

  if (!user) redirect('/auth?next=/profilo')

  const [profileResult, gamesResult, courseResult] = await Promise.all([
    supabase.from('profiles').select('username, avatar_emoji').eq('id', user.id).single(),
    supabase.from('games').select('id', {count: 'exact', head: true}).eq('created_by', user.id),
    getWineCourseData(lang).catch(() => ({levels: []})),
  ])

  const profile = profileResult.data
  const gamesCount = gamesResult.count ?? 0
  const levels = courseResult?.levels ?? []

  return (
    <ProfileClient
      userId={user.id}
      userLabel={profile?.username || user.email}
      email={user.email || ''}
      initialAvatar={profile?.avatar_emoji || null}
      levels={levels}
      gamesCount={gamesCount || 0}
    />
  )
}
