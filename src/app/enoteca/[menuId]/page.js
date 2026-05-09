import { createServerSupabase } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import EnotecaJoinClient from './EnotecaJoinClient'

export default async function EnotecaMenuPage({ params }) {
  const { menuId } = await params
  const supabase = await createServerSupabase()

  // Usa la tabella games esistente (pubblicato = status 'published')
  const { data: game } = await supabase
    .from('games')
    .select('id, name, status')
    .eq('id', menuId)
    .single()

  if (!game || game.status !== 'published') notFound()

  const { data: bottles } = await supabase
    .from('game_bottles')
    .select('id')
    .eq('game_id', menuId)
    .order('bottle_order')

  return (
    <EnotecaJoinClient
      menuId={menuId}
      menuName={game.name}
      menuDescription={null}
      menuLocation={null}
      bottleCount={bottles?.length ?? 0}
    />
  )
}
