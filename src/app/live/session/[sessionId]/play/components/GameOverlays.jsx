import styles from '../playerLive.module.scss'

const APPLE_AVATARS = ['👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀', '🧑‍🍳', '👨‍⚕️']

export function GameOverlays({
  leaderboardOpen,
  exitModalOpen,
  sortedLeaderboard,
  playerData,
  isHostUser,
  onKickPlayer,
  onCloseLeaderboard,
  onCloseExit,
  onExitGame,
}) {
  return (
    <>
      {leaderboardOpen && (
        <div className={styles.sheetBackdrop} onClick={onCloseLeaderboard}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h3>🏆 Classifica Live</h3>
            <div className={styles.sheetList}>
              {sortedLeaderboard.map((player, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                const isMe = player.id === playerData?.id
                return (
                  <div
                    key={player.id}
                    className={`${styles.sheetRow} ${isMe ? styles.sheetRowMe : ''}`}>
                    <span className={styles.sheetRank}>{medal ?? `#${idx + 1}`}</span>
                    <span className={styles.sheetAvatar}>
                      {APPLE_AVATARS[player.avatar_id - 1] || '👤'}
                    </span>
                    <span className={styles.sheetName}>
                      {player.nickname}
                      {isMe ? ' (tu)' : ''}
                    </span>
                    <span className={styles.sheetScore}>{player.total_score || 0} pt</span>
                    {isHostUser && !isMe && (
                      <button
                        className={styles.kickButton}
                        onClick={() => onKickPlayer(player.id)}
                        title={`Rimuovi ${player.nickname}`}>
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}
              {sortedLeaderboard.length === 0 && (
                <p className={styles.readyHint}>Nessun giocatore ancora.</p>
              )}
            </div>
            <button className={styles.sheetClose} onClick={onCloseLeaderboard}>
              Chiudi
            </button>
          </div>
        </div>
      )}

      {exitModalOpen && (
        <div className={styles.sheetBackdrop} onClick={onCloseExit}>
          <div
            className={`${styles.sheet} ${styles.exitSheet}`}
            onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <div className={styles.exitLottiePlaceholder} aria-hidden="true">
              😟
            </div>
            <h3>Vuoi uscire dal gioco?</h3>
            <p className={styles.exitHint}>
              Potrai rientrare dalla sessione, ma lascerai questa schermata.
            </p>
            <div className={styles.exitActions}>
              <button className={styles.exitSecondary} onClick={onCloseExit}>
                Annulla
              </button>
              <button className={styles.exitDanger} onClick={onExitGame}>
                Esci dal gioco
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
