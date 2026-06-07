import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import ProfileSetupWizardClient from '@/components/profile/ProfileSetupWizardClient'

export const metadata = {
  title: 'Completa profilo',
}

export default async function ProfileSetupPage({searchParams}) {
  const supabase = await createServerSupabase()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?next=/profilo/completa')
  }

  const next = (await searchParams)?.next
  const safeNextPath = typeof next === 'string' && next.startsWith('/') ? next : '/dashboard'

  const {data: profile} = await supabase
    .from('profiles')
    .select(
      'profile_type, experience_level, favorite_wine_types, favorite_countries, city, province, newsletter_opt_in, profile_completed_at, profile_prompt_dismissed_at',
    )
    .eq('id', user.id)
    .single()

  return <ProfileSetupWizardClient userId={user.id} profile={profile || {}} nextPath={safeNextPath} />
}
