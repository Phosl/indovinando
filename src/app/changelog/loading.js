import styles from './changelog.module.scss'

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

export default function ChangelogLoading() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Bone w="240px" h="32px" style={{margin: '0 auto'}} />
          <Bone w="min(100%, 360px)" h="16px" style={{margin: '0 auto'}} />
        </div>

        <section className={styles.activityCard}>
          <div className={styles.activityHeader}>
            <div style={{display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0}}>
              <Bone w="180px" h="18px" />
              <Bone w="240px" h="12px" />
            </div>
            <Bone w="88px" h="22px" style={{borderRadius: 999}} />
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 6}}>
            {Array.from({length: 42}, (_, index) => (
              <Bone key={index} w="100%" h="12px" style={{borderRadius: 3}} />
            ))}
          </div>
        </section>

        <div className={styles.timeline}>
          {[1, 2, 3, 4].map((item) => (
            <article key={item} className={styles.entry}>
              <div className={styles.entryMeta}>
                <Bone w="72px" h="16px" style={{marginLeft: 'auto'}} />
                <Bone w="92px" h="12px" style={{marginLeft: 'auto'}} />
              </div>
              <div className={styles.entryBody}>
                <Bone w="min(100%, 420px)" h="20px" />
                <Bone w="100%" h="14px" />
                <Bone w="78%" h="14px" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
