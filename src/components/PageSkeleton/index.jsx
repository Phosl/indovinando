'use client'

import styles from './PageSkeleton.module.scss'
import {useT} from '@/lib/i18n/useT'
import {SkeletonBone, SkeletonCard, SkeletonFrame} from '@/components/ui/Skeleton'

function ListCard({compact = false}) {
  return (
    <SkeletonCard
      as="article"
      className={`${styles.card} ${compact ? styles.cardCompact : ''}`}>
      <SkeletonBone className={styles.cardMedia} />
      <div className={styles.cardContent}>
        <SkeletonBone className={styles.cardTitle} />
        <SkeletonBone className={styles.cardLineWide} />
        <SkeletonBone className={styles.cardLine} />
        <div className={styles.pills}>
          <SkeletonBone className={styles.pill} />
          <SkeletonBone className={styles.pillShort} />
        </div>
      </div>
    </SkeletonCard>
  )
}

function DetailSkeleton() {
  return (
    <SkeletonCard as="section" className={styles.detailCard}>
      <SkeletonBone className={styles.detailMedia} />
      <div className={styles.detailContent}>
        <SkeletonBone className={styles.eyebrow} />
        <SkeletonBone className={styles.detailTitle} />
        <SkeletonBone className={styles.cardLineWide} />
        <div className={styles.detailGrid}>
          {Array.from({length: 4}).map((_, index) => (
            <SkeletonBone key={index} className={styles.detailStat} />
          ))}
        </div>
      </div>
    </SkeletonCard>
  )
}

function FormSkeleton() {
  return (
    <SkeletonCard as="section" className={styles.formCard}>
      {Array.from({length: 3}).map((_, index) => (
        <div key={index} className={styles.field}>
          <SkeletonBone className={styles.fieldLabel} />
          <SkeletonBone className={styles.fieldInput} />
        </div>
      ))}
      <SkeletonBone className={styles.formButton} />
    </SkeletonCard>
  )
}

function PlaySkeleton() {
  return (
    <div className={styles.play}>
      <SkeletonCard as="section" className={styles.playCard}>
        <div className={styles.playProgress}>
          <SkeletonBone className={styles.eyebrow} />
          <SkeletonBone className={styles.playProgressBar} />
        </div>
        <SkeletonBone className={styles.playTitle} />
        <SkeletonBone className={styles.playLine} />
        <div className={styles.answers}>
          {Array.from({length: 4}).map((_, index) => (
            <SkeletonBone key={index} className={styles.answer} />
          ))}
        </div>
      </SkeletonCard>
      <SkeletonFrame className={styles.playAction}>
        <SkeletonBone className={styles.playActionButton} />
      </SkeletonFrame>
    </div>
  )
}

function ResultsSkeleton({cards}) {
  return (
    <div className={styles.results}>
      <SkeletonCard as="section" className={styles.resultsHero}>
        <SkeletonBone className={styles.resultsBadge} />
        <SkeletonBone className={styles.resultsTitle} />
        <SkeletonBone className={styles.resultsScore} />
      </SkeletonCard>
      <section className={styles.list}>
        {Array.from({length: cards}).map((_, index) => (
          <SkeletonCard as="article" className={styles.resultRow} key={index}>
            <SkeletonBone className={styles.resultRank} />
            <div className={styles.resultContent}>
              <SkeletonBone className={styles.resultName} />
              <SkeletonBone className={styles.resultMeta} />
            </div>
            <SkeletonBone className={styles.resultPoints} />
          </SkeletonCard>
        ))}
      </section>
    </div>
  )
}

export function SkeletonTemplate({
  variant = 'list',
  cards = 3,
  showTopBar = true,
  showHero = true,
}) {
  const isGrid = variant === 'grid'
  const isDetail = variant === 'detail'
  const isForm = variant === 'form'
  const isPlay = variant === 'play'
  const isResults = variant === 'results'

  return (
    <>
      {showTopBar ? (
        <SkeletonFrame className={styles.topBar}>
          <SkeletonBone className={styles.topBarButton} />
          <SkeletonBone className={styles.topBarTitle} />
          <SkeletonBone className={styles.topBarAction} />
        </SkeletonFrame>
      ) : null}

      {showHero && !isPlay && !isResults ? (
        <SkeletonCard as="section" className={styles.hero}>
          <SkeletonBone className={styles.eyebrow} />
          <SkeletonBone className={styles.heroTitle} />
          <SkeletonBone className={styles.heroLineWide} />
          <SkeletonBone className={styles.heroLine} />
          <div className={styles.pills}>
            <SkeletonBone className={styles.pill} />
            <SkeletonBone className={styles.pillShort} />
            <SkeletonBone className={styles.pillTiny} />
          </div>
        </SkeletonCard>
      ) : null}

      {isDetail ? (
        <DetailSkeleton />
      ) : isForm ? (
        <FormSkeleton />
      ) : isPlay ? (
        <PlaySkeleton />
      ) : isResults ? (
        <ResultsSkeleton cards={cards} />
      ) : (
        <section className={isGrid ? styles.grid : styles.list}>
          {Array.from({length: cards}).map((_, index) => (
            <ListCard key={index} compact={isGrid} />
          ))}
        </section>
      )}
    </>
  )
}

export default function PageSkeleton({
  variant = 'list',
  cards = 3,
  showTopBar = true,
  showHero = true,
  showBottomAction = false,
  embedded = false,
}) {
  const t = useT('common')
  const Root = embedded ? 'div' : 'main'

  return (
    <Root
      className={`${styles.page} ${embedded ? styles.pageEmbedded : ''}`}
      aria-busy="true">
      <span className={styles.status} role="status">
        {t('loading')}
      </span>
      <div className={styles.container}>
        <SkeletonTemplate
          variant={variant}
          cards={cards}
          showTopBar={showTopBar}
          showHero={showHero}
        />
      </div>
      {showBottomAction ? (
        <SkeletonFrame className={styles.bottomAction}>
          <SkeletonBone className={styles.bottomButton} />
        </SkeletonFrame>
      ) : null}
    </Root>
  )
}
