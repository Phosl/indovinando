import { createServerSupabase } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import EnotecaResultsClient from './EnotecaResultsClient'

export default async function EnotecaResultsPage({ params }) {
  const { menuId: gameId } = await params
  const supabase = await createServerSupabase()

  const { data: game } = await supabase
    .from('games')
    .select('id, name, status')
    .eq('id', gameId)
    .single()

  if (!game || game.status !== 'published') notFound()

  const { data: bottles } = await supabase
    .from('game_bottles')
    .select('id, name, producer, year, bottle_order, game_bottle_answers(question_id, option_id)')
    .eq('game_id', gameId)
    .order('bottle_order')

  const { data: rawQuestions } = await supabase
    .from('game_questions')
    .select('id, text, display_order, game_question_options(id, text, option_order)')
    .eq('game_id', gameId)
    .order('display_order')

  const questions = (rawQuestions ?? []).map((q) => ({
    id: q.id,
    text: q.text,
    options: [...(q.game_question_options ?? [])].sort((a, b) => a.option_order - b.option_order),
  }))

  const bottlesParsed = (bottles ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    producer: b.producer,
    year: b.year,
    bottle_order: b.bottle_order,
    correctAnswers: Object.fromEntries(
      (b.game_bottle_answers ?? []).map((a) => [a.question_id, a.option_id])
    ),
  }))

  return (
    <EnotecaResultsClient
      menuId={gameId}
      menuName={game.name}
      bottles={bottlesParsed}
      questions={questions}
    />
  )
}
