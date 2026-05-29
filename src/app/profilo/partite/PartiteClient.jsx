'use client'

import {useMemo, useState} from 'react'
import TopBar from '@/components/TopBar'
import {useRouter} from 'next/navigation'
import AvatarDisplay from '@/components/AvatarDisplay'
import {formatAppDateTime} from '@/lib/dateFormat'
import styles from './partite.module.scss'

export default function PartiteClient({lang, t, summary, matches}) {
  const router = useRouter()
  const [activeGame, setActiveGame] = useState(null)

  const gameOptions = useMemo(() => {
    const map = new Map()
    for (const match of matches) {
      const label = String(match.gameName || '').trim()
      if (!label) continue
      const key = label.toLocaleLowerCase(lang || 'it')
      if (!map.has(key)) map.set(key, {key, label, count: 1})
      else map.get(key).count += 1
    }
    return Array.from(map.values())
  }, [matches, lang])

  const filteredMatches = useMemo(() => {
    if (!activeGame) return matches
    return matches.filter(
      (match) => String(match.gameName || '').toLocaleLowerCase(lang || 'it') === activeGame,
    )
  }, [matches, activeGame, lang])

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <TopBar title={t.matchesTitle || (lang === 'en' ? 'Your matches' : 'Le tue partite')} onBack={() => router.push('/profilo')} />

        <section className={styles.card}>
          <div className={styles.summaryGrid}>
            <div className={styles.metric}>
              <span className={styles.metricValue}>{summary.totalMatches}</span>
              <span className={styles.metricLabel}>{t.totalMatches}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>{summary.totalWins}</span>
              <span className={styles.metricLabel}>{t.totalWins}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>{summary.totalScore}</span>
              <span className={styles.metricLabel}>{t.totalScore}</span>
            </div>
          </div>
          <p className={styles.rankText}>
            {summary.rank
              ? t.rankSummary.replace('{rank}', summary.rank).replace('{total}', summary.totalUsers)
              : t.rankPending}
          </p>
        </section>

        {gameOptions.length > 1 && (
          <section className={styles.filterBar}>
            <button
              type="button"
              className={`${styles.pill} ${!activeGame ? styles.pillActive : ''}`}
              onClick={() => setActiveGame(null)}>
              {lang === 'en' ? 'All' : 'Tutti'}
              <span className={styles.pillCount}>{matches.length}</span>
            </button>
            {gameOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`${styles.pill} ${activeGame === option.key ? styles.pillActive : ''}`}
                onClick={() => setActiveGame(activeGame === option.key ? null : option.key)}>
                {option.label}
                <span className={styles.pillCount}>{option.count}</span>
              </button>
            ))}
          </section>
        )}

        {filteredMatches.length === 0 ? (
          <section className={styles.card}>
            <p className={styles.empty}>{t.matchesEmpty}</p>
          </section>
        ) : (
          <section className={styles.list}>
            {filteredMatches.map((match) => (
              <article key={match.id} className={styles.matchCard}>
                <div className={styles.matchHead}>
                  <div className={styles.matchIdentity}>
                    {match.gameAvatar ? (
                      <img src={match.gameAvatar} alt="" aria-hidden="true" className={styles.matchGameAvatar} />
                    ) : (
                      <span className={styles.matchAvatar}>
                        <AvatarDisplay avatarId={match.myAvatarId} size={24} />
                      </span>
                    )}
                    <div>
                      <h3>{match.gameName}</h3>
                      <p>{formatAppDateTime(match.playedAt, lang)}</p>
                    </div>
                  </div>
                  <div className={styles.matchHeadRight}>
                    <span className={`${styles.modeBadge} ${match.mode === 'live' ? styles.live : styles.enoteca}`}>
                      {match.mode === 'live' ? 'Live' : 'Enoteca'}
                    </span>
                  </div>
                </div>

                <div className={styles.playersList}>
                  <div className={styles.playerRow}>
                    <div className={styles.playerInfo}>
                      <AvatarDisplay avatarId={match.myAvatarId} size={22} />
                      <span>{match.myNickname || (lang === 'en' ? 'You' : 'Tu')}</span>
                    </div>
                    <strong className={styles.playerScore}>
                      {match.score} {t.pointsUnit}
                    </strong>
                  </div>

                  {match.opponents.map((opponent) => (
                    <div key={opponent.id} className={styles.playerRow}>
                      <div className={styles.playerInfo}>
                        <AvatarDisplay avatarId={opponent.avatarId} size={22} />
                        <span>{opponent.nickname}</span>
                      </div>
                      <strong className={styles.playerScore}>
                        {opponent.score} {t.pointsUnit}
                      </strong>
                    </div>
                  ))}

                  {match.opponents.length === 0 && (
                    <div className={styles.playerRow}>
                      <span className={styles.noOpponents}>
                        {lang === 'en' ? 'No opponents' : 'Nessun avversario'}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
