import {notFound, redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getLocaleText} from '@/lib/i18n/getLocaleText'
import {getServerLanguage} from '@/lib/i18n/server'
import styles from './print.module.scss'
import PrintSheetClient from './PrintSheetClient'

export default async function GamePrintPage({params}) {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const printText = getLocaleText(lang, 'printSheet', {})
  const resolvedParams = typeof params?.then === 'function' ? await params : params
  const gameId = resolvedParams?.id

  if (!gameId) notFound()

  const {data: game, error: gameError} = await supabase
    .from('games')
    .select('id, name, status, created_by')
    .eq('id', gameId)
    .single()

  if (gameError || !game) notFound()

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

  if (questionsError) {
    return (
      <main className={styles.page}>
        <p>{`${printText.loadError}: ${questionsError.message}`}</p>
      </main>
    )
  }

  const questions = (rawQuestions || [])
    .map((q) => ({
      id: q.id,
      text: q.text,
      kind: q.kind || null,
      isNeutral: q.is_neutral === true,
      options: [...(q.game_question_options || [])]
        .sort((a, b) => a.option_order - b.option_order)
        .map((opt) => opt.text),
    }))
    .slice(0, 5)

  const {data: bottleResults} = await supabase
    .from('game_bottles')
    .select('id, game_bottle_answers(id)')
    .eq('game_id', gameId)

  const hasResults = (bottleResults || []).some(
    (bottle) => (bottle.game_bottle_answers || []).length > 0,
  )

  return (
    <main className={styles.page}>
      <PrintSheetClient gameId={gameId} hasResults={hasResults} />

      <section className={styles.sheet}>
        <header className={styles.header}>
          <h1>{game.name}</h1>
          <div className={styles.playerRow}>
            <span>{`${printText.nameLabel}:`}</span>
            <div className={styles.line} />
          </div>
        </header>

        <div className={styles.questionsHeaderCard}>
          <div className={styles.questionsHeaderGrid}>
            <div className={styles.questionsHeaderLabel}>
              {printText.questionsLabel}
            </div>
            {Array.from({length: 5}).map((_, questionIndex) => {
              const question = questions[questionIndex]
              return (
                <div key={`qh-${questionIndex}`} className={styles.questionHeaderCol}>
                  <p className={styles.questionHeaderText}>{question?.text || '—'}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.tablesWrap}>
          {Array.from({length: 5}).map((_, bottleIndex) => (
            <article
              key={`table-${bottleIndex}`}
              className={`${styles.tableCard} ${bottleIndex % 2 === 0 ? styles.peach : styles.white}`}>
              <div className={styles.questionsGrid}>
                <aside className={styles.bottleImageCol} aria-hidden="true">
                  <img
                    src={`/bottle-print-${bottleIndex + 1}.svg`}
                    alt=""
                    className={styles.bottleImage}
                  />
                </aside>

                {Array.from({length: 5}).map((__, questionIndex) => {
                  const question = questions[questionIndex]
                  return (
                    <section
                      key={`q-${bottleIndex}-${questionIndex}`}
                      className={styles.questionCol}>
                      <ul>
                        {(question?.options || []).map((option, optionIndex) => (
                          <li key={`opt-${bottleIndex}-${questionIndex}-${optionIndex}`}>
                            <input
                              type="checkbox"
                              aria-label={`${option} ${printText.bottleLabel} ${bottleIndex + 1}`}
                            />
                            <span>{option}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
