'use client'

import {usePathname} from 'next/navigation'
import BottomNav from '@/components/BottomNav'

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
  const pathname = usePathname()
  const showBottomNav = pathname === '/game/create'

  return (
    <>
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
        <div
          className="skeleton-frame"
          style={{
            display: 'grid',
            gridTemplateColumns: '40px minmax(0, 1fr) 32px',
            alignItems: 'center',
            columnGap: 12,
            width: '100%',
            padding: '10px 14px',
            margin: '0 0 14px',
            boxSizing: 'border-box',
          }}>
          <Bone w="40px" h="40px" style={{borderRadius: 10}} />
          <Bone w="clamp(140px, 40vw, 210px)" h="20px" style={{margin: '0 auto', borderRadius: 6}} />
          <Bone w="24px" h="24px" style={{borderRadius: 999, marginLeft: 'auto'}} />
        </div>

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
      {showBottomNav ? <BottomNav forceVisible /> : null}
    </>
  )
}
