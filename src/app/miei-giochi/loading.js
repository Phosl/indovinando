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
      <div className={styles.topBarContainer}>
        <div
          className="skeleton-frame"
          style={{
            display: 'grid',
            gridTemplateColumns: '40px minmax(0, 1fr) 32px',
            alignItems: 'center',
            columnGap: 12,
            padding: '10px 14px',
            maxWidth: 960,
            margin: '0 auto 14px auto',
            width: '100%',
            boxSizing: 'border-box',
          }}>
          <Bone w="40px" h="40px" style={{borderRadius: 10}} />
          <Bone w="clamp(140px, 42vw, 220px)" h="20px" style={{margin: '0 auto', borderRadius: 6}} />
          <Bone w="24px" h="24px" style={{borderRadius: 999, marginLeft: 'auto'}} />
        </div>
      </div>

      <div className={styles.content}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 10, width: '100%'}}>
          <Bone w="100%" h="154px" style={{borderRadius: 8, marginBottom: 6}} />

          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton-card"
              style={{
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: '92px 1fr',
                alignItems: 'start',
                columnGap: 16,
                gap: 10,
              }}>
              <Bone w="92px" h="92px" style={{borderRadius: 999}} />
              <div style={{display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0}}>
                <div style={{display: 'flex', justifyContent: 'space-between', gap: 10, minWidth: 0}}>
                  <Bone w="58%" h="22px" style={{borderRadius: 6}} />
                  <Bone w="92px" h="14px" style={{borderRadius: 6}} />
                </div>
                <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                  <Bone w="132px" h="14px" style={{borderRadius: 6}} />
                  <Bone w="126px" h="14px" style={{borderRadius: 6}} />
                </div>
                <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                  <Bone w="168px" h="28px" style={{borderRadius: 999}} />
                  <Bone w="178px" h="28px" style={{borderRadius: 999}} />
                  <Bone w="96px" h="28px" style={{borderRadius: 999}} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
