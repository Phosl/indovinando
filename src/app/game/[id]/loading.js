import styles from './GamePlayPage.module.css'

function Bone({w, h, style}) {
  return (
    <div
      className="skeleton"
      style={{width: w, height: h, borderRadius: 8, flexShrink: 0, ...style}}
    />
  )
}

export default function GameLoading() {
  return (
    <main style={{padding: '16px', maxWidth: 960, margin: '0 auto'}}>
      {/* Header bar */}
      <div className={styles.pageHeader}>
        <Bone w="90px" h="32px" style={{borderRadius: 12}} />
        <Bone w="200px" h="20px" style={{margin: '0 auto', borderRadius: 6}} />
        <div className={styles.headerActions}>
          <Bone w="110px" h="36px" style={{borderRadius: 12}} />
          <Bone w="120px" h="36px" style={{borderRadius: 12}} />
        </div>
      </div>

      {/* Content card — question list placeholder */}
      <div
        style={{
          background: 'var(--foreground)',
          border: '2px solid var(--button-secondary-border)',
          borderRadius: 12,
          boxShadow: '0px 4px 0px 0px var(--gray-light)',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
        <Bone w="60%" h="24px" />
        <Bone w="40%" h="14px" />

        {[1, 2, 3].map((i) => (
          <div key={i} style={{display: 'flex', flexDirection: 'column', gap: 10}}>
            <Bone w="55%" h="16px" />
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
              {[1, 2, 3, 4].map((j) => (
                <Bone key={j} w="120px" h="38px" style={{borderRadius: 10}} />
              ))}
            </div>
          </div>
        ))}

        <Bone w="160px" h="44px" style={{borderRadius: 12, marginTop: 8}} />
      </div>
    </main>
  )
}
