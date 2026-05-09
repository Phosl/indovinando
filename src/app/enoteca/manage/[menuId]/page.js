import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect, notFound } from 'next/navigation'
import EnotecaEditorClient from './EnotecaEditorClient'

export default async function EnotecaManagePage({ params }) {
  const { menuId } = await params
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: menu } = await supabase
    .from('enoteca_menus')
    .select('id, name, description, location, is_published')
    .eq('id', menuId)
    .eq('user_id', user.id)
    .single()

  if (!menu) notFound()

  const { data: bottles } = await supabase
    .from('enoteca_bottles')
    .select('id, name, producer, year, region, varietal, description, bottle_order')
    .eq('menu_id', menuId)
    .order('bottle_order')

  const bottleIds = (bottles ?? []).map((b) => b.id)

  const { data: questions } = bottleIds.length
    ? await supabase
        .from('enoteca_questions')
        .select('id, bottle_id, text, question_order')
        .in('bottle_id', bottleIds)
        .order('question_order')
    : { data: [] }

  const questionIds = (questions ?? []).map((q) => q.id)

  const { data: options } = questionIds.length
    ? await supabase
        .from('enoteca_options')
        .select('id, question_id, text, is_correct, option_order')
        .in('question_id', questionIds)
        .order('option_order')
    : { data: [] }

  return (
    <EnotecaEditorClient
      menu={menu}
      initialBottles={bottles ?? []}
      initialQuestions={questions ?? []}
      initialOptions={options ?? []}
    />
  )
}
