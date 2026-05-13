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

  const {data: leaderboard} = await supabase
    .from('enoteca_tasting_sessions')
    .select('id, nickname, table_name, total_score, status, completed_at')
    .eq('game_id', menuId)
    .eq('status', 'completed')
    .order('total_score', {ascending: false})

  return (
    <EnotecaBridgeClient
      menuId={menuId}
      menuName={game.name}
      menuDescription={null}
      menuLocation={null}
      bottles={bottles || []}
      questions={questions || []}
      leaderboard={leaderboard || []}
    />
  )
}
