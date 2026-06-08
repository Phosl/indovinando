import {notFound, redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getLocaleText} from '@/lib/i18n/getLocaleText'
import TopBarBack from '@/components/TopBarBack'
import StartModeOptions from '@/components/game/StartModeOptions'
import styles from '../GamePlayPage.module.scss'
import modeStyles from '@/components/game/GamePlayView/GamePlayView.module.scss'

export default async function GameModePage({params}) {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const actionsText = getLocaleText(lang, 'gamePlayViewActions', {})
  const resolvedParams = typeof params?.then === 'function' ? await params : params
  const gameId = resolvedParams?.id

  if (!gameId) notFound()

  const {data: game, error: gameError} = await supabase
    .from('games')
    .select('id, name, status, created_by')
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

  const [{count: questionsCount}, {count: bottlesCount}] = await Promise.all([
    supabase.from('game_questions').select('id', {count: 'exact', head: true}).eq('game_id', gameId),
    supabase.from('game_bottles').select('id', {count: 'exact', head: true}).eq('game_id', gameId),
  ])

  if (!questionsCount || !bottlesCount) {
    redirect(`/game/${gameId}`)
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <TopBarBack title={game.name} href={`/game/${gameId}`} />

        <section className={`${modeStyles.card} ${modeStyles.startModePageCard}`}>
          <div className={modeStyles.startModePageHeader}>
            <span className={modeStyles.startModePageEyebrow}>{actionsText.startMatch}</span>
            <h1 className={modeStyles.startModePageTitle}>{actionsText.chooseMode}</h1>
            <p className={modeStyles.startModePageDescription}>{actionsText.chooseModeDescription}</p>
          </div>

          <StartModeOptions gameId={gameId} isPublished={game.status === 'published'} />
        </section>
      </div>
    </main>
  )
}
