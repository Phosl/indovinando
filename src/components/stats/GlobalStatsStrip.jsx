import styles from './GlobalStatsStrip.module.scss'

export default function GlobalStatsStrip({statsSnapshot, text = {}, className = ''}) {
  const items = statsSnapshot?.items || []

  return (
    <section className={`${styles.section} ${className}`.trim()}>
      {(text.eyebrow || text.title || text.description) && (
        <div className={styles.header}>
          <div>
            {text.eyebrow ? <span className={styles.eyebrow}>{text.eyebrow}</span> : null}
            {text.title ? <h2 className={styles.title}>{text.title}</h2> : null}
            {text.description ? <p className={styles.description}>{text.description}</p> : null}
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {items.map((stat) => (
          <article key={stat.id} className={styles.card}>
            <span className={styles.icon}>{stat.icon}</span>
            <strong className={styles.value}>{stat.value}</strong>
            <span className={styles.label}>{text.stats?.[stat.id] || stat.id}</span>
          </article>
        ))}
      </div>

      {text.caption ? (
        <p className={styles.caption}>
          {text.caption.replace(
            '{days}',
            String(statsSnapshot?.meta?.activeUsersDays || 30),
          )}
        </p>
      ) : null}
    </section>
  )
}
