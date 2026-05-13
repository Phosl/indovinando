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

export default function CorsoVinoLevelLoading() {
  return (
    <main style={{padding: '0 20px 32px', maxWidth: 640, margin: '0 auto'}}>
      {/* TopBar skeleton */}
      <div
        className="skeleton-frame"
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 40px',
          alignItems: 'center',
          columnGap: 12,
          width: '100%',
          padding: '10px 14px',
          margin: '0 auto 16px auto',
          boxSizing: 'border-box',
        }}>
        <Bone w="40px" h="40px" style={{borderRadius: 10}} />
        <Bone w="170px" h="20px" style={{margin: '0 auto', borderRadius: 6}} />
        <Bone w="40px" h="40px" style={{borderRadius: 10, marginLeft: 'auto'}} />
      </div>

      {/* Hero skeleton */}
      <div
        className="skeleton-card"
        style={{
          padding: '24px 20px 20px',
          marginBottom: 18,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          textAlign: 'center',
        }}>
        <Bone w="56px" h="56px" style={{borderRadius: 999}} />
        <Bone w="42%" h="20px" style={{borderRadius: 6}} />
        <Bone w="78%" h="14px" style={{borderRadius: 6}} />
        <Bone w="64%" h="14px" style={{borderRadius: 6}} />
      </div>

      {/* Path skeleton */}
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0}}>
        {Array.from({length: 5}).map((_, index) => (
          <div key={index} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            {index > 0 && (
              <div
                className="skeleton"
                style={{
                  width: 4,
                  height: 30,
                  borderRadius: 999,
                  opacity: 0.9,
                }}
              />
            )}
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
              <Bone w="72px" h="72px" style={{borderRadius: 999, boxShadow: '0 4px 0 #e6e6e6'}} />
              <Bone w="88px" h="12px" style={{borderRadius: 999}} />
              <Bone w="54px" h="12px" style={{borderRadius: 999}} />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
