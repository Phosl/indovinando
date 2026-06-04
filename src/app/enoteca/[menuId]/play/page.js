import {createServerSupabase} from '@/lib/supabaseServer'
import {notFound} from 'next/navigation'
import EnotecaPlayClient from './EnotecaPlayClient'

export default async function EnotecaPlayPage({params}) {
  const {menuId: gameId} = await params
  const supabase = await createServerSupabase()

  // Usa la tabella games esistente
  const {data: game} = await supabase
    .from('games')
    .select('id, name, status')
    .eq('id', gameId)
    .single()

  if (!game || game.status !== 'published') notFound()

  // Bottiglie ordinate
  const {data: bottles} = await supabase
    .from('game_bottles')
    .select('id, name, producer, year, bottle_order, game_bottle_answers(question_id, option_id)')
    .eq('game_id', gameId)
    .order('bottle_order')

  if (!bottles?.length) notFound()

  // Domande + opzioni (per gioco, non per bottiglia)
  const {data: rawQuestions} = await supabase
    .from('game_questions')
    .select('id, text, kind, is_neutral, display_order, game_question_options(id, text, option_order)')
    .eq('game_id', gameId)
    .order('display_order')

  const questions = (rawQuestions ?? []).map((q) => ({
    id: q.id,
    text: q.text,
    kind: q.kind || null,
    isNeutral: q.is_neutral === true,
    options: [...(q.game_question_options ?? [])].sort((a, b) => a.option_order - b.option_order),
  }))

  const bottlesParsed = bottles.map((b) => ({
    id: b.id,
    name: b.name,
    producer: b.producer,
    year: b.year,
    bottle_order: b.bottle_order,
    // mappa question_id → correct option_id
    correctAnswers: Object.fromEntries(
      (b.game_bottle_answers ?? []).map((a) => [a.question_id, a.option_id]),
    ),
  }))

  return (
    <EnotecaPlayClient
      menuId={gameId}
      menuName={game.name}
      bottles={bottlesParsed}
      questions={questions}
    />
  )
}
