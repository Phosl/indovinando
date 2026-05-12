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

export default function GameEditLoading() {
  return (
    <main
      style={{
        padding: '0 20px 48px',
        maxWidth: 960,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
      <div
        className="skeleton-frame"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '0 14px 10px',
          margin: '0 auto 16px auto',
          flexWrap: 'wrap',
          boxSizing: 'border-box',
        }}>
        <Bone w="100px" h="40px" style={{borderRadius: 999}} />
        <Bone w="190px" h="20px" style={{margin: '0 auto', borderRadius: 6}} />
        <div style={{minWidth: 90}} />
      </div>

      {/* Breadcrumbs */}
      <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} w="80px" h="28px" style={{borderRadius: 999}} />
        ))}
      </div>

      {/* Content card */}
      <div
        className="skeleton-card"
        style={{padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16}}>
        <Bone w="180px" h="22px" />
        {[1, 2].map((i) => (
          <div key={i} style={{display: 'flex', flexDirection: 'column', gap: 10}}>
            <Bone w="55%" h="16px" />
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
              {[1, 2, 3, 4].map((j) => (
                <Bone key={j} w="110px" h="36px" style={{borderRadius: 10}} />
              ))}
            </div>
          </div>
        ))}
        <Bone w="140px" h="44px" style={{borderRadius: 12, marginTop: 8}} />
      </div>
    </main>
  )
}
