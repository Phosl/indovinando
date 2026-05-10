import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getAppVersion} from '@/lib/appVersion'
import AuthEntryClient from '@/components/auth/AuthEntryClient'

export default async function Home() {
  const supabase = await createServerSupabase()
  const {data} = await supabase.auth.getUser()

  // Se loggato, redirect a dashboard
  if (data.user) {
    redirect('/dashboard')
  }

  const appVersion = await getAppVersion()

  return <AuthEntryClient appVersion={appVersion} />
}
