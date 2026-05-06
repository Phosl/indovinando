import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import GameCreateClient from './GameCreateClient'

export default async function Page() {
  const supabase = await createServerSupabase()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const {data: profile} = await supabase
    .from('profiles')
    .select('onboarding')
    .eq('id', user.id)
    .single()

  return <GameCreateClient userId={user.id} />
}
