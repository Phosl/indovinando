import {memo, useState} from 'react'
import styles from '../playerLive.module.scss'
import {useT} from '@/lib/i18n/useT'
import AvatarDisplay from '@/components/AvatarDisplay'

export const GameOverlays = memo(function GameOverlays({
  leaderboardOpen,
  exitModalOpen,
  sortedLeaderboard,
  isLoadingStandings,
  playerData,
  isHostUser,
  onKickPlayer,
  onCloseLeaderboard,
  onCloseExit,
  onExitGame,
}) {
  const t = useT('live.overlays')
  const [pendingKickPlayer, setPendingKickPlayer] = useState(null)

  return (
    <>
      {leaderboardOpen && (
        <div className={styles.sheetBackdrop} onClick={onCloseLeaderboard}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h3>{t('liveLeaderboard')}</h3>
            <div className={styles.sheetList}>
              {isLoadingStandings && sortedLeaderboard.length === 0
                ? [0, 1, 2].map((i) => (
                    <div key={i} className={styles.sheetRow}>
                      <span className={`skeleton ${styles.standingSkeletonRank}`} />
                      <span className={`skeleton ${styles.standingSkeletonAvatar}`} />
                      <span className={`skeleton ${styles.standingSkeletonName}`} />
                      <span className={`skeleton ${styles.standingSkeletonScore}`} />
                    </div>
                  ))
                : sortedLeaderboard.map((player, idx) => {
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                    const isMe = player.id === playerData?.id
                    return (
                      <div
                        key={player.id}
                        className={`${styles.sheetRow} ${isMe ? styles.sheetRowMe : ''}`}>
                        <span className={styles.sheetRank}>{medal ?? `#${idx + 1}`}</span>
                        <span className={styles.sheetAvatar}>
                          <AvatarDisplay avatarId={player.avatar_id} size={24} />
                        </span>
                        <span className={styles.sheetName}>
                          {player.nickname}
                          {isMe ? t('youSuffix') : ''}
                        </span>
                        <span className={styles.sheetScore}>
                          {player.liveTotalScore ?? player.total_score ?? 0} {t('pointsUnit')}
                          {(player.roundPoints || 0) > 0 && (
                            <span className={styles.standingDelta}>+{player.roundPoints}</span>
                          )}
                          {isHostUser && !isMe && (
                            <button
                              className={styles.kickButton}
                              onClick={() => setPendingKickPlayer(player)}
                              title={`${t('remove')} ${player.nickname}`}>
                              ✕
                            </button>
                          )}
                        </span>
                      </div>
                    )
                  })}
              {sortedLeaderboard.length === 0 && !isLoadingStandings && (
                <p className={styles.readyHint}>{t('noPlayersYet')}</p>
              )}
            </div>
            <button className={styles.sheetClose + ' btn neutral'} onClick={onCloseLeaderboard}>
              {t('close')}
            </button>

            {pendingKickPlayer && (
              <div
                className={styles.kickConfirmBackdrop}
                onClick={() => setPendingKickPlayer(null)}>
                <div className={styles.kickConfirmCard} onClick={(e) => e.stopPropagation()}>
                  <h4>{t('removePlayerTitle')}</h4>
                  <p>
                    {t('removePlayerDesc')} <strong>{pendingKickPlayer.nickname}</strong>?
                  </p>
                  <div className={styles.kickConfirmActions}>
                    <button
                      className="btn warning"
                      onClick={() => setPendingKickPlayer(null)}>
                      {t('cancel')}
                    </button>
                    <button
                      className={styles.exitDanger}
                      onClick={() => {
                        onKickPlayer(pendingKickPlayer.id)
                        setPendingKickPlayer(null)
                      }}>
                      {t('removePlayerConfirm')}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
            <h3>{t('leaveGameTitle')}</h3>
            <p className={styles.exitHint}>{t('leaveGameDesc')}</p>
            <div className={styles.exitActions}>
              <button className="btn warning" onClick={onCloseExit}>
                {t('cancel')}
              </button>
              <button className="btn danger" onClick={onExitGame}>
                {t('exitGame')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
})
