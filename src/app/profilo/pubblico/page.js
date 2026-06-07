import {redirect} from 'next/navigation'
import TopBar from '@/components/TopBar'
import BusinessBrandingSettings from '@/components/profile/BusinessBrandingSettings'
import PartnerPublicSettings from '@/components/profile/PartnerPublicSettings'
import {createServerSupabase} from '@/lib/supabaseServer'
import styles from '../profilo.module.scss'

export const metadata = {
  title: 'Profilo pubblico',
}

export default async function ProfilePublicPage() {
  const supabase = await createServerSupabase()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth?next=/profilo/pubblico')

  const {data: profile} = await supabase
    .from('profiles')
    .select(
      'id, username, profile_type, business_name, business_type, business_description, business_website, business_phone, business_address, business_latitude, business_longitude, business_logo_path, business_logo_url, is_partner_public, partner_slug',
    )
    .eq('id', user.id)
    .single()

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <TopBar title="Profilo pubblico" back="/profilo" backLabel="Profilo" />
        <BusinessBrandingSettings profile={profile || {}} />
        <PartnerPublicSettings profile={profile || {}} mode="page" />
      </div>
    </main>
  )
}
