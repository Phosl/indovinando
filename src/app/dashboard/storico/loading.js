import styles from './storico.module.scss'

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

export default function StoricoLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Bone w="min(100%, 360px)" h="16px" />
        </div>

        <div className={styles.filterBar}>
          <Bone w="72px" h="32px" style={{borderRadius: 999}} />
          <Bone w="118px" h="32px" style={{borderRadius: 999}} />
          <Bone w="96px" h="32px" style={{borderRadius: 999}} />
        </div>

        <div className={styles.list}>
          {[1, 2, 3].map((item) => (
            <div key={item} className={styles.card}>
              <div className={styles.cardHeader}>
                <div style={{display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0}}>
                  <Bone w="220px" h="20px" />
                  <Bone w="140px" h="12px" />
                </div>
                <Bone w="96px" h="28px" style={{borderRadius: 999}} />
              </div>
              <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                <Bone w="30%" h="92px" style={{borderRadius: 12, minWidth: 120}} />
                <Bone w="30%" h="92px" style={{borderRadius: 12, minWidth: 120}} />
                <Bone w="30%" h="92px" style={{borderRadius: 12, minWidth: 120}} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
