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
    <main
      style={{padding: '0 20px 48px', maxWidth: 960, margin: '0 auto', display: 'grid', gap: 14}}>
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
        <Bone w="220px" h="20px" style={{margin: '0 auto', borderRadius: 6}} />
        <Bone w="40px" h="40px" style={{borderRadius: 10, marginLeft: 'auto'}} />
      </div>

      <div
        className="skeleton-card"
        style={{
          padding: '14px',
          display: 'grid',
          gridTemplateColumns: '96px 1fr',
          columnGap: 12,
          alignItems: 'start',
        }}>
        <Bone w="96px" h="96px" style={{borderRadius: 999}} />
        <div style={{display: 'grid', gap: 8}}>
          <Bone w="52%" h="30px" />
          <Bone w="100px" h="14px" style={{borderRadius: 6}} />
          <Bone w="190px" h="30px" style={{borderRadius: 12}} />
          <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', minWidth: 0}}>
            <Bone w="min(130px, 100%)" h="18px" style={{borderRadius: 6}} />
            <Bone w="min(130px, 100%)" h="18px" style={{borderRadius: 6}} />
          </div>
        </div>
      </div>

      <div
        className="skeleton-card"
        style={{
          padding: '12px 14px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
        }}>
        <Bone w="min(180px, 100%)" h="52px" style={{borderRadius: 24}} />
        <Bone w="126px" h="38px" style={{borderRadius: 12}} />
        <Bone w="126px" h="38px" style={{borderRadius: 12}} />
      </div>

      {/* Question list placeholder */}
      <div
        className="skeleton-card"
        style={{
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
        <Bone w="44%" h="24px" />

        {[1, 2, 3].map((i) => (
          <div key={i} style={{display: 'flex', flexDirection: 'column', gap: 10}}>
            <Bone w="64%" h="16px" />
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
