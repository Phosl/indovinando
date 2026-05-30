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

export default function CorsoVinoLessonLoading() {
  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '0 12px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        paddingBottom: '112px',
        background: 'var(--background)',
        boxSizing: 'border-box',
      }}>
      {/* Standard TopBar-like skeleton */}
      <div
        className="skeleton-frame"
        style={{
          display: 'grid',
          gridTemplateColumns: '40px minmax(0, 1fr) 32px',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          margin: '0',
          borderRadius: 12,
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}>
        <Bone w="40px" h="40px" style={{borderRadius: 10}} />
        <Bone w="clamp(130px, 42vw, 210px)" h="18px" style={{margin: '0 auto', borderRadius: 6}} />
        <Bone w="24px" h="24px" style={{borderRadius: 999, marginLeft: 'auto'}} />
        <Bone
          w="100%"
          h="4px"
          style={{
            borderRadius: 0,
            position: 'absolute',
            left: 0,
            bottom: 0,
          }}
        />
      </div>

      {/* Slide / intro card */}
      <div style={{flex: 1, overflow: 'hidden', padding: '14px 0 10px', display: 'flex'}}>
        <div
          className="skeleton-card"
          style={{
            flex: 1,
            width: '100%',
            borderRadius: 20,
            padding: '20px 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            textAlign: 'center',
          }}>
          <Bone w="72px" h="72px" style={{borderRadius: 999}} />
          <Bone w="86px" h="12px" style={{borderRadius: 999}} />
          <Bone w="78%" h="22px" style={{borderRadius: 6}} />
          <Bone w="90%" h="14px" style={{borderRadius: 6}} />
          <Bone w="86%" h="14px" style={{borderRadius: 6}} />
          <div
            style={{width: '100%', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8}}>
            <Bone w="100%" h="42px" style={{borderRadius: 10}} />
            <Bone w="100%" h="42px" style={{borderRadius: 10}} />
            <Bone w="72%" h="42px" style={{borderRadius: 10}} />
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div
        className="skeleton-frame"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          margin: 0,
        }}>
        <Bone w="60%" h="12px" style={{borderRadius: 999, margin: '0 auto'}} />
        <Bone w="100%" h="48px" style={{borderRadius: 12}} />
      </div>
    </div>
  )
}
