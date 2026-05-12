'use client'

import {useEffect, useMemo, useState} from 'react'
import styles from './storico.module.scss'
import AvatarDisplay from '@/components/AvatarDisplay'

export default function StoricoClient({sessions, t, lang}) {
  const [activeGame, setActiveGame] = useState(null) // null = tutti
  const normalizeGameName = (name) =>
    String(name ?? '')
      .trim()
      .toLocaleLowerCase(lang || 'it')

  // Build unique game filter options preserving first-seen order
  const gameOptions = useMemo(() => {
    const map = new Map()
    for (const s of sessions) {
      const label = String(s.game_name ?? '').trim()
      if (!label) continue
      const key = normalizeGameName(label)
      if (!key) continue
      if (!map.has(key)) {
        map.set(key, {key, label, count: 1})
      } else {
        map.get(key).count += 1
      }
    }
    return Array.from(map.values())
  }, [sessions, lang])

  useEffect(() => {
    if (activeGame && !gameOptions.some((g) => g.key === activeGame)) {
      setActiveGame(null)
    }
  }, [activeGame, gameOptions])

  const filtered = useMemo(
    () =>
      activeGame ? sessions.filter((s) => normalizeGameName(s.game_name) === activeGame) : sessions,
    [sessions, activeGame, lang],
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
      {gameOptions.length > 1 && (
        <div className={styles.filterBar}>
          <button
            className={`${styles.pill} ${!activeGame ? styles.pillActive : ''}`}
            onClick={() => setActiveGame(null)}>
            {t.allGames || (lang === 'en' ? 'All' : 'Tutti')}
            <span className={styles.pillCount}>{sessions.length}</span>
          </button>
          {gameOptions.map((option) => {
            return (
              <button
                key={option.key}
                className={`${styles.pill} ${activeGame === option.key ? styles.pillActive : ''}`}
                onClick={() => setActiveGame(activeGame === option.key ? null : option.key)}>
                {option.label}
                <span className={styles.pillCount}>{option.count}</span>
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
                  <h3 className={styles.gameName}>{String(s.game_name ?? '').trim() || '—'}</h3>
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
                        <AvatarDisplay avatarId={p.avatar_id} size={28} />
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
                          <AvatarDisplay avatarId={p.avatar_id} size={24} />
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
