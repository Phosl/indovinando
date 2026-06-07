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
    supabase
      .from('profiles')
      .select(
        'username, avatar_emoji, profile_type, experience_level, favorite_wine_types, favorite_countries, city, province, newsletter_opt_in, business_name, business_type, business_description, business_website, business_phone, business_address, business_latitude, business_longitude, business_logo_path, business_logo_url, is_partner_public, partner_slug, profile_completed_at, profile_prompt_dismissed_at',
      )
      .eq('id', user.id)
      .single(),
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
      profileData={profile || {}}
      levels={levels}
      gamesCount={gamesCount || 0}
    />
  )
}
