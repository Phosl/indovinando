import styles from './playerJoin.module.scss'

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

export default function PlayerJoinLoading() {
  return (
    <div className={styles.container}>
      <div
        className="skeleton-frame"
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 40px',
          alignItems: 'center',
          columnGap: 12,
          width: '100%',
          maxWidth: 960,
          padding: '10px 14px',
          margin: '0 auto 16px auto',
          boxSizing: 'border-box',
        }}>
        <Bone w="40px" h="40px" style={{borderRadius: 10}} />
        <Bone w="240px" h="22px" style={{margin: '0 auto', borderRadius: 6}} />
        <Bone w="40px" h="40px" style={{borderRadius: 10, marginLeft: 'auto'}} />
      </div>

      {/* Join card */}
      <div className={styles.joinCard}>
        {/* Avatar grid placeholder */}
        <Bone w="120px" h="16px" style={{marginBottom: 12, borderRadius: 6}} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 8,
            marginBottom: 20,
          }}>
          {Array.from({length: 10}).map((_, i) => (
            <Bone key={i} w="100%" h="48px" style={{borderRadius: 10}} />
          ))}
        </div>

        {/* Nickname input */}
        <Bone w="90px" h="16px" style={{marginBottom: 8, borderRadius: 6}} />
        <Bone w="100%" h="48px" style={{borderRadius: 8, marginBottom: 16}} />

        {/* Submit button */}
        <Bone w="100%" h="44px" style={{borderRadius: 12}} />
      </div>
    </div>
  )
}
