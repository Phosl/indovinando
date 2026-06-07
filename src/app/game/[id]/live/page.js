import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getBusinessBranding} from '@/lib/businessBranding'
import LiveSessionClient from './LiveSessionClient'

export async function generateMetadata() {
  const lang = await getServerLanguage()
  return {
    title: lang === 'en' ? 'Live Session' : 'Sessione Live',
  }
}

export default async function LiveSessionPage({params}) {
  const supabase = await createServerSupabase()

  // Resolve params if Promise
  const resolvedParams = await Promise.resolve(params)
  const gameId = resolvedParams.id

  // Check auth
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Load game - must own it
  const {data: game, error: gameError} = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .eq('created_by', user.id)
    .single()

  if (gameError || !game) {
    redirect('/dashboard')
  }

  // Load questions with options
  const {data: questions} = await supabase
    .from('game_questions')
    .select(
      `
      id,
      display_order,
      text,
      kind,
      is_neutral,
      game_question_options (
        id,
        text,
        option_order
      )
    `,
    )
    .eq('game_id', gameId)
    .order('display_order')

  // Load bottles
  const {data: bottles} = await supabase
    .from('game_bottles')
    .select('*')
    .eq('game_id', gameId)
    .order('bottle_order')

  const {data: ownerProfile} = await supabase
    .from('profiles')
    .select(
      'username, business_name, business_type, business_website, business_phone, business_address, business_logo_path, business_logo_url, city, province',
    )
    .eq('id', user.id)
    .maybeSingle()

  return (
    <LiveSessionClient
      gameId={gameId}
      gameName={game.name}
      questions={questions || []}
      bottles={bottles || []}
      userId={user.id}
      branding={getBusinessBranding(ownerProfile || {})}
    />
  )
}
