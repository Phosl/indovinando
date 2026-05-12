import styles from './profilo.module.scss'

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

export default function ProfiloLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* TopBar skeleton */}
        <div
          className="skeleton-frame"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            marginBottom: 0,
            flexWrap: 'wrap',
          }}>
          <Bone w="100px" h="40px" style={{borderRadius: 999}} />
          <Bone w="140px" h="20px" style={{margin: '0 auto', borderRadius: 6}} />
          <div style={{minWidth: 90}} />
        </div>

        {/* Header card: avatar + nome + email + lingua + avatar picker */}
        <div className={styles.headerCard}>
          <div className={styles.userRow}>
            <Bone w="100px" h="100px" style={{borderRadius: 18, flexShrink: 0}} />
            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
              <Bone w="140px" h="22px" style={{borderRadius: 6}} />
              <Bone w="180px" h="14px" style={{borderRadius: 6}} />
            </div>
          </div>
          {/* Lingua */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
            }}>
            <Bone w="60px" h="14px" style={{borderRadius: 6}} />
            <Bone w="80px" h="32px" style={{borderRadius: 999}} />
          </div>
          {/* Avatar picker */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 14,
            }}>
            <Bone w="100px" h="14px" style={{borderRadius: 6}} />
            <Bone w="130px" h="44px" style={{borderRadius: 999}} />
          </div>
        </div>

        {/* Corso / livello card */}
        <div className={styles.card} style={{display: 'flex', flexDirection: 'column', gap: 14}}>
          <Bone w="120px" h="18px" style={{borderRadius: 6}} />
          <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
            <Bone w="64px" h="64px" style={{borderRadius: 14}} />
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 8}}>
              <Bone w="80px" h="14px" style={{borderRadius: 6}} />
              <Bone w="100%" h="10px" style={{borderRadius: 999}} />
            </div>
          </div>
        </div>

        {/* Stats card */}
        <div className={styles.card} style={{display: 'flex', gap: 12}}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                alignItems: 'center',
              }}>
              <Bone w="40px" h="28px" style={{borderRadius: 6}} />
              <Bone w="60px" h="12px" style={{borderRadius: 6}} />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
