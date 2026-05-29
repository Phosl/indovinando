import styles from './WizardLoadingSkeleton.module.scss'

function Bone({className}) {
  return <div className={`skeleton ${className || ''}`} aria-hidden="true" />
}

export default function WizardLoadingSkeleton() {
  return (
    <main className="flex-container">
      <div className={styles.wrapper}>
        <div className={styles.topBar}>
          <Bone className={styles.avatar} />
          <Bone />
          <Bone className={styles.avatar} />
        </div>

        <div className={styles.breadcrumbs}>
          <Bone className={styles.crumb} />
          <Bone className={styles.crumb} />
          <Bone className={styles.crumb} />
          <Bone className={styles.crumb} />
        </div>

        <section className={styles.section}>
          <Bone className={styles.title} />
          <Bone className={styles.input} />
          <Bone className={styles.label} />
          <div className={styles.avatars}>
            {Array.from({length: 8}).map((_, idx) => (
              <Bone key={idx} className={styles.avatar} />
            ))}
          </div>
        </section>
      </div>

      <div className={styles.buttonRow}>
        <Bone className={styles.button} />
      </div>
    </main>
  )
}
