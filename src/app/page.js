import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import LandingPage from '@/components/landing/LandingPage'

export default async function Home() {
  const supabase = await createServerSupabase()
  const {data} = await supabase.auth.getUser()

  if (data.user) {
    redirect('/dashboard')
  }

  return <LandingPage />
}
