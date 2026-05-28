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
        <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: 2}}>
          <Bone w="210px" h="52px" style={{borderRadius: 24}} />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton-card"
            style={{
              padding: '14px',
              display: 'grid',
              gridTemplateColumns: '92px 1fr',
              alignItems: 'start',
              columnGap: 10,
              gap: 10,
            }}>
            <Bone w="92px" h="92px" style={{borderRadius: 999}} />
            <div style={{display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0}}>
              <div style={{display: 'flex', justifyContent: 'space-between', gap: 10, minWidth: 0}}>
                <Bone w="58%" h="22px" style={{borderRadius: 6}} />
                <Bone w="90px" h="14px" style={{borderRadius: 6}} />
              </div>
              <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                <Bone w="122px" h="14px" style={{borderRadius: 6}} />
                <Bone w="118px" h="14px" style={{borderRadius: 6}} />
              </div>
              <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                <Bone w="160px" h="28px" style={{borderRadius: 999}} />
                <Bone w="170px" h="28px" style={{borderRadius: 999}} />
                <Bone w="88px" h="28px" style={{borderRadius: 999}} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
