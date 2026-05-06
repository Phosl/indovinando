function Bone({w, h, style}) {
  return (
    <div
      className="skeleton"
      style={{width: w, height: h, borderRadius: 8, flexShrink: 0, ...style}}
    />
  )
}

const cardStyle = {
  background: 'var(--foreground)',
  border: '2px solid var(--button-secondary-border)',
  borderRadius: 12,
  boxShadow: '0px 4px 0px 0px var(--gray-light)',
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

export default function GameEditLoading() {
  return (
    <main
      style={{
        padding: '16px',
        maxWidth: 800,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
      {/* Top bar */}
      <Bone w="90px" h="32px" style={{borderRadius: 12}} />

      {/* Breadcrumbs */}
      <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} w="80px" h="28px" style={{borderRadius: 999}} />
        ))}
      </div>

      {/* Content card */}
      <div style={cardStyle}>
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
