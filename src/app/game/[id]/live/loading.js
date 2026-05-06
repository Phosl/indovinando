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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          marginBottom: 4,
          background: 'var(--foreground)',
          border: '2px solid var(--button-secondary-border)',
          borderRadius: 12,
          boxShadow: '0px 3px 0px 0px var(--gray-light)',
          flexWrap: 'wrap',
        }}>
        <Bone w="90px" h="32px" style={{borderRadius: 12}} />
        <Bone w="220px" h="20px" style={{margin: '0 auto', borderRadius: 6}} />
        <div style={{minWidth: 90}} />
      </div>

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
