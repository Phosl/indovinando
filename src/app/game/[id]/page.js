import {notFound, redirect} from 'next/navigation'
import Link from 'next/link'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getGameAvatarOptions} from '@/lib/gameAvatarOptions'
import TopBarBack from '@/components/TopBarBack'
import GamePlayPageClient from './GamePlayPageClient'
import {deleteGame} from './actions'
import styles from './GamePlayPage.module.scss'

export default async function GamePlayPage({params}) {
  const supabase = await createServerSupabase()
  const resolvedParams = typeof params?.then === 'function' ? await params : params
  const gameId = resolvedParams?.id

  if (!gameId) notFound()

  const {data: game, error: gameError} = await supabase
    .from('games')
    .select('id, name, status, created_by, cover_index, created_at')
    .eq('id', gameId)
    .single()

  if (gameError || !game) {
    notFound()
  }

  const {
    data: {user},
  } = await supabase.auth.getUser()

  const isOwner = user?.id === game.created_by

  if (game.status !== 'published' && !isOwner) {
    redirect('/auth')
  }

  const {data: rawQuestions, error: questionsError} = await supabase
    .from('game_questions')
    .select('id, text, kind, is_neutral, display_order, game_question_options(id, text, option_order)')
    .eq('game_id', gameId)
    .order('display_order', {ascending: true})

  const {data: rawBottles, error: bottlesError} = await supabase
    .from('game_bottles')
    .select(
      'id, name, producer, year, wine_type, bottle_order, game_bottle_answers(question_id, option_id)',
    )
    .eq('game_id', gameId)
    .order('bottle_order', {ascending: true})

  const {data: historySessions} = isOwner
    ? await supabase
        .from('live_session_results')
        .select('id, game_name, played_at, player_count, players')
        .eq('host_user_id', user.id)
        .eq('game_name', game.name)
        .order('played_at', {ascending: false})
        .limit(100)
    : {data: []}
  const avatarOptions = await getGameAvatarOptions()

  if (questionsError || bottlesError) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <TopBarBack title={game.name || 'Gioco'} href="/miei-giochi" />
          <section className={styles.emptyCard}>
            <h1 className={styles.emptyTitle}>Errore caricamento partita</h1>
            <p className={styles.emptyText}>{questionsError?.message || bottlesError?.message}</p>
            <div className={styles.emptyActions}>
              <Link href="/miei-giochi" className="btn neutral btn-small">
                Torna indietro
              </Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  const questions = (rawQuestions || []).map((q) => ({
    id: q.id,
    text: q.text,
    kind: q.kind || null,
    isNeutral: q.is_neutral === true,
    options: [...(q.game_question_options || [])].sort((a, b) => a.option_order - b.option_order),
  }))

  const bottles = (rawBottles || []).map((b) => ({
    id: b.id,
    name: b.name,
    producer: b.producer,
    year: b.year,
    wineType: b.wine_type || '',
    answers: b.game_bottle_answers || [],
  }))

  return (
    <GamePlayPageClient
      game={game}
      questions={questions}
      bottles={bottles}
      historySessions={historySessions || []}
      avatarOptions={avatarOptions}
      isOwner={isOwner}
      onDelete={deleteGame}
    />
  )
}
