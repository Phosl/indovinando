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

export default function GamePrintLoading() {
  return (
    <main
      style={{
        background: '#f7f7f7',
        minHeight: '100vh',
        padding: 10,
        paddingTop: 0,
      }}>
      {/* Clean TopBar skeleton: back + title only */}
      <div
        className="skeleton-frame"
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr',
          alignItems: 'center',
          columnGap: 12,
          maxWidth: '210mm',
          margin: '0 auto 8px auto',
          width: '100%',
          padding: '12px 16px',
          borderRadius: '0 0 12px 12px',
          boxSizing: 'border-box',
        }}>
        <Bone w="40px" h="40px" style={{borderRadius: 10}} />
        <Bone w="140px" h="20px" style={{borderRadius: 6}} />
      </div>

      {/* Action bar skeleton (outside header) */}
      <div
        style={{
          maxWidth: '210mm',
          margin: '0 auto 10px auto',
          width: '100%',
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
        }}>
        <Bone w="138px" h="42px" style={{borderRadius: 12}} />
        <Bone w="96px" h="42px" style={{borderRadius: 12}} />
      </div>

      {/* Print sheet skeleton */}
      <section
        className="skeleton-card"
        style={{
          width: '210mm',
          minHeight: '297mm',
          margin: '0 auto',
          background: '#fff',
          padding: '5mm',
          boxSizing: 'border-box',
          borderRadius: 8,
        }}>
        <div style={{marginBottom: 16}}>
          <Bone w="220px" h="24px" style={{margin: '28px auto 18px auto', borderRadius: 6}} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              maxWidth: 300,
              margin: '0 auto',
            }}>
            <Bone w="58px" h="12px" style={{borderRadius: 6}} />
            <Bone w="100%" h="12px" style={{borderRadius: 6}} />
          </div>
        </div>

        <div
          className="skeleton-frame"
          style={{
            borderRadius: 8,
            marginBottom: 12,
            padding: 10,
            display: 'grid',
            gridTemplateColumns: '1.8cm repeat(5, minmax(0, 1fr))',
            gap: 8,
            boxSizing: 'border-box',
          }}>
          <Bone w="100%" h="20px" style={{borderRadius: 6}} />
          {Array.from({length: 5}).map((_, i) => (
            <Bone key={`qh-${i}`} w="100%" h="20px" style={{borderRadius: 6}} />
          ))}
        </div>

        <div style={{display: 'grid', gap: 20}}>
          {Array.from({length: 3}).map((_, tableIndex) => (
            <div
              key={`table-${tableIndex}`}
              className="skeleton-frame"
              style={{
                borderRadius: 8,
                padding: 10,
                display: 'grid',
                gridTemplateColumns: '1.8cm repeat(5, minmax(0, 1fr))',
                gap: 10,
                boxSizing: 'border-box',
              }}>
              <Bone w="100%" h="120px" style={{borderRadius: 8}} />
              {Array.from({length: 5}).map((__, qIndex) => (
                <div key={`q-${tableIndex}-${qIndex}`} style={{display: 'grid', gap: 6}}>
                  <Bone w="88%" h="14px" style={{borderRadius: 6}} />
                  <Bone w="92%" h="14px" style={{borderRadius: 6}} />
                  <Bone w="84%" h="14px" style={{borderRadius: 6}} />
                  <Bone w="90%" h="14px" style={{borderRadius: 6}} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
