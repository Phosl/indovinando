'use client'

import {useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import StoricoClient from '@/app/dashboard/storico/StoricoClient'
import styles from './miei-giochi.module.scss'

export default function MieiGiochiClient({
  games,
  sessions,
  lang,
  localeTag,
  dashboardDict,
  storicoDict,
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('games')

  return (
    <div className={styles.page}>
      <div className={styles.topBarContainer}>
        <TopBar
          title={
            activeTab === 'games'
              ? dashboardDict.myGames || 'I miei giochi'
              : storicoDict.title || '📜 Storico partite'
          }
          onBack={() => router.push('/dashboard')}
        />
      </div>

      {/* ── Tab bar ── */}
      <div className={styles.tabBar}>
        <div className={styles.tabTrack}>
          <button
            className={`${styles.tab} ${activeTab === 'games' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('games')}>
            {dashboardDict.myGames || 'I miei giochi'}
            {games.length > 0 && <span className={styles.tabBadge}>{games.length}</span>}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'storico' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('storico')}>
            {storicoDict.tabLabel || 'Storico'}
            {sessions.length > 0 && <span className={styles.tabBadge}>{sessions.length}</span>}
          </button>
        </div>
      </div>
      <div className={styles.content}>
        {activeTab === 'games' && (
          <div className={styles.gamesTab}>
            {games.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🎮</span>
                <p>
                  {dashboardDict.emptyStateFirstGame ||
                    'Non hai ancora creato giochi. Crea il tuo primo gioco per iniziare a giocare.'}
                </p>
                <Link href="/game/create" className="btn success">
                  {dashboardDict.createFirstGame || 'Crea il tuo primo gioco'}
                </Link>
              </div>
            ) : (
              <div className={styles.gamesList}>
                {games.map((game) => {
                  const bottles = [...(game.game_bottles || [])].sort(
                    (a, b) => (a.bottle_order || 0) - (b.bottle_order || 0),
                  )
                  const questionsCount = (game.game_questions || []).length
                  const bottlePreview = bottles.slice(0, 3)
                  const hiddenBottles = Math.max(0, bottles.length - bottlePreview.length)

                  return (
                    <Link key={game.id} href={`/game/${game.id}`} className={styles.gameCardLink}>
                      <article className={styles.gameCard}>
                        <div className={styles.gameCardTop}>
                          <h3>{game.name}</h3>
                          <div className={styles.gameCardMeta}>
                            <p className={styles.date}>
                              {new Date(game.created_at).toLocaleDateString(localeTag, {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </p>
                            {/* <span
                              className={`${styles.statusBadge} ${
                                game.status === 'published' ? styles.published : styles.draft
                              }`}>
                              {game.status === 'published'
                                ? dashboardDict.published || 'Pubblicato'
                                : dashboardDict.draft || 'Bozza'}
                            </span> */}
                          </div>
                        </div>

                        <div className={styles.statsRow}>
                          <span>Bottiglie ({bottles.length})</span>
                          <span>Domande ({questionsCount})</span>
                        </div>

                        <div className={styles.bottleLabels}>
                          {bottlePreview.map((bottle, index) => (
                            <span
                              key={bottle.id || `${game.id}-preview-bottle-${index}`}
                              className={styles.bottleLabel}>
                              {(bottle.name || 'Senza nome') +
                                ' - ' +
                                (bottle.producer || 'Produttore non indicato')}
                            </span>
                          ))}
                          {hiddenBottles > 0 && (
                            <span className={styles.bottleMore}>+{hiddenBottles}...</span>
                          )}
                        </div>
                      </article>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'storico' && (
          <StoricoClient sessions={sessions} t={storicoDict} lang={lang} />
        )}
      </div>
    </div>
  )
}
