import styles from '../playerLive.module.scss'

const APPLE_AVATARS = ['👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀', '🧑‍🍳', '👨‍⚕️']

/**
 * Persistent top bar shown across all game screens.
 * withProgress=true renders the slide-progress pill row.
 */
export function TopBar({
  playerData,
  liveQuestions,
  currentSlideIndex,
  withProgress,
  audioEnabled,
  onToggleAudio,
  onOpenLeaderboard,
  onOpenExit,
}) {
  return (
    <div className={styles.topBar}>
      <div className={styles.playerInfo}>
        <span className={styles.avatar}>{APPLE_AVATARS[playerData.avatar_id - 1] || '👤'}</span>
        <span className={styles.nickname}>{playerData.nickname}</span>
      </div>

      {withProgress && (
        <div className={styles.progressPills}>
          {liveQuestions.map((_, idx) => (
            <span
              key={idx}
              className={`${styles.pill} ${idx < currentSlideIndex ? styles.pillDone : ''} ${
                idx === currentSlideIndex ? styles.pillActive : ''
              }`}
            />
          ))}
        </div>
      )}

      <div className={styles.topActions}>
        <button className={styles.audioButton} onClick={onToggleAudio}>
          {audioEnabled ? '🔊 ON' : '🔇 OFF'}
        </button>
        <button className={styles.leaderboardButton} onClick={onOpenLeaderboard}>
          Classifica
        </button>
        <button className={styles.exitButton} onClick={onOpenExit} aria-label="Esci dal gioco">
          X
        </button>
      </div>
    </div>
  )
}
