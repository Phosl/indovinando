import {redirect} from 'next/navigation'
import ProfileSetupPanel from '@/components/profile/ProfileSetupPanel'
import {createServerSupabase} from '@/lib/supabaseServer'
import styles from '../profilo.module.scss'

export const metadata = {
  title: 'Preferenze profilo',
}

export default async function ProfilePreferencesPage() {
  const supabase = await createServerSupabase()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth?next=/profilo/preferenze')

  const {data: profile} = await supabase
    .from('profiles')
    .select(
      'id, username, profile_type, experience_level, favorite_wine_types, favorite_countries, city, province, newsletter_opt_in, business_name, business_type, business_description, business_website, business_phone, business_address, business_latitude, business_longitude, is_partner_public, partner_slug, profile_completed_at, profile_prompt_dismissed_at',
    )
    .eq('id', user.id)
    .single()

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <ProfileSetupPanel profile={profile || {}} mode="preferences" />
      </div>
    </main>
  )
}
