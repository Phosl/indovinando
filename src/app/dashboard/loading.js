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
          <Bone w="min(320px, 80%)" h="72px" style={{margin: '0 auto', borderRadius: 12}} />
          <Bone w="260px" h="28px" style={{margin: '14px auto 0', borderRadius: 8}} />
        </section>

        <nav className={styles.menuGrid}>
          <div style={{pointerEvents: 'none'}}>
            <Bone w="100%" h="154px" style={{borderRadius: 8}} />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{pointerEvents: 'none'}}>
              <Bone w="100%" h="140px" style={{borderRadius: 16}} />
            </div>
          ))}
        </nav>
      </div>
    </main>
  )
}
