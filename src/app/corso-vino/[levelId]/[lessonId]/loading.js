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
        maxWidth: 640,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: 'var(--background)',
        boxSizing: 'border-box',
      }}>
      {/* Intro-style top bar */}
      <div
        className="skeleton-frame"
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          gap: 8,
          padding: '14px 16px',
          margin: '12px 12px 0',
          borderRadius: 12,
          boxSizing: 'border-box',
        }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8, minWidth: 0}}>
          <Bone w="28px" h="28px" style={{borderRadius: 999}} />
          <Bone w="clamp(84px, 32vw, 120px)" h="14px" style={{borderRadius: 6}} />
        </div>
        <div style={{display: 'flex', justifyContent: 'center', gap: 6}}>
          {Array.from({length: 4}).map((_, index) => (
            <Bone key={index} w="16px" h="6px" style={{borderRadius: 999}} />
          ))}
        </div>
        <div style={{display: 'flex', gap: 8, justifyContent: 'flex-end'}}>
          <Bone w="44px" h="28px" style={{borderRadius: 999}} />
          <Bone w="28px" h="28px" style={{borderRadius: 999}} />
        </div>
      </div>

      {/* Slide / intro card */}
      <div style={{flex: 1, overflow: 'hidden', padding: '18px 12px 12px', display: 'flex'}}>
        <div
          className="skeleton-card"
          style={{
            flex: 1,
            width: '100%',
            borderRadius: 20,
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            textAlign: 'center',
          }}>
          <Bone w="72px" h="72px" style={{borderRadius: 999}} />
          <Bone w="70px" h="12px" style={{borderRadius: 999}} />
          <Bone w="78%" h="22px" style={{borderRadius: 6}} />
          <Bone w="90%" h="14px" style={{borderRadius: 6}} />
          <Bone w="86%" h="14px" style={{borderRadius: 6}} />
          <div
            style={{width: '100%', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8}}>
            <Bone w="100%" h="52px" style={{borderRadius: 14}} />
            <Bone w="100%" h="52px" style={{borderRadius: 14}} />
            <Bone w="100%" h="52px" style={{borderRadius: 14}} />
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
          padding: '12px 12px calc(12px + env(safe-area-inset-bottom, 0px))',
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
