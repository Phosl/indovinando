import styles from './PageSkeleton.module.scss'

function Bone({className = ''}) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />
}

function ListCard({compact = false}) {
  return (
    <article className={`skeleton-card ${styles.card} ${compact ? styles.cardCompact : ''}`}>
      <Bone className={styles.cardMedia} />
      <div className={styles.cardContent}>
        <Bone className={styles.cardTitle} />
        <Bone className={styles.cardLineWide} />
        <Bone className={styles.cardLine} />
        <div className={styles.pills}>
          <Bone className={styles.pill} />
          <Bone className={styles.pillShort} />
        </div>
      </div>
    </article>
  )
}

export default function PageSkeleton({
  variant = 'list',
  cards = 3,
  showTopBar = true,
  showHero = true,
  showBottomAction = false,
}) {
  const isGrid = variant === 'grid'
  const isDetail = variant === 'detail'
  const isForm = variant === 'form'

  return (
    <main className={styles.page} aria-busy="true" aria-label="Caricamento pagina">
      <div className={styles.container}>
        {showTopBar ? (
          <div className={`skeleton-frame ${styles.topBar}`}>
            <Bone className={styles.topBarButton} />
            <Bone className={styles.topBarTitle} />
            <Bone className={styles.topBarAction} />
          </div>
        ) : null}

        {showHero ? (
          <section className={`skeleton-card ${styles.hero}`}>
            <Bone className={styles.eyebrow} />
            <Bone className={styles.heroTitle} />
            <Bone className={styles.heroLineWide} />
            <Bone className={styles.heroLine} />
            <div className={styles.pills}>
              <Bone className={styles.pill} />
              <Bone className={styles.pillShort} />
              <Bone className={styles.pillTiny} />
            </div>
          </section>
        ) : null}

        {isDetail ? (
          <section className={`skeleton-card ${styles.detailCard}`}>
            <Bone className={styles.detailMedia} />
            <div className={styles.detailContent}>
              <Bone className={styles.eyebrow} />
              <Bone className={styles.detailTitle} />
              <Bone className={styles.cardLineWide} />
              <div className={styles.detailGrid}>
                {Array.from({length: 4}).map((_, index) => (
                  <Bone key={index} className={styles.detailStat} />
                ))}
              </div>
            </div>
          </section>
        ) : isForm ? (
          <section className={`skeleton-card ${styles.formCard}`}>
            {Array.from({length: 3}).map((_, index) => (
              <div key={index} className={styles.field}>
                <Bone className={styles.fieldLabel} />
                <Bone className={styles.fieldInput} />
              </div>
            ))}
            <Bone className={styles.formButton} />
          </section>
        ) : (
          <section className={isGrid ? styles.grid : styles.list}>
            {Array.from({length: cards}).map((_, index) => (
              <ListCard key={index} compact={isGrid} />
            ))}
          </section>
        )}
      </div>

      {showBottomAction ? (
        <div className={`skeleton-frame ${styles.bottomAction}`}>
          <Bone className={styles.bottomButton} />
        </div>
      ) : null}
    </main>
  )
}
