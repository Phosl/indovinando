'use client'

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
        padding: '0 12px 48px',
        maxWidth: 960,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxSizing: 'border-box',
      }}>
      {/* Mode picker title */}
      <Bone w="min(340px, 90%)" h="30px" style={{margin: '0 auto 4px', borderRadius: 8}} />

      {/* Mode cards */}
      <div
        style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16}}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton-card"
            style={{
              padding: '22px 18px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              minHeight: 210,
            }}>
            <Bone w="62%" h="22px" style={{borderRadius: 8}} />
            <Bone w="94%" h="14px" style={{borderRadius: 6}} />
            <Bone w="88%" h="14px" style={{borderRadius: 6}} />
            <Bone w="76%" h="14px" style={{borderRadius: 6}} />
            <Bone w="160px" h="40px" style={{borderRadius: 22, marginTop: 'auto'}} />
          </div>
        ))}
      </div>
    </main>
  )
}
