import styles from './miei-giochi.module.scss'

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

export default function MieiGiochiLoading() {
  return (
    <div className={styles.page}>
      {/* TopBar skeleton */}
      <div style={{padding: '0 20px'}}>
        <div
          className="skeleton-frame"
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 40px',
            alignItems: 'center',
            columnGap: 12,
            padding: '10px 14px',
            maxWidth: 960,
            margin: '0 auto 16px auto',
            width: '100%',
            boxSizing: 'border-box',
          }}>
          <Bone w="40px" h="40px" style={{borderRadius: 10}} />
          <Bone w="180px" h="20px" style={{margin: '0 auto', borderRadius: 6}} />
          <Bone w="40px" h="40px" style={{borderRadius: 10, marginLeft: 'auto'}} />
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '0 20px',
          borderBottom: '2px solid var(--button-secondary-border)',
          background: 'var(--foreground)',
          paddingTop: 12,
          paddingBottom: 10,
        }}>
        <Bone w="140px" h="20px" style={{borderRadius: 6}} />
        <Bone w="110px" h="20px" style={{borderRadius: 6}} />
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: 960,
          width: '100%',
          margin: '0 auto',
          padding: '20px 20px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton-card"
            style={{
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
            <Bone w="55%" h="18px" style={{borderRadius: 6}} />
            <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
              <Bone w="90px" h="12px" style={{borderRadius: 6}} />
              <Bone w="64px" h="22px" style={{borderRadius: 999}} />
            </div>
            <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
              <Bone w="76px" h="36px" style={{borderRadius: 12}} />
              <Bone w="110px" h="36px" style={{borderRadius: 12}} />
              <Bone w="110px" h="36px" style={{borderRadius: 12}} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
