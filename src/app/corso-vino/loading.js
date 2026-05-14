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
    <main style={{padding: '0 20px 32px', maxWidth: 960, margin: '0 auto'}}>
      {/* TopBar skeleton */}
      <div
        className="skeleton-frame"
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr auto',
          alignItems: 'center',
          columnGap: 12,
          width: '100%',
          padding: '10px 14px',
          margin: '0 auto 16px auto',
          boxSizing: 'border-box',
        }}>
        <Bone w="40px" h="40px" style={{borderRadius: 10}} />
        <Bone w="180px" h="20px" style={{margin: '0 auto', borderRadius: 6}} />
        <Bone w="80px" h="34px" style={{borderRadius: 12, marginLeft: 'auto'}} />
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
      <div style={{display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px'}}>
        {Array.from({length: 5}).map((_, index) => (
          <div
            key={index}
            className="skeleton-card"
            style={{
              padding: '16px',
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
            }}>
            <Bone w="36px" h="36px" style={{borderRadius: 12, marginTop: 2}} />
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <Bone w="82px" h="12px" style={{borderRadius: 999}} />
                <Bone w="62px" h="18px" style={{borderRadius: 999}} />
              </div>
              <Bone w="68%" h="16px" style={{borderRadius: 6}} />
              <Bone w="90%" h="12px" style={{borderRadius: 6}} />
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <Bone w={undefined} h="12px" style={{borderRadius: 999, flex: 1, minWidth: 0}} />
                <Bone w="54px" h="12px" style={{borderRadius: 999}} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
