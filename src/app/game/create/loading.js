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

export default function GameCreateLoading() {
  return (
    <main
      style={{
        padding: '16px',
        maxWidth: 960,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '10px 14px',
          marginBottom: 4,
          background: 'var(--foreground)',
          border: '2px solid var(--button-secondary-border)',
          borderRadius: 12,
          boxShadow: '0px 3px 0px 0px var(--gray-light)',
          flexWrap: 'wrap',
          boxSizing: 'border-box',
        }}>
        <Bone w="90px" h="32px" style={{borderRadius: 12}} />
        <Bone w="170px" h="20px" style={{margin: '0 auto', borderRadius: 6}} />
        <div style={{minWidth: 90}} />
      </div>

      {/* Breadcrumbs */}
      <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} w="80px" h="28px" style={{borderRadius: 999}} />
        ))}
      </div>

      {/* Form card */}
      <div style={cardStyle}>
        <Bone w="160px" h="22px" />
        <Bone w="100%" h="48px" style={{borderRadius: 10}} />
        <Bone w="140px" h="44px" style={{borderRadius: 12, marginTop: 8}} />
      </div>
    </main>
  )
}
