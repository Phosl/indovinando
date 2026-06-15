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
      style={{
        padding: '0 12px 48px',
        maxWidth: 960,
        margin: '0 auto',
        display: 'grid',
        gap: 14,
        boxSizing: 'border-box',
      }}>
      <div
        className="skeleton-card"
        style={{
          padding: '14px',
          display: 'grid',
          gridTemplateColumns: '92px minmax(0, 1fr)',
          columnGap: 12,
          alignItems: 'start',
        }}>
        <Bone w="92px" h="92px" style={{borderRadius: 999}} />
        <div style={{display: 'grid', gap: 8, minWidth: 0}}>
          <Bone w="52%" h="30px" />
          <Bone w="100px" h="14px" style={{borderRadius: 6}} />
          <Bone w="min(190px, 100%)" h="30px" style={{borderRadius: 12}} />
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
                <Bone key={j} w="min(120px, 44%)" h="38px" style={{borderRadius: 10}} />
              ))}
            </div>
          </div>
        ))}

        <Bone w="160px" h="44px" style={{borderRadius: 12, marginTop: 8}} />
      </div>
    </main>
  )
}
