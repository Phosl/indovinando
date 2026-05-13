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

      {/* Lesson cards skeleton */}
      <div style={{display: 'flex', flexDirection: 'column', padding: '8px 24px 16px'}}>
        {Array.from({length: 5}).map((_, index) => (
          <div key={index} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            {index > 0 && (
              <div
                className="skeleton"
                style={{
                  width: 3,
                  height: 24,
                  borderRadius: 999,
                  opacity: 0.9,
                  margin: '2px 0',
                }}
              />
            )}

            <div
              className="skeleton-card"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 16,
                boxSizing: 'border-box',
              }}>
              <Bone w="44px" h="44px" style={{borderRadius: 999}} />

              <div style={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, minWidth: 0}}>
                  <Bone w="70px" h="11px" style={{borderRadius: 999}} />
                  <Bone w="56px" h="16px" style={{borderRadius: 999}} />
                  <Bone w="74px" h="16px" style={{borderRadius: 999}} />
                </div>

                <div style={{display: 'flex', alignItems: 'center', gap: 8, minWidth: 0}}>
                  <Bone w="62%" h="16px" style={{borderRadius: 6}} />
                  <Bone w="62px" h="22px" style={{borderRadius: 999}} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
