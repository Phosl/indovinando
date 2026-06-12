'use client'

import Image from 'next/image'
import Icon from '@/components/Icon'
import styles from './gameCreate.module.scss'

export default function AutomaticStepReviewList({
  failedPreviewIds,
  getBottleCompletionMeta,
  getBottleCoreData,
  getBottleDisplayName,
  handleOpenBottleDetail,
  handlePreviewImageError,
  markPreviewError,
  setAutoStep,
  t,
  uploadedImages,
}) {
  return (
    <>
      <h1 className={styles.autoModeTitleCentered}>{t('automaticReviewTitle')}</h1>
      <p className={styles.autoModeDescriptionCentered}>{t('automaticReviewDescription')}</p>

      <section className={styles.autoBottleSummaryList}>
        {uploadedImages.map((image, index) => {
          const completion = getBottleCompletionMeta(image)
          const {details, grapes, region, appellation, wineType} = getBottleCoreData(image)
          const previewFailed = failedPreviewIds.includes(image.id)
          const hasCatalogPresence =
            !!image.recognized_payload?.catalog_match?.matched ||
            !!image.recognized_payload?.catalog_sync?.synced

          return (
            <button
              key={image.id}
              type="button"
              className={styles.autoBottleSummaryCard}
              onClick={() => handleOpenBottleDetail(image)}>
              <div className={styles.autoBottleSummaryMedia}>
                <Image
                  src={image.clientPreviewUrl || `/api/auto-tasting/image?id=${image.id}`}
                  alt={image.original_filename || image.storage_path}
                  fill
                  unoptimized
                  className={styles.autoBottleSummaryImage}
                  sizes="120px"
                  onError={() => {
                    handlePreviewImageError(image.id).catch(() => markPreviewError(image.id))
                  }}
                />
                {previewFailed ? (
                  <div className={styles.autoBottleSummaryFallback}>
                    <span>{t('automaticPreviewUnavailable')}</span>
                  </div>
                ) : null}
              </div>
              <div className={styles.autoBottleSummaryBody}>
                <div className={styles.autoBottleSummaryHeader}>
                  <div className={styles.autoBottleSummaryHeaderText}>
                    <strong>{getBottleDisplayName(image, index)}</strong>
                    <p className={styles.autoBottleSummaryMeta}>
                      {image.status === 'recognized'
                        ? [image.recognized_producer, image.recognized_vintage]
                            .filter(Boolean)
                            .join(' · ') || t('automaticBottlePendingLabel')
                        : t('automaticBottleAnalyzingLabel')}
                    </p>
                  </div>
                  <div className={styles.autoBottleSummaryHeaderBadges}>
                    <span
                      className={`${styles.autoBottleStatusBadge} ${
                        completion.isComplete
                          ? styles.autoBottleStatusBadgeComplete
                          : styles.autoBottleStatusBadgeIncomplete
                      }`}>
                      <span
                        className={styles.autoBottleStatusBadgeChart}
                        style={{
                          background: `conic-gradient(var(--success) ${completion.percent * 3.6}deg, rgba(77, 49, 155, 0) 0deg)`,
                        }}>
                        <span className={styles.autoBottleStatusBadgeChartInner} />
                      </span>
                      <span>{completion.percent}%</span>
                    </span>
                    {hasCatalogPresence ? (
                      <span
                        className={`${styles.autoModeFeatureBadge} ${styles.autoModeFeatureBadgeIconOnly}`}
                        title={t('automaticCatalogBadge')}
                        aria-label={t('automaticCatalogBadge')}>
                        <Icon
                          src="/icons/match.svg"
                          size={16}
                          className={styles.autoModeFeatureIcon}
                        />
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className={styles.autoBottleSummaryFacts}>
                  {[details.country, region, appellation, wineType, grapes[0]]
                    .filter(Boolean)
                    .slice(0, 4)
                    .map((item) => (
                      <span key={`${image.id}-${item}`} className={styles.autoBottleSummaryFact}>
                        {item}
                      </span>
                    ))}
                </div>
              </div>
            </button>
          )
        })}
      </section>

      <button
        type="button"
        className={styles.autoAddMoreBottlesCard}
        onClick={() => setAutoStep(1)}>
        <span className={styles.autoAddMoreBottlesIcon}>
          <Icon name="photo" size={22} />
        </span>
        <div className={styles.autoAddMoreBottlesCopy}>
          <strong>{t('automaticAddMoreBottlesTitle')}</strong>
          <span>{t('automaticAddMoreBottlesDescription')}</span>
        </div>
      </button>
    </>
  )
}
