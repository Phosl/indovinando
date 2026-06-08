import Icon from '@/components/Icon'
import styles from './GlobalStatsStrip.module.scss'

const STAT_ICON_BY_ID = {
  tastings: '/icons/bottle.svg',
  analyzedWines: '/icons/photo.svg',
  ratings: '/icons/match.svg',
  activeUsers: '/icons/profile.svg',
}

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
            <Icon src={STAT_ICON_BY_ID[stat.id]} size={22} className={styles.icon} />
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
