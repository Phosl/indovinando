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

export default function GameLoading() {
  return (
    <main style={{padding: '0 20px 48px', maxWidth: 960, margin: '0 auto'}}>
      <div
        className="skeleton-frame"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}>
        <Bone w="100px" h="40px" style={{borderRadius: 999}} />
        <Bone w="220px" h="20px" style={{margin: '0 auto', borderRadius: 6}} />
        <div style={{display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap'}}>
          <Bone w="110px" h="36px" style={{borderRadius: 12}} />
          <Bone w="120px" h="36px" style={{borderRadius: 12}} />
        </div>
      </div>

      {/* Content card — question list placeholder */}
      <div
        className="skeleton-card"
        style={{
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
