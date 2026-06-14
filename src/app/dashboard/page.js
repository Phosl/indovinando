import {redirect} from 'next/navigation'
import DashboardClient from './DashboardClient'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import it from '@/lib/i18n/locales/it.json'
import en from '@/lib/i18n/locales/en.json'

export default async function Dashboard() {
  const supabase = await createServerSupabase()
  const [lang, authResult] = await Promise.all([getServerLanguage(), supabase.auth.getUser()])
  const user = authResult.data?.user

  if (!user) {
    redirect('/auth')
  }

  const locale = lang === 'en' ? en : it
  const dashboardDict = locale.dashboard || it.dashboard || {}

  return <DashboardClient dashboardDict={dashboardDict} lang={lang} userEmail={user.email || ''} />
}
