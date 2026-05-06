import styles from './liveSessions.module.scss'

function Bone({w, h, style}) {
  return (
    <div
      className="skeleton"
      style={{width: w, height: h, borderRadius: 8, flexShrink: 0, ...style}}
    />
  )
}

export default function LiveSessionLoading() {
  return (
    <div className={styles.container}>
      {/* Back button */}
      <div className={styles.topBar}>
        <Bone w="110px" h="36px" style={{borderRadius: 12}} />
      </div>

      {/* Title */}
      <Bone w="240px" h="28px" style={{alignSelf: 'center', borderRadius: 6}} />

      {/* Lobby card */}
      <div className={styles.lobbyCard}>
        {/* Link section */}
        <div className={styles.section}>
          <Bone w="120px" h="18px" style={{marginBottom: 4}} />
          <Bone w="100%" h="44px" style={{borderRadius: 10}} />
          <Bone w="130px" h="36px" style={{borderRadius: 12}} />
        </div>

        {/* Players section */}
        <div className={styles.section}>
          <Bone w="160px" h="18px" style={{marginBottom: 4}} />
          <Bone w="80px" h="40px" style={{borderRadius: 8, alignSelf: 'center'}} />
        </div>

        {/* Actions */}
        <div style={{display: 'flex', gap: 10, justifyContent: 'center'}}>
          <Bone w="140px" h="44px" style={{borderRadius: 12}} />
          <Bone w="100px" h="44px" style={{borderRadius: 12}} />
        </div>
      </div>
    </div>
  )
}
