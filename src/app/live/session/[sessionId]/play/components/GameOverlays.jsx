import {memo} from 'react'
import styles from '../playerLive.module.scss'
import {useLanguage} from '@/components/i18n/LanguageProvider'

const APPLE_AVATARS = ['👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀', '🧑‍🍳', '👨‍⚕️']

export const GameOverlays = memo(function GameOverlays({
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
  const {lang} = useLanguage()
  const isEnglish = lang === 'en'

  return (
    <>
      {leaderboardOpen && (
        <div className={styles.sheetBackdrop} onClick={onCloseLeaderboard}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h3>{isEnglish ? '🏆 Live Leaderboard' : '🏆 Classifica Live'}</h3>
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
                      {isMe ? (isEnglish ? ' (you)' : ' (tu)') : ''}
                    </span>
                    <span className={styles.sheetScore}>
                      {player.liveTotalScore ?? player.total_score ?? 0} {isEnglish ? 'pts' : 'pt'}
                      {(player.roundPoints || 0) > 0 && (
                        <span className={styles.standingDelta}>+{player.roundPoints}</span>
                      )}
                    </span>
                    {isHostUser && !isMe && (
                      <button
                        className={styles.kickButton}
                        onClick={() => onKickPlayer(player.id)}
                        title={`${isEnglish ? 'Remove' : 'Rimuovi'} ${player.nickname}`}>
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}
              {sortedLeaderboard.length === 0 && (
                <p className={styles.readyHint}>
                  {isEnglish ? 'No players yet.' : 'Nessun giocatore ancora.'}
                </p>
              )}
            </div>
            <button className={styles.sheetClose} onClick={onCloseLeaderboard}>
              {isEnglish ? 'Close' : 'Chiudi'}
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
            <h3>{isEnglish ? 'Do you want to leave the game?' : 'Vuoi uscire dal gioco?'}</h3>
            <p className={styles.exitHint}>
              {isEnglish
                ? 'You can rejoin from the session page, but you will leave this screen.'
                : 'Potrai rientrare dalla sessione, ma lascerai questa schermata.'}
            </p>
            <div className={styles.exitActions}>
              <button className={styles.exitSecondary} onClick={onCloseExit}>
                {isEnglish ? 'Cancel' : 'Annulla'}
              </button>
              <button className={styles.exitDanger} onClick={onExitGame}>
                {isEnglish ? 'Exit game' : 'Esci dal gioco'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
})
