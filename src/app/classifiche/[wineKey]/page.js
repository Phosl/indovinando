import {cache} from 'react'
import {notFound} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {getPublicWineDetailSnapshot} from '@/lib/publicRankings'
import PartnerPageHeader from '@/components/partner/PartnerPageHeader'
import Icon from '@/components/Icon'
import JsonLd from '@/components/JsonLd'
import {
  buildBreadcrumbStructuredData,
  buildPageMetadata,
  getSiteUrl,
  SITE_NAME,
} from '@/lib/seo'
import it from '@/lib/i18n/locales/it.json'
import en from '@/lib/i18n/locales/en.json'
import styles from '../rankings.module.scss'
import autoStyles from '../../game/create/gameCreate.module.scss'

function fillMetricLabel(template, value) {
  return String(template || '{value}').replace('{value}', value || '—')
}

const getCachedPublicWineDetail = cache(async (wineKey, lang) => {
  const supabase = await createServerSupabase()
  return getPublicWineDetailSnapshot(supabase, wineKey, lang)
})

export async function generateMetadata({params}) {
  const resolvedParams = await params
  const wineKey = decodeURIComponent(resolvedParams?.wineKey || '')
  const lang = await getServerLanguage()
  const detail = await getCachedPublicWineDetail(wineKey, lang)

  if (!detail || detail.isInitialData) {
    return buildPageMetadata({
      title: lang === 'en' ? 'Wine not found' : 'Vino non trovato',
      path: wineKey ? `/classifiche/${encodeURIComponent(wineKey)}` : '/classifiche',
      lang,
      noIndex: true,
    })
  }

  const description =
    lang === 'en'
      ? `${detail.name} by ${detail.producer}: blind tasting ratings, recognition rate, average price, and public ranking positions.`
      : `${detail.name} di ${detail.producer}: valutazioni alla cieca, riconoscibilità, prezzo medio e posizioni nelle classifiche pubbliche.`

  return buildPageMetadata({
    title: `${detail.name} · ${detail.producer}`,
    description,
    path: `/classifiche/${encodeURIComponent(detail.wineGroupKey)}`,
    lang,
  })
}

export default async function PublicWinePage({params}) {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const locale = lang === 'en' ? en : it
  const text = locale.rankingsWinePage || it.rankingsWinePage
  const landingText = locale.landing || it.landing || {}
  const commonText = locale.common || it.common || {}
  const resolvedParams = await params
  const wineKey = decodeURIComponent(resolvedParams?.wineKey || '')
  const {
    data: {user},
  } = await supabase.auth.getUser()

  const detail = await getCachedPublicWineDetail(wineKey, lang)
  if (!detail) notFound()
  const wineUrl = getSiteUrl(`/classifiche/${encodeURIComponent(detail.wineGroupKey)}`)
  const structuredData = detail.isInitialData
    ? null
    : {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        '@id': `${wineUrl}#blind-tasting-data`,
        name:
          lang === 'en'
            ? `Blind tasting data for ${detail.name}`
            : `Dati di degustazione alla cieca per ${detail.name}`,
        description:
          lang === 'en'
            ? `Aggregated community results for ${detail.name} by ${detail.producer}.`
            : `Risultati aggregati della community per ${detail.name} di ${detail.producer}.`,
        url: wineUrl,
        inLanguage: lang === 'en' ? 'en-US' : 'it-IT',
        creator: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: getSiteUrl('/'),
        },
        isAccessibleForFree: true,
        spatialCoverage: detail.region || undefined,
        variableMeasured: [
          text.stats.ratingCount,
          text.stats.tastingCount,
          text.stats.recognitionRate,
          text.stats.averagePrice,
        ],
      }
  const breadcrumbData = buildBreadcrumbStructuredData([
    {name: 'Indovinando', path: '/'},
    {
      name: lang === 'en' ? 'Blind wine tasting rankings' : 'Classifiche vini alla cieca',
      path: '/classifiche',
    },
    {
      name: detail.name,
      path: `/classifiche/${encodeURIComponent(detail.wineGroupKey)}`,
    },
  ])

  return (
    <main className={styles.page}>
      <JsonLd data={structuredData ? [structuredData, breadcrumbData] : breadcrumbData} />
      <div className={styles.container}>
        <PartnerPageHeader
          isLoggedIn={Boolean(user)}
          title={detail.name}
          backHref="/classifiche"
          navText={landingText.nav || {}}
          landingBackHref="/classifiche"
          landingBackLabel={commonText.back || 'Indietro'}
        />

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
