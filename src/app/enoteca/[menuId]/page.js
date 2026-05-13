import {createServerSupabase} from '@/lib/supabaseServer'
import {notFound} from 'next/navigation'
import EnotecaBridgeClient from './EnotecaBridgeClient'

export default async function EnotecaMenuPage({params}) {
  const {menuId} = await params
  const supabase = await createServerSupabase()

  // Usa la tabella games esistente (pubblicato = status 'published')
  const {data: game} = await supabase
    .from('games')
    .select('id, name, status')
    .eq('id', menuId)
    .single()

  if (!game || game.status !== 'published') notFound()

  const {data: bottles} = await supabase
    .from('game_bottles')
    .select('id, name, producer, year, bottle_order')
    .eq('game_id', menuId)
    .order('bottle_order')

  const {data: questions} = await supabase
    .from('game_questions')
    .select('id, text, display_order')
    .eq('game_id', menuId)
    .order('display_order')

  return (
    <EnotecaBridgeClient
      menuId={menuId}
      menuName={game.name}
      menuDescription={null}
      menuLocation={null}
      bottles={bottles || []}
      questions={questions || []}
    />
  )
}
