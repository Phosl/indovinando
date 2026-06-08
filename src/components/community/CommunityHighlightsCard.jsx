import Link from 'next/link'
import styles from './CommunityHighlightsCard.module.scss'

function getTopItem(snapshot, sectionId) {
  return snapshot?.sections?.find((section) => section.id === sectionId)?.items?.[0] || null
}

function HighlightItem({emoji, title, item}) {
  if (!item) return null

  return (
    <div className={styles.item}>
      <div className={styles.itemHeader}>
        <span className={styles.itemEmoji} aria-hidden="true">
          {emoji}
        </span>
        <span className={styles.itemTitle}>{title}</span>
      </div>
      <strong className={styles.itemName}>{item.name}</strong>
      <p className={styles.itemMeta}>
        {item.producer} · {item.region}
      </p>
    </div>
  )
}

export default function CommunityHighlightsCard({snapshot, text = {}, className = ''}) {
  const blind = getTopItem(snapshot, 'blind')
  const surprising = getTopItem(snapshot, 'surprising')
  const qualityPrice = getTopItem(snapshot, 'qualityPrice')

  return (
    <section className={`${styles.card} ${className}`.trim()}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{text.eyebrow || 'Community'}</span>
          <h2 className={styles.title}>{text.title || 'Le classifiche della community'}</h2>
          <p className={styles.description}>
            {text.description ||
              'Un piccolo riassunto delle classifiche pubbliche basate su degustazioni reali.'}
          </p>
        </div>
      </div>

      <div className={styles.list}>
        <HighlightItem emoji="🏆" title={text.blindTitle || 'Miglior vino alla cieca'} item={blind} />
        <HighlightItem emoji="🍷" title={text.surprisingTitle || 'Vino più sorprendente'} item={surprising} />
        <HighlightItem emoji="💰" title={text.qualityPriceTitle || 'Miglior Q/P'} item={qualityPrice} />
      </div>

      <div className={styles.actions}>
        <Link href="/classifiche" className="btn secondary btn-inline">
          {text.cta || 'Esplora'}
        </Link>
      </div>
    </section>
  )
}
