'use client'

import {useRouter} from 'next/navigation'
import styles from './leaderboard.module.scss'
import {useT} from '@/lib/i18n/useT'

const APPLE_AVATARS = ['👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀', '🧑‍🍳', '👨‍⚕️']

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardClient({sessionId, gameName, players}) {
  const router = useRouter()
  const t = useT('live.leaderboard')

  const handleBackHome = () => {
    router.push('/dashboard')
  }

  const topThree = players.slice(0, 3)
  const rest = players.slice(3)

  return (
    <div className={styles.container}>
      <h1>{t('title')}</h1>
      <h2 className={styles.gameName}>{gameName}</h2>

      {/* Top 3 - Podio */}
      <div className={styles.podium}>
        {topThree.map((player, idx) => (
          <div key={player.id} className={`${styles.position} ${styles[`pos${idx + 1}`]}`}>
            <div className={styles.medal}>{MEDALS[idx]}</div>
            <div className={styles.avatar}>{APPLE_AVATARS[player.avatar_id - 1] || '👤'}</div>
            <h3 className={styles.nickname}>{player.nickname}</h3>
            <p className={styles.score}>
              {player.total_score} {t('pointsUnit')}
            </p>
          </div>
        ))}
      </div>

      {/* Resto della classifica */}
      {rest.length > 0 && (
        <div className={styles.ranking}>
          <h3>{t('fullLeaderboard')}</h3>
          <div className={styles.rankingList}>
            {rest.map((player, idx) => (
              <div key={player.id} className={styles.rankingRow}>
                <span className={styles.rank}>#{idx + 4}</span>
                <span className={styles.playerAvatar}>
                  {APPLE_AVATARS[player.avatar_id - 1] || '👤'}
                </span>
                <span className={styles.playerName}>{player.nickname}</span>
                <span className={styles.playerScore}>{player.total_score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleBackHome} className={styles.homeButton}>
        {t('backToDashboard')}
      </button>
    </div>
  )
}
