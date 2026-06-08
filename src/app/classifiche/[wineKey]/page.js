import {notFound} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getPublicWineDetailSnapshot} from '@/lib/publicRankings'
import SmartBackTopBar from '@/components/SmartBackTopBar'
import Icon from '@/components/Icon'
import it from '@/lib/i18n/locales/it.json'
import en from '@/lib/i18n/locales/en.json'
import styles from '../rankings.module.scss'
import autoStyles from '../../game/create/gameCreate.module.scss'

function fillMetricLabel(template, value) {
  return String(template || '{value}').replace('{value}', value || '—')
}

export default async function PublicWinePage({params}) {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const locale = lang === 'en' ? en : it
  const text = locale.rankingsWinePage || it.rankingsWinePage
  const resolvedParams = await params
  const wineKey = decodeURIComponent(resolvedParams?.wineKey || '')

  const detail = await getPublicWineDetailSnapshot(supabase, wineKey, lang)
  if (!detail) notFound()

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <SmartBackTopBar title={detail.name} fallbackHref="/classifiche" />

        <section className={styles.hero}>
          <div className={styles.heroTopRow}>
            <span className={styles.eyebrow}>{text.eyebrow}</span>
          </div>
          <h1>{detail.name}</h1>
          <p>{detail.producer}</p>
          <div className={styles.heroPills}>
            <span className={styles.heroPill}>{detail.region}</span>
            {detail.appellation ? <span className={styles.heroPill}>{detail.appellation}</span> : null}
            {detail.averagePrice ? <span className={styles.heroPill}>{detail.averagePrice}</span> : null}
          </div>
        </section>

        <section className={autoStyles.autoBottleCard}>
          <div className={autoStyles.autoBottleCardBody}>
            <div className={autoStyles.autoBottleCardMediaCol}>
              <div className={autoStyles.autoBottleCardPreviewWrap}>
                <div className={styles.wineDetailPreviewFallback}>
                  <Icon src="/icons/bottle.svg" size={44} className={styles.wineDetailPreviewIcon} />
                </div>
              </div>
            </div>

            <div className={autoStyles.autoBottleCardInfoCol}>
              <div className={autoStyles.autoModeUploadedBadges}>
                <span className={autoStyles.autoModeFeatureBadge}>{text.summaryEyebrow}</span>
                {detail.placements.length ? (
                  <span className={autoStyles.autoModeFeatureBadge}>{text.rankingsEyebrow}</span>
                ) : null}
              </div>

              <p className={autoStyles.autoBottleFoundName}>{detail.name}</p>
              <p className={autoStyles.autoBottleCardSubtitle}>{detail.producer}</p>

              <div className={autoStyles.autoBottleCardFacts}>
                {[detail.region, detail.appellation, detail.averagePrice].filter(Boolean).map((item) => (
                  <span key={item} className={autoStyles.autoBottleFactChip}>
                    <span>{item}</span>
                  </span>
                ))}
              </div>

              <div className={autoStyles.autoBottleCardDataBlock}>
                <div className={autoStyles.autoBottleSectionBlock}>
                  <p className={autoStyles.autoBottleSectionTitle}>{text.summaryTitle}</p>
                  <div className={autoStyles.autoBottleSpecGrid}>
                    <div className={autoStyles.autoBottleSpecCard}>
                      <span className={autoStyles.autoBottleSpecLabel}>{text.stats.ratingCount}</span>
                      <span className={autoStyles.autoBottleSpecValue}>{detail.stats.ratingCount}</span>
                    </div>
                    <div className={autoStyles.autoBottleSpecCard}>
                      <span className={autoStyles.autoBottleSpecLabel}>{text.stats.tastingCount}</span>
                      <span className={autoStyles.autoBottleSpecValue}>{detail.stats.tastingCount}</span>
                    </div>
                    <div className={autoStyles.autoBottleSpecCard}>
                      <span className={autoStyles.autoBottleSpecLabel}>{text.stats.recognitionRate}</span>
                      <span className={autoStyles.autoBottleSpecValue}>{detail.stats.recognitionRate || '—'}</span>
                    </div>
                    <div className={autoStyles.autoBottleSpecCard}>
                      <span className={autoStyles.autoBottleSpecLabel}>{text.stats.averagePrice}</span>
                      <span className={autoStyles.autoBottleSpecValue}>{detail.averagePrice || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className={autoStyles.autoBottleSectionBlock}>
                  <p className={autoStyles.autoBottleSectionTitle}>{text.rankingsTitle}</p>
                  <div className={styles.placementList}>
                    {detail.placements.map((placement) => (
                      <div key={placement.id} className={styles.placementItem}>
                        <span className={styles.placementLabel}>
                          {text.sections?.[placement.id] || placement.id}
                        </span>
                        <strong className={styles.placementValue}>{placement.rank}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.sectionsGrid}>
          <article className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeadingWrap}>
                <div className={styles.sectionTitleRow}>
                  <h2 className={styles.sectionTitle}>
                    <span>{text.metricsTitle}</span>
                  </h2>
                </div>
              </div>
            </div>

            <div className={styles.rankingList}>
              <div className={styles.rankingItem}>
                <div className={styles.rankingContent}>
                  <h3>{text.sections.blind}</h3>
                  <p className={styles.rankingMeta}>
                    {fillMetricLabel(text.metrics.blindLabel, detail.stats.blindScore)}
                  </p>
                </div>
              </div>
              <div className={styles.rankingItem}>
                <div className={styles.rankingContent}>
                  <h3>{text.sections.qualityPrice}</h3>
                  <p className={styles.rankingMeta}>
                    {fillMetricLabel(text.metrics.qualityPriceLabel, detail.stats.qualityPriceScore)}
                  </p>
                </div>
              </div>
              <div className={styles.rankingItem}>
                <div className={styles.rankingContent}>
                  <h3>{text.sections.surprising}</h3>
                  <p className={styles.rankingMeta}>
                    {fillMetricLabel(text.metrics.surprisingLabel, detail.stats.surpriseScore)}
                  </p>
                </div>
              </div>
              <div className={styles.rankingItem}>
                <div className={styles.rankingContent}>
                  <h3>{text.sections.divisive}</h3>
                  <p className={styles.rankingMeta}>
                    {fillMetricLabel(text.metrics.divisiveLabel, detail.stats.divisiveScore)}
                  </p>
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}
