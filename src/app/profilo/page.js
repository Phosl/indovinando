import {Suspense} from 'react'
import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getWineCourseData} from '@/lib/wineCourseContent'
import ProfileClient from './ProfileClient'
import ProfileCommunitySection from './ProfileCommunitySection'

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

  const courseResult = await getWineCourseData(lang).catch(() => ({levels: []}))

  const levels = courseResult?.levels ?? []
  return (
    <ProfileClient
      userId={user.id}
      userLabel={user.email || ''}
      email={user.email || ''}
      initialAvatar={null}
      profileData={{}}
      levels={levels}
      gamesCount={0}
    >
      <Suspense fallback={null}>
        <ProfileCommunitySection />
      </Suspense>
    </ProfileClient>
  )
}
