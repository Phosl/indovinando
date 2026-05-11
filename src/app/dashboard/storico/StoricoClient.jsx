'use client'

import {useMemo, useState} from 'react'
import styles from './storico.module.scss'

const APPLE_AVATARS = ['👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀', '🧑‍🍳', '👨‍⚕️']

export default function StoricoClient({sessions, t, lang}) {
  const [activeGame, setActiveGame] = useState(null) // null = tutti

  // Extract unique game names preserving first-seen order
  const gameNames = useMemo(() => {
    const seen = new Set()
    const names = []
    for (const s of sessions) {
      if (s.game_name && !seen.has(s.game_name)) {
        seen.add(s.game_name)
        names.push(s.game_name)
      }
    }
    return names
  }, [sessions])

  const filtered = useMemo(
    () => (activeGame ? sessions.filter((s) => s.game_name === activeGame) : sessions),
    [sessions, activeGame],
  )

  const locale = lang === 'en' ? 'en-GB' : 'it-IT'

  if (!sessions.length) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🎭</span>
        <p>{t.empty}</p>
      </div>
    )
  }

  return (
    <>
      {/* ── Filter pills ── */}
      {gameNames.length > 1 && (
        <div className={styles.filterBar}>
          <button
            className={`${styles.pill} ${!activeGame ? styles.pillActive : ''}`}
            onClick={() => setActiveGame(null)}>
            {t.allGames}
            <span className={styles.pillCount}>{sessions.length}</span>
          </button>
          {gameNames.map((name) => {
            const count = sessions.filter((s) => s.game_name === name).length
            return (
              <button
                key={name}
                className={`${styles.pill} ${activeGame === name ? styles.pillActive : ''}`}
                onClick={() => setActiveGame(activeGame === name ? null : name)}>
                {name}
                <span className={styles.pillCount}>{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Session list ── */}
      <div className={styles.list}>
        {filtered.map((s) => {
          const played = new Date(s.played_at)
          return (
            <div key={s.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.gameName}>{s.game_name}</h3>
                  <span className={styles.date}>
                    {played.toLocaleDateString(locale, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {' · '}
                    {played.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}
                  </span>
                </div>
                <span className={styles.playerCount}>
                  👥 {s.player_count} {s.player_count === 1 ? t.player : t.players}
                </span>
              </div>

              {s.players?.length > 0 && (
                <div className={styles.podium}>
                  {s.players.slice(0, 3).map((p, idx) => (
                    <div key={p.id} className={`${styles.podiumItem} ${styles[`rank${idx + 1}`]}`}>
                      <span className={styles.medal}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </span>
                      <span className={styles.avatar}>
                        {APPLE_AVATARS[p.avatar_id - 1] || '👤'}
                      </span>
                      <span className={styles.nickname}>{p.nickname}</span>
                      <span className={styles.score}>
                        {p.total_score} {t.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {s.players?.length > 3 && (
                <details className={styles.moreDetails}>
                  <summary className={styles.moreSummary}>
                    {t.showAll} ({s.players.length})
                  </summary>
                  <div className={styles.fullList}>
                    {s.players.map((p, idx) => (
                      <div key={p.id} className={styles.fullRow}>
                        <span className={styles.fullRank}>#{idx + 1}</span>
                        <span className={styles.fullAvatar}>
                          {APPLE_AVATARS[p.avatar_id - 1] || '👤'}
                        </span>
                        <span className={styles.fullNickname}>{p.nickname}</span>
                        <span className={styles.fullScore}>
                          {p.total_score} {t.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
