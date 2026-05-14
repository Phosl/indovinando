'use client'

import {useState} from 'react'
import {useRouter} from 'next/navigation'
import TopBar from '@/components/TopBar'
import StoricoClient from '@/app/dashboard/storico/StoricoClient'
import styles from './miei-giochi.module.scss'
import storicoStyles from '@/app/dashboard/storico/storico.module.scss'

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
            <div className={styles.gamesHeaderActions}>
              <a href="/game/create" className="btn primary">
                {dashboardDict.createGame || '+ Crea gioco'}
              </a>
            </div>

            {games.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🎮</span>
                <p>
                  {dashboardDict.emptyStateFirstGame ||
                    'Non hai ancora creato giochi. Crea il tuo primo gioco per iniziare a giocare.'}
                </p>
                <a href="/game/create" className="btn primary">
                  {dashboardDict.createFirstGame || 'Crea il tuo primo gioco'}
                </a>
              </div>
            ) : (
              <div className={styles.gamesList}>
                {games.map((game) => (
                  <div key={game.id} className={styles.gameCard}>
                    <div className={styles.gameCardTop}>
                      <h3>{game.name}</h3>
                      <span
                        className={`${styles.statusBadge} ${game.status === 'published' ? styles.published : styles.draft}`}>
                        {game.status === 'published'
                          ? dashboardDict.published || 'Pubblicato'
                          : dashboardDict.draft || 'Bozza'}
                      </span>
                    </div>
                    <p className={styles.date}>
                      {dashboardDict.created || 'Creato il'}:{' '}
                      {new Date(game.created_at).toLocaleDateString(localeTag, {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </p>
                    <div className={styles.gameActions}>
                      <a
                        href={`/game/${game.id}/live`}
                        className={`${styles.liveAction} ${styles.actionBtn}`}>
                        {dashboardDict.playLive || '⚡ Gioca Live'}
                      </a>
                      {game.status === 'published' && (
                        <a
                          href={`/enoteca/${game.id}`}
                          className={`${styles.enotecaAction} ${styles.actionBtn}`}>
                          {dashboardDict.enoteca || 'Enoteca'}
                        </a>
                      )}
                      <a
                        href={`/game/${game.id}`}
                        className={`btn tertiary-bordered ${styles.actionBtn} ${styles.optionsAction}`}>
                        {dashboardDict.view || 'Opzioni'}
                      </a>
                    </div>
                  </div>
                ))}
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
