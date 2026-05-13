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

export default function GameCreateLoading() {
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

      {/* Breadcrumbs */}
      <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} w="80px" h="28px" style={{borderRadius: 999}} />
        ))}
      </div>

      {/* Form card */}
      <div
        className="skeleton-card"
        style={{padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16}}>
        <Bone w="160px" h="22px" />
        <Bone w="100%" h="48px" style={{borderRadius: 10}} />
        <Bone w="140px" h="44px" style={{borderRadius: 12, marginTop: 8}} />
      </div>
    </main>
  )
}
