import styles from './dashboard.module.scss'

function Bone({w, h, style}) {
  return (
    <div
      className="skeleton"
      style={{width: w, height: h, borderRadius: 8, flexShrink: 0, ...style}}
    />
  )
}

export default function DashboardLoading() {
  return (
    <main className={styles.dashboard}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Bone w="220px" h="32px" style={{margin: '0 auto 10px'}} />
          <Bone w="150px" h="16px" style={{margin: '0 auto'}} />
        </div>

        {/* Action buttons */}
        <div className={styles.actionSection}>
          <Bone w="160px" h="44px" style={{borderRadius: 12}} />
          <Bone w="160px" h="44px" style={{borderRadius: 12}} />
        </div>

        {/* Games section */}
        <div className={styles.gamesSection}>
          <Bone w="180px" h="20px" style={{marginBottom: 16}} />
          <div className={styles.gamesList}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.gameCard} style={{minHeight: 56, gap: 12}}>
                <Bone w="40%" h="18px" />
                <Bone w="60px" h="20px" style={{borderRadius: 999}} />
                <Bone w="70px" h="14px" />
                <div style={{display: 'flex', gap: 6, marginLeft: 'auto'}}>
                  <Bone w="90px" h="36px" style={{borderRadius: 12}} />
                  <Bone w="90px" h="36px" style={{borderRadius: 12}} />
                  <Bone w="110px" h="36px" style={{borderRadius: 12}} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
