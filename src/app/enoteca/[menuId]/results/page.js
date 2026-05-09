import { createServerSupabase } from '@/lib/supabaseServer'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import EnotecaResultsClient from './EnotecaResultsClient'

export default async function EnotecaResultsPage({ params }) {
  const { menuId } = await params
  const supabase = await createServerSupabase()

  // Load menu + bottles + questions + options
  const { data: menu } = await supabase
    .from('enoteca_menus')
    .select('id, name, is_published')
    .eq('id', menuId)
    .single()

  if (!menu || !menu.is_published) notFound()

  const { data: bottles } = await supabase
    .from('enoteca_bottles')
    .select('id, name, producer, year, region, varietal, bottle_order')
    .eq('menu_id', menuId)
    .order('bottle_order')

  const bottleIds = (bottles ?? []).map((b) => b.id)

  const { data: questions } = await supabase
    .from('enoteca_questions')
    .select('id, bottle_id, text, question_order')
    .in('bottle_id', bottleIds.length ? bottleIds : ['none'])
    .order('question_order')

  const questionIds = (questions ?? []).map((q) => q.id)

  const { data: options } = questionIds.length
    ? await supabase
        .from('enoteca_options')
        .select('id, question_id, text, is_correct, option_order')
        .in('question_id', questionIds)
        .order('option_order')
    : { data: [] }

  return (
    <EnotecaResultsClient
      menuId={menuId}
      menuName={menu.name}
      bottles={bottles ?? []}
      questions={questions ?? []}
      options={options ?? []}
    />
  )
}
