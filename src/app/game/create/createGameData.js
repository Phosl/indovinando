import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getGameAvatarOptions} from '@/lib/gameAvatarOptions'

export async function getCreateGameData() {
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

  const {count: createdGamesCount} = await supabase
    .from('games')
    .select('id', {count: 'exact', head: true})
    .eq('created_by', user.id)

  const shouldShowOnboarding = profile?.onboarding !== false && (createdGamesCount || 0) < 1
  const avatarOptions = await getGameAvatarOptions()

  return {
    userId: user.id,
    initialShowOnboarding: shouldShowOnboarding,
    avatarOptions,
  }
}
