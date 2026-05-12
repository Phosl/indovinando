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
        {/* Hero */}
        <section className={styles.arcadeHero}>
          <Bone w="min(320px, 80%)" h="44px" style={{margin: '0 auto'}} />
          <Bone w="140px" h="13px" style={{margin: '12px auto 0', borderRadius: 6}} />
          <Bone w="200px" h="15px" style={{margin: '8px auto 0', borderRadius: 6}} />
        </section>

        {/* Menu grid — 4 card skeletons */}
        <nav className={styles.menuGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.menuCard} style={{pointerEvents: 'none'}}>
              <Bone w="36px" h="36px" style={{borderRadius: 8}} />
              <Bone w="80px" h="14px" style={{borderRadius: 6}} />
            </div>
          ))}
        </nav>
      </div>
    </main>
  )
}
