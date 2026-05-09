import { createServerSupabase } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import EnotecaJoinClient from './EnotecaJoinClient'

export default async function EnotecaMenuPage({ params }) {
  const { menuId } = await params
  const supabase = await createServerSupabase()

  const { data: menu } = await supabase
    .from('enoteca_menus')
    .select('id, name, description, location, is_published')
    .eq('id', menuId)
    .single()

  if (!menu || !menu.is_published) notFound()

  const { data: bottles } = await supabase
    .from('enoteca_bottles')
    .select('id')
    .eq('menu_id', menuId)
    .order('bottle_order')

  return (
    <EnotecaJoinClient
      menuId={menuId}
      menuName={menu.name}
      menuDescription={menu.description}
      menuLocation={menu.location}
      bottleCount={bottles?.length ?? 0}
    />
  )
}
