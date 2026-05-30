'use client'

import {useRouter} from 'next/navigation'
import AvatarDisplay from '@/components/AvatarDisplay'
import styles from '@/app/live/session/[sessionId]/leaderboard/leaderboard.module.scss'

const MEDALS = ['🥇', '🥈', '🥉']

function avatarFromNickname(nickname = '') {
  let hash = 0
  for (let i = 0; i < nickname.length; i += 1) {
    hash = (hash * 31 + nickname.charCodeAt(i)) >>> 0
  }
  return (hash % 10) + 1
}

export default function TableLiveLeaderboardClient({
  sessionId,
  gameName,
  players,
  isAuthenticated,
  isHostUser,
}) {
  const router = useRouter()

  const handlePrimaryAction = () => {
    if (!isAuthenticated) {
      router.push(
        `/auth?mode=register&next=${encodeURIComponent(`/table-live/session/${sessionId}/leaderboard`)}`,
      )
      return
    }
    router.push(isHostUser ? '/miei-giochi' : '/')
  }

  const topThree = players.slice(0, 3)
  const rest = players.slice(3)

  return (
    <div className={styles.container}>
      <h1>Classifica Finale</h1>
      <h2 className={styles.gameName}>{gameName}</h2>

      <div className={styles.podium}>
        {topThree.map((player, idx) => (
          <div key={player.id} className={`${styles.position} ${styles[`pos${idx + 1}`]}`}>
            <div className={styles.medal}>{MEDALS[idx]}</div>
            <div className={styles.avatar}>
              <AvatarDisplay avatarId={avatarFromNickname(player.nickname)} size={40} />
            </div>
            <h3 className={styles.nickname}>{player.nickname}</h3>
            <p className={styles.score}>{player.total_score || 0} punti</p>
          </div>
        ))}
      </div>

      {rest.length > 0 ? (
        <div className={styles.ranking}>
          <h3>Classifica completa</h3>
          <div className={styles.rankingList}>
            {rest.map((player, idx) => (
              <div key={player.id} className={styles.rankingRow}>
                <span className={styles.rank}>#{idx + 4}</span>
                <span className={styles.playerAvatar}>
                  <AvatarDisplay avatarId={avatarFromNickname(player.nickname)} size={28} />
                </span>
                <span className={styles.playerName}>{player.nickname}</span>
                <span className={styles.playerScore}>{player.total_score || 0}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <button onClick={handlePrimaryAction} className={styles.homeButton}>
        {!isAuthenticated ? 'Registrati' : 'Fine gioco'}
      </button>
    </div>
  )
}

