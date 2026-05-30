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

export default function CorsoVinoLoading() {
  return (
    <main style={{padding: '0 12px 112px', maxWidth: 960, margin: '0 auto', boxSizing: 'border-box'}}>
      {/* TopBar skeleton */}
      <div
        className="skeleton-frame"
        style={{
          display: 'grid',
          gridTemplateColumns: '40px minmax(0, 1fr) 32px',
          alignItems: 'center',
          columnGap: 12,
          width: '100%',
          padding: '10px 14px',
          margin: '0 0 14px',
          boxSizing: 'border-box',
        }}>
        <Bone w="40px" h="40px" style={{borderRadius: 10}} />
        <Bone w="clamp(140px, 42vw, 220px)" h="20px" style={{margin: '0 auto', borderRadius: 6}} />
        <Bone w="24px" h="24px" style={{borderRadius: 999, marginLeft: 'auto'}} />
      </div>

      {/* Hero skeleton */}
      <div
        className="skeleton-card"
        style={{
          padding: '20px 18px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
        <Bone w="150px" h="150px" style={{borderRadius: 20, flexShrink: 0}} />
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0}}>
          <Bone w="52%" h="22px" style={{borderRadius: 6}} />
          <Bone w="86%" h="14px" style={{borderRadius: 6}} />
          <Bone w="72%" h="14px" style={{borderRadius: 6}} />
        </div>
      </div>

      {/* Level list skeleton */}
      <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
        {Array.from({length: 6}).map((_, index) => (
          <div
            key={index}
            className="skeleton-card"
            style={{
              padding: '14px 12px',
              display: 'flex',
              gap: 12,
              alignItems: 'stretch',
              width: '100%',
              boxSizing: 'border-box',
            }}>
            <Bone w="36px" h="36px" style={{borderRadius: 12, marginTop: 2}} />
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8}}>
                <Bone w="min(168px, 60%)" h="12px" style={{borderRadius: 999}} />
                <Bone w="72px" h="18px" style={{borderRadius: 999}} />
              </div>
              <Bone w="68%" h="16px" style={{borderRadius: 6}} />
              <Bone w="90%" h="12px" style={{borderRadius: 6}} />
              <div style={{display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap'}}>
                {Array.from({length: 7}).map((__, dotIndex) => (
                  <Bone key={dotIndex} w="9px" h="9px" style={{borderRadius: 999}} />
                ))}
                <Bone w="42px" h="10px" style={{borderRadius: 6, marginLeft: 4}} />
              </div>
            </div>
            <div
              style={{width: 42, minWidth: 42, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <Bone w="18px" h="18px" style={{borderRadius: 6}} />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
