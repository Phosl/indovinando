import {notFound, redirect, revalidatePath} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import GameEditClient from './GameEditClient'

export const metadata = {
  title: 'Modifica Gioco',
}

async function revalidateGamePage(gameId) {
  'use server'
  revalidatePath(`/game/${gameId}`)
}

export default async function GameEditPage({params}) {
  const supabase = await createServerSupabase()
  const resolvedParams = await Promise.resolve(params)
  const gameId = resolvedParams?.id

  if (!gameId) notFound()

  // Check auth
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Load game - must be owner
  const {data: game, error: gameError} = await supabase
    .from('games')
    .select('id, name, status, created_by')
    .eq('id', gameId)
    .eq('created_by', user.id)
    .single()

  if (gameError || !game) {
    notFound()
  }

  // Load questions with options
  const {data: questions} = await supabase
    .from('game_questions')
    .select('id, text, display_order, game_question_options(id, text, option_order)')
    .eq('game_id', gameId)
    .order('display_order')

  // Load bottles with answers
  const {data: bottles} = await supabase
    .from('game_bottles')
    .select('id, name, producer, year, bottle_order, game_bottle_answers(question_id, option_id)')
    .eq('game_id', gameId)
    .order('bottle_order')

  return (
    <GameEditClient
      gameId={gameId}
      initialGame={game}
      initialQuestions={questions || []}
      initialBottles={bottles || []}
      userId={user.id}
      onGameSaved={revalidateGamePage}
    />
  )
}
