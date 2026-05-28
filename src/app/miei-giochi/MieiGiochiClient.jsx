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
                {games.map((game) => (
                  <div key={game.id} className="card">
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
                      <Link href={`/game/${game.id}/live`} className="btn success btn-small ">
                        {dashboardDict.playLive || '⚡ Gioca Live'}
                      </Link>
                      {game.status === 'published' && (
                        <Link href={`/enoteca/${game.id}`} className="btn secondary btn-small">
                          {dashboardDict.enoteca || 'Enoteca'}
                        </Link>
                      )}
                      <Link href={`/game/${game.id}`} className="btn tertiary-bordered btn-small">
                        {dashboardDict.view || 'Opzioni'}
                      </Link>
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
