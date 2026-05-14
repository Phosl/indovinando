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

export default function EnotecaLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        maxWidth: 960,
        margin: '0 auto',
        padding: '0 20px',
        width: '100%',
        background: 'var(--background)',
        boxSizing: 'border-box',
      }}>
      {/* TopBar skeleton */}
      <div
        className="skeleton-frame"
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr',
          alignItems: 'center',
          columnGap: 12,
          padding: '12px 16px',
          borderRadius: '0 0 12px 12px',
          boxSizing: 'border-box',
        }}>
        <Bone w="40px" h="40px" style={{borderRadius: 10}} />
        <Bone w="120px" h="20px" style={{borderRadius: 6}} />
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: '16px 16px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
        {/* Event info card */}
        <div
          className="skeleton-card"
          style={{
            padding: '24px 20px',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}>
          <Bone w="52px" h="52px" style={{borderRadius: 999}} />
          <Bone w="62%" h="24px" style={{borderRadius: 6}} />
          <Bone w="44%" h="14px" style={{borderRadius: 6}} />
          <Bone w="82%" h="14px" style={{borderRadius: 6}} />
          <Bone w="72%" h="14px" style={{borderRadius: 6}} />
          <Bone w="90px" h="26px" style={{borderRadius: 999, marginTop: 4}} />
        </div>

        {/* Form skeleton */}
        <div
          className="skeleton-card"
          style={{
            padding: '20px 18px',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
            <Bone w="80px" h="12px" style={{borderRadius: 6}} />
            <Bone w="100%" h="48px" style={{borderRadius: 10}} />
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
            <Bone w="64px" h="12px" style={{borderRadius: 6}} />
            <Bone w="100%" h="48px" style={{borderRadius: 10}} />
          </div>
        </div>
      </div>

      {/* Bottom button skeleton */}
      <div
        className="skeleton-frame"
        style={{
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          margin: '12px 0 0',
        }}>
        <Bone w="100%" h="52px" style={{borderRadius: 12}} />
      </div>
    </div>
  )
}
