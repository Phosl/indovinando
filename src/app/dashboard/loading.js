import styles from './dashboard.module.scss'

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

export default function DashboardLoading() {
  return (
    <main className={styles.dashboard}>
      <div className={styles.container}>
        <section className={styles.arcadeHero}>
          <Bone w="320px" h="44px" style={{margin: '0 auto'}} />
          <Bone w="220px" h="16px" style={{margin: '12px auto 0'}} />
          <div className={styles.heroActions}>
            <Bone w="190px" h="44px" style={{borderRadius: 12}} />
            <Bone w="150px" h="44px" style={{borderRadius: 12}} />
          </div>
        </section>

        {/* Games section */}
        <div className={styles.gamesSection}>
          <Bone w="180px" h="20px" style={{marginBottom: 16}} />
          <div className={styles.gamesList}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={styles.gameCard}
                style={{minHeight: 56, gap: 12, flexWrap: 'wrap'}}>
                <Bone w="32%" h="18px" />
                <Bone w="90px" h="20px" style={{borderRadius: 999}} />
                <Bone w="70px" h="14px" />
                <div style={{display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap'}}>
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
