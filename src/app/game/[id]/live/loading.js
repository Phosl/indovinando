import styles from './liveSessions.module.scss'

function Bone({w, h, style}) {
  return (
    <div
      className="skeleton"
      style={{
        width: w,
        height: h,
        borderRadius: 8,
        flexShrink: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    />
  )
}

export default function LiveSessionLoading() {
  return (
    <div className={styles.container}>
      <div
        className="skeleton-frame"
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 40px',
          alignItems: 'center',
          columnGap: 12,
          width: '100%',
          maxWidth: 960,
          padding: '10px 14px',
          margin: '0 auto 16px auto',
          boxSizing: 'border-box',
        }}>
        <Bone w="40px" h="40px" style={{borderRadius: 10}} />
        <Bone w="200px" h="20px" style={{margin: '0 auto', borderRadius: 6}} />
        <Bone w="40px" h="40px" style={{borderRadius: 10, marginLeft: 'auto'}} />
      </div>

      {/* Indeterminate progress bar */}
      <div className={styles.progressBarTrack}>
        <div className={styles.progressBarFill} />
      </div>

      {/* Lobby card skeleton — same structure as LiveSessionClient loading state */}
      <div className={styles.lobbyCard}>
        {/* Link section */}
        <div className={styles.section}>
          <Bone w="40%" h="14px" style={{borderRadius: 6, marginBottom: 2}} />
          <div className={styles.linkBox}>
            <Bone w="100%" h="44px" style={{borderRadius: 8, flex: 1}} />
            <Bone w="80px" h="44px" style={{borderRadius: 12, flexShrink: 0}} />
          </div>
        </div>

        {/* Participants section */}
        <div className={styles.section}>
          <Bone w="40%" h="14px" style={{borderRadius: 6, marginBottom: 2}} />
          <Bone w="80%" h="12px" style={{borderRadius: 6}} />
        </div>

        {/* Details section */}
        <div className={styles.section}>
          <Bone w="30%" h="12px" style={{borderRadius: 6, marginBottom: 4}} />
          <Bone w="100%" h="36px" style={{borderRadius: 8, marginTop: 4}} />
          <Bone w="100%" h="36px" style={{borderRadius: 8, marginTop: 4}} />
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Bone w="auto" h="48px" style={{borderRadius: 12, flex: 1, minWidth: 160}} />
          <Bone w="auto" h="48px" style={{borderRadius: 12, flex: 1, minWidth: 120}} />
        </div>
      </div>
    </div>
  )
}
