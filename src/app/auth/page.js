import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import AuthFormClient from '@/components/auth/AuthFormClient'

export default async function AuthPage() {
  const supabase = await createServerSupabase()
  const {data} = await supabase.auth.getUser()

  if (data.user) {
    redirect('/dashboard')
  }

  return <AuthFormClient />
}
