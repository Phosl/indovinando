import {memo} from 'react'
import styles from '../playerLive.module.scss'
import {useT} from '@/lib/i18n/useT'
import AvatarDisplay from '@/components/AvatarDisplay'
import Icon from '@/components/Icon'

/**
 * Persistent top bar shown across all game screens.
 */
export const TopBar = memo(function TopBar({
  playerData,
  audioEnabled,
  onToggleAudio,
  onOpenLeaderboard,
  onOpenExit,
}) {
  const t = useT('live.topBar')

  return (
    <div className={styles.topBar}>
      <div className={styles.playerInfo}>
        <span className={styles.avatar}>
          <AvatarDisplay avatarId={playerData.avatar_id} size={24} />
        </span>
        <span className={styles.nickname}>{playerData.nickname}</span>
      </div>

      <div className={styles.topActions}>
        <button
          type="button"
          className={styles.audioButton}
          onClick={onToggleAudio}
          aria-label={audioEnabled ? t('audioOn') : t('audioOff')}
          title={audioEnabled ? t('audioOn') : t('audioOff')}>
          <Icon
            name={audioEnabled ? 'volumeOn' : 'volumeOff'}
            size={20}
            className={styles.topActionIcon}
          />
          <span>{audioEnabled ? t('audioOn') : t('audioOff')}</span>
        </button>
        <button type="button" className={styles.leaderboardButton} onClick={onOpenLeaderboard}>
          <Icon name="crown" size={20} className={styles.topActionIcon} />
          <span>{t('leaderboard')}</span>
        </button>
        <button
          type="button"
          className={styles.exitButton}
          onClick={onOpenExit}
          aria-label={t('exitGame')}
          title={t('exitGame')}>
          <Icon name="removeSmallIcon" size={28} />
        </button>
      </div>
    </div>
  )
})
