import styles from '@/components/auth/AuthFormClient.module.scss'

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

export default function AuthLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={`${styles.card} skeleton-card`}>
          <div className={styles.brandBlock}>
            <Bone w="min(240px, 80%)" h="34px" style={{borderRadius: 8}} />
            <Bone w="min(300px, 92%)" h="14px" style={{borderRadius: 6}} />
          </div>

          <div className={styles.form}>
            <div className={styles.fieldBlock}>
              <Bone w="84px" h="12px" style={{borderRadius: 999}} />
              <Bone w="100%" h="48px" style={{borderRadius: 10}} />
            </div>

            <div className={styles.fieldBlock}>
              <Bone w="110px" h="12px" style={{borderRadius: 999}} />
              <Bone w="100%" h="48px" style={{borderRadius: 10}} />
            </div>

            <div className={styles.actions}>
              <Bone w="100%" h="46px" style={{borderRadius: 12}} />
              <Bone w="58%" h="20px" style={{borderRadius: 999, margin: '0 auto'}} />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
