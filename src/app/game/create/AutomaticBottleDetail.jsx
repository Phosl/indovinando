'use client'

import Image from 'next/image'
import Icon from '@/components/Icon'
import styles from './gameCreate.module.scss'

export default function AutomaticBottleDetail({
  analyzingImageId,
  canAnalyzeSingle,
  canRunWebSearch,
  deletingImageId,
  detailCompletion,
  detailCore,
  detailDraft,
  detailEditMode,
  getBottleDisplayName,
  handleAnalyzeImage,
  handleCloseBottleDetail,
  handleDetailDraftChange,
  handleSaveBottleDetail,
  handleVerifyImage,
  handleWebSearchImage,
  isAnalyzingAll,
  isSavingDetail,
  lang,
  lastWebSearchReview,
  localizeNarrativeText,
  normalizeAcidityForQuiz,
  normalizeBodyForQuiz,
  normalizeHarmonyForQuiz,
  normalizePriceAnswer,
  representativePrice,
  resolveRepresentativePrice,
  selectedBottle,
  selectedBottleIndex,
  setDetailEditMode,
  setToast,
  setWebSearchReview,
  syncDetailDraftFromImage,
  t,
  verifyingImageId,
  webSearchingImageId,
  webSearchReview,
}) {
  const details = detailCore?.details || {}
  const region = detailCore?.region || ''
  const appellation = detailCore?.appellation || ''
  const wineType = detailCore?.wineType || ''
  const primaryGrape = detailCore?.grapes?.[0] || ''
  const hasCatalogDetails = !!(details.country || region || appellation || primaryGrape || wineType)
  const hasMatch = !!selectedBottle?.recognized_payload?.catalog_match?.matched
  const hasCatalogSync = !!selectedBottle?.recognized_payload?.catalog_sync?.synced
  const hasCatalogPresence = hasMatch || hasCatalogSync
  const shouldAllowReanalyze =
    selectedBottle.status !== 'recognized' || (detailCompletion ? !detailCompletion.isComplete : true)
  const webEnrichmentMeta = selectedBottle?.recognized_payload?.web_enrichment || {}
  const hasWebSources = Array.isArray(webEnrichmentMeta.sources)
  const hasWebEnrichment =
    !!webEnrichmentMeta.applied ||
    !!details.short_description ||
    !!details.why_notable ||
    (hasWebSources && webEnrichmentMeta.sources.length > 0)
  const hasRestoredWebData =
    !hasWebEnrichment &&
    !!details.web_enrichment_sources &&
    Array.isArray(details.web_enrichment_sources) &&
    details.web_enrichment_sources.length > 0
  const requiresReview = !!selectedBottle?.recognized_payload?.review?.required
  const isVerified = !!selectedBottle?.recognized_payload?.verification?.verified
  const webSearchError = selectedBottle?.recognized_payload?.web_enrichment?.error || null
  const webSearchSkippedReason =
    selectedBottle?.recognized_payload?.web_enrichment?.skipped &&
    selectedBottle?.recognized_payload?.web_enrichment?.reason
      ? selectedBottle.recognized_payload.web_enrichment.reason
      : null
  const hasVision =
    selectedBottle?.recognized_payload?.provider === 'openai_vision' ||
    String(selectedBottle?.recognized_payload?.extractor || '').startsWith('openai-vision')
  const localizedWhyNotable = localizeNarrativeText(details?.why_notable, lang)
  const localizedShortDescription = localizeNarrativeText(details?.short_description, lang)
  const webSources = hasWebSources ? webEnrichmentMeta.sources.filter(Boolean) : []
  const priceBand = details.quiz_price_band || details.price_band || null
  const resolvedRepresentativePrice = resolveRepresentativePrice(
    details.average_price ?? details.price ?? null,
    details.price_min ?? null,
    details.price_max ?? null,
  )
  const bottleSpecItems = [
    primaryGrape ? {label: t('automaticQuestionGrape'), value: primaryGrape} : null,
    details.price_min != null && details.price_max != null
      ? {
          label: t('automaticPriceLabel') + (details.currency ? ` ${details.currency}` : ' EUR'),
          value: `${details.price_min} - ${details.price_max}`,
        }
      : resolvedRepresentativePrice != null
        ? {
            label: t('automaticPriceLabel'),
            value: `${resolvedRepresentativePrice}${details.currency ? ` ${details.currency}` : ' EUR'}`,
          }
        : null,
    resolvedRepresentativePrice != null
      ? {
          label: t('automaticMediumPriceLabel'),
          value: normalizePriceAnswer(resolvedRepresentativePrice),
        }
      : null,
    priceBand ? {label: t('automaticQuestionPrice'), value: priceBand} : null,
    details.body
      ? {label: t('automaticQuestionBody'), value: normalizeBodyForQuiz(details.body, lang)}
      : null,
    details.acidity
      ? {label: t('automaticQuestionAcidity'), value: normalizeAcidityForQuiz(details.acidity, lang)}
      : null,
    details.harmony || details.harmonize
      ? {
          label: t('automaticQuestionHarmony'),
          value: normalizeHarmonyForQuiz(details.harmony || details.harmonize, lang),
        }
      : null,
  ].filter(Boolean)
  const webStatusMessage =
    webSearchingImageId === selectedBottle.id
      ? t('automaticWebSearchingAction')
      : webSearchError
        ? webSearchError
        : hasWebEnrichment
          ? t('automaticWebSearchSuccess')
          : hasRestoredWebData
            ? t('automaticWebCatalogSuccess')
            : webSearchSkippedReason === 'catalog_sync_found'
              ? t('automaticWebSearchSkippedCatalogSynced')
              : webSearchSkippedReason === 'already_enriched'
                ? t('automaticWebSearchSkippedAlreadyEnriched')
                : webSearchSkippedReason === 'catalog_match_found'
                  ? t('automaticWebSearchSkippedCatalogMatch')
                  : null
  const resolvedQuizDisplayValues = [details.country, region, appellation, wineType, primaryGrape].filter(
    Boolean,
  )

  return (
    <section className={styles.autoBottleCard}>
      <div className={styles.autoBottleCardBody}>
        <div className={styles.autoBottleCardMediaCol}>
          <div className={styles.autoBottleCardPreviewWrap}>
            <Image
              src={selectedBottle.clientPreviewUrl || `/api/auto-tasting/image?id=${selectedBottle.id}`}
              alt={selectedBottle.original_filename || selectedBottle.storage_path}
              fill
              unoptimized
              className={styles.autoBottleCardPreview}
              sizes="(max-width: 520px) 100vw, 360px"
            />
          </div>
        </div>

        <div className={styles.autoBottleCardInfoCol}>
          <div className={styles.autoModeUploadedBadges}>
            <span
              className={`${styles.autoBottleStatusBadge} ${
                detailCompletion?.isComplete
                  ? styles.autoBottleStatusBadgeComplete
                  : styles.autoBottleStatusBadgeIncomplete
              }`}>
              <span
                className={styles.autoBottleStatusBadgeChart}
                style={{
                  background: `conic-gradient(var(--success) ${(detailCompletion?.percent || 0) * 3.6}deg, rgba(77, 49, 155, 0.12) 0deg)`,
                }}>
                <span className={styles.autoBottleStatusBadgeChartInner} />
              </span>
              <span>{detailCompletion?.percent || 0}%</span>
            </span>
            {hasVision && (
              <span className={styles.autoModeFeatureBadge}>
                <Icon src="/icons/vision.svg" size={16} className={styles.autoModeFeatureIcon} />
                {t('automaticVisionBadge')}
              </span>
            )}
            {hasCatalogPresence && (
              <span className={styles.autoModeFeatureBadge}>
                <Icon src="/icons/match.svg" size={16} className={styles.autoModeFeatureIcon} />
                {t('automaticCatalogBadge')}
              </span>
            )}
            {hasWebEnrichment && (
              <span className={styles.autoModeFeatureBadge}>
                <Icon src="/icons/vision.svg" size={16} className={styles.autoModeFeatureIcon} />
                {t('automaticWebBadge')}
              </span>
            )}
            {!hasWebEnrichment && hasRestoredWebData && (
              <span className={styles.autoModeFeatureBadge}>
                <Icon src="/icons/share.svg" size={16} className={styles.autoModeFeatureIcon} />
                {t('automaticWebCatalogBadge')}
              </span>
            )}
            {requiresReview && (
              <span className={styles.autoModeFeatureBadge}>
                <Icon name="checkWarning" size={16} className={styles.autoModeFeatureIcon} />
                {t('automaticReviewBadge')}
              </span>
            )}
            {isVerified && (
              <span className={styles.autoModeFeatureBadge}>
                <Icon src="/icons/match.svg" size={16} className={styles.autoModeFeatureIcon} />
                {t('automaticVerifiedBadge')}
              </span>
            )}
            {hasCatalogSync && (
              <span className={styles.autoModeFeatureBadge}>
                <Icon src="/icons/redo.svg" size={16} className={styles.autoModeFeatureIcon} />
                {t('automaticCatalogSyncedBadge')}
              </span>
            )}
          </div>

          <p className={styles.autoBottleFoundName}>
            {getBottleDisplayName(selectedBottle, selectedBottleIndex >= 0 ? selectedBottleIndex : 0)}
          </p>

          {[selectedBottle.recognized_producer, selectedBottle.recognized_vintage].filter(Boolean).length > 0 ? (
            <p className={styles.autoBottleCardSubtitle}>
              {[selectedBottle.recognized_producer, selectedBottle.recognized_vintage]
                .filter(Boolean)
                .join(' | ')}
            </p>
          ) : null}

          {hasCatalogDetails ? (
            <div className={styles.autoBottleCardFacts}>
              {[details.country, region, appellation, wineType, primaryGrape]
                .filter(Boolean)
                .map((item, index) => (
                  <span key={`${selectedBottle.id}-detail-fact-${index}`} className={styles.autoBottleFactChip}>
                    <span>{item}</span>
                  </span>
                ))}
            </div>
          ) : null}

          {!detailEditMode ? (
            <>
              {shouldAllowReanalyze ? (
                <div className={styles.autoBottlePendingCard}>
                  <p>
                    {selectedBottle.status === 'recognized'
                      ? t('automaticBottleReanalyzeHint')
                      : t('automaticBottlePendingHint')}
                  </p>
                  <button
                    type="button"
                    className="btn btn-ai"
                    disabled={!canAnalyzeSingle || !!analyzingImageId || isAnalyzingAll}
                    onClick={() => handleAnalyzeImage(selectedBottle.id)}>
                    {analyzingImageId === selectedBottle.id
                      ? t('automaticAnalyzingSingle')
                      : selectedBottle.status === 'recognized'
                        ? t('automaticAnalyzeAgainAction')
                        : t('automaticAnalyzeAction')}
                  </button>
                </div>
              ) : null}

              {hasCatalogDetails ? (
                <div className={styles.autoBottleCardDataBlock}>
                  {bottleSpecItems.length > 0 ? (
                    <div className={styles.autoBottleSectionBlock}>
                      <p className={styles.autoBottleSectionTitle}>{t('automaticBottleSpecsLabel')}</p>
                      <div className={styles.autoBottleSpecGrid}>
                        {bottleSpecItems.map((item) => (
                          <div key={`${selectedBottle.id}-${item.label}`} className={styles.autoBottleSpecCard}>
                            <span className={styles.autoBottleSpecLabel}>{item.label}</span>
                            <strong className={styles.autoBottleSpecValue}>{item.value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className={styles.autoBottleSectionBlock}>
                    <p className={styles.autoBottleCardDataRow}>
                      <span className={styles.autoBottleDataLabel}>
                        <span className={styles.autoBottleDataLabelIconWrapper}>
                          <Icon src="/icons/bolt.svg" size={20} className={styles.icon} />
                        </span>
                        <strong>{t('automaticQuizResolvedLabel')}:</strong>
                      </span>
                    </p>
                    <div className={styles.autoBottleResolvedGrid}>
                      {resolvedQuizDisplayValues.map((value, index) => (
                        <span key={`${selectedBottle.id}-resolved-${index}`} className={styles.autoBottleResolvedChip}>
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className={styles.autoBottleCardDataRow}>
                    <span className={styles.autoBottleDataLabel}>
                      <span className={styles.autoBottleDataLabelIconWrapper}>
                        <Icon src="/icons/quiz.svg" size={20} className={styles.icon} />
                      </span>
                      <strong>{t('automaticQuizDataLabel')}:</strong>
                    </span>
                  </p>
                  <div className={styles.autoBottleQuickFacts}>
                    {[
                      details.country,
                      region,
                      wineType,
                      selectedBottle.recognized_vintage,
                      ...(Array.isArray(details.grapes) && details.grapes.length > 0 ? details.grapes : []),
                      details.average_price != null || details.price != null
                        ? `${t('automaticPriceLabel')}: ${details.average_price ?? details.price}${details.currency ? ` ${details.currency}` : ' EUR'}`
                        : null,
                      priceBand ? `${t('automaticQuestionPrice')}: ${priceBand}` : null,
                    ]
                      .filter(Boolean)
                      .map((item, index) => (
                        <span key={`${selectedBottle.id}-quick-${index}`} className={styles.autoBottleQuickFactChip}>
                          {item}
                        </span>
                      ))}
                  </div>

                  {localizedWhyNotable ? (
                    <div className={styles.autoBottleNarrativeCard}>
                      <p className={styles.autoBottleCardDataRow}>
                        <span className={styles.autoBottleDataLabel}>
                          <span className={styles.autoBottleDataLabelIconWrapper}>
                            <Icon src="/icons/book.svg" size={20} />
                          </span>
                          <strong>{t('automaticQuestionNotable')}:</strong>
                        </span>
                      </p>
                      <p className={styles.autoBottleNarrativeText}>{localizedWhyNotable}</p>
                    </div>
                  ) : null}

                  {localizedShortDescription ? (
                    <div className={styles.autoBottleNarrativeCard}>
                      <p className={styles.autoBottleCardDataRow}>
                        <span className={styles.autoBottleDataLabel}>
                          <span className={styles.autoBottleDataLabelIconWrapper}>
                            <Icon src="/icons/web.svg" size={20} />
                          </span>
                          <strong>{t('automaticWebSummaryLabel')}:</strong>
                        </span>
                      </p>
                      <p className={styles.autoBottleNarrativeText}>{localizedShortDescription}</p>
                    </div>
                  ) : null}

                  {webSources.length > 0 ? (
                    <details className={styles.autoBottleAccordion}>
                      <summary className={styles.autoBottleAccordionSummary}>
                        <Icon src="/icons/web.svg" size={16} />
                        <strong>{t('automaticWebSourcesLabel')}:</strong>
                      </summary>
                      <div className={styles.autoBottleAccordionBody}>
                        {webSources.map((source) => (
                          <a
                            key={`${selectedBottle.id}-${source}`}
                            href={source}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.autoBottleSourceLink}>
                            {source}
                          </a>
                        ))}
                      </div>
                    </details>
                  ) : null}

                  <div className={styles.autoBottleBackLabelBox}>
                    <div className={styles.autoBottleBackLabelHeader}>
                      <strong>{t('automaticBackLabelTitle')}</strong>
                      <span className={styles.autoBottleBackLabelBadge}>{t('automaticBackLabelSoon')}</span>
                    </div>
                    <p>{t('automaticBackLabelDescription')}</p>
                    <button
                      type="button"
                      className={styles.autoBottleBackLabelAction}
                      onClick={() =>
                        setToast({
                          message: t('automaticBackLabelComingSoonToast'),
                          tone: 'success',
                          duration: 2800,
                        })
                      }>
                      <Icon name="photo" size={18} />
                      <span>{t('automaticBackLabelAction')}</span>
                    </button>
                  </div>

                  {(selectedBottle.error_message || webSearchError) && (
                    <span className={`${styles.autoModeUploadedError} ${styles.autoBottleInlineStatus}`}>
                      {webSearchError || selectedBottle.error_message}
                    </span>
                  )}
                  {webStatusMessage && !webSearchError ? (
                    <span className={`${styles.autoModeUploadedError} ${styles.autoBottleInlineStatus}`}>
                      {webStatusMessage}
                    </span>
                  ) : null}
                  {lastWebSearchReview?.imageId === selectedBottle.id && !webSearchReview ? (
                    <button
                      type="button"
                      className={styles.autoBottleInlineLinkButton}
                      onClick={() => setWebSearchReview(lastWebSearchReview)}>
                      <Icon src="/icons/web.svg" size={16} />
                      <span>{t('automaticWebDiffReopenAction')}</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className={styles.autoBottleCardDataBlock}>
              <div className={styles.autoBottleEditGrid}>
                {[
                  ['recognized_name', t('automaticDiffNameLabel')],
                  ['recognized_producer', t('automaticDiffProducerLabel')],
                  ['recognized_vintage', t('automaticDiffVintageLabel')],
                  ['country', t('automaticQuestionCountry')],
                  ['region', t('automaticQuestionRegion')],
                  ['appellation', t('automaticDiffAppellationLabel')],
                  ['type', t('automaticDiffTypeLabel')],
                  ['grapes', t('automaticQuestionGrape')],
                  ['average_price', t('automaticMediumPriceLabel')],
                ].map(([field, label]) => (
                  <label key={field} className={styles.autoBottleEditField}>
                    <span>{label}</span>
                    <input
                      value={detailDraft?.[field] || ''}
                      onChange={(event) => handleDetailDraftChange(field, event.target.value)}
                    />
                  </label>
                ))}
                <label className={styles.autoBottleEditFieldFull}>
                  <span>{t('automaticQuestionNotable')}</span>
                  <textarea
                    rows={3}
                    value={detailDraft?.why_notable || ''}
                    onChange={(event) => handleDetailDraftChange('why_notable', event.target.value)}
                  />
                </label>
                <label className={styles.autoBottleEditFieldFull}>
                  <span>{t('automaticWebSummaryLabel')}</span>
                  <textarea
                    rows={4}
                    value={detailDraft?.short_description || ''}
                    onChange={(event) => handleDetailDraftChange('short_description', event.target.value)}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
      {!detailEditMode ? (
        <div className={styles.autoBottleCardFooterActionBar}>
          <button type="button" className="btn warning" onClick={handleCloseBottleDetail}>
            {t('automaticCancelAction')}
          </button>
          <button
            type="button"
            className="btn neutral"
            onClick={() => {
              syncDetailDraftFromImage(selectedBottle)
              setDetailEditMode(true)
            }}>
            {t('automaticBottleEditAction')}
          </button>
          <button
            type="button"
            className="btn quaternary"
            disabled={
              !!deletingImageId ||
              !!analyzingImageId ||
              isAnalyzingAll ||
              !!verifyingImageId ||
              !!webSearchingImageId ||
              !canRunWebSearch
            }
            onClick={() => handleWebSearchImage(selectedBottle.id)}>
            {webSearchingImageId === selectedBottle.id
              ? t('automaticWebSearchingAction')
              : t('automaticBottleEnrichAction')}
          </button>
          <button
            type="button"
            className="btn success"
            disabled={
              !!deletingImageId ||
              !!analyzingImageId ||
              isAnalyzingAll ||
              !!verifyingImageId ||
              !!webSearchingImageId
            }
            onClick={() => handleVerifyImage(selectedBottle.id, {closeAfterSave: true})}>
            {verifyingImageId === selectedBottle.id
              ? t('automaticSavingCatalogAction')
              : isVerified
                ? t('automaticUpdateCatalogAction')
                : t('automaticSaveCatalogAction')}
          </button>
        </div>
      ) : (
        <div className={styles.autoBottleCardFooterActionBar}>
          <button
            type="button"
            className="btn warning"
            onClick={() => {
              setDetailEditMode(false)
              syncDetailDraftFromImage(selectedBottle)
            }}>
            {t('automaticCancelAction')}
          </button>
          <button type="button" className="btn success" disabled={isSavingDetail} onClick={handleSaveBottleDetail}>
            {isSavingDetail ? t('automaticSavingAction') : t('automaticSaveAction')}
          </button>
        </div>
      )}
    </section>
  )
}
