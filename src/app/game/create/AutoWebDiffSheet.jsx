'use client'

import styles from './gameCreate.module.scss'

export default function AutoWebDiffSheet({
  handleApplyWebSearchDiff,
  isApplyingWebDiff,
  setLastWebSearchReview,
  setWebSearchReview,
  t,
  webSearchReview,
}) {
  if (!webSearchReview) return null

  const handleClose = () => {
    setLastWebSearchReview(webSearchReview)
    setWebSearchReview(null)
  }

  return (
    <div
      className={styles.autoDiffSheetOverlay}
      onClick={() => {
        if (!isApplyingWebDiff) {
          handleClose()
        }
      }}>
      <div className={styles.autoDiffSheet} onClick={(event) => event.stopPropagation()}>
        <div className={styles.autoDiffSheetHeader}>
          <div>
            <h3>{t('automaticWebDiffTitle')}</h3>
            <p>{t('automaticWebDiffSubtitle')}</p>
          </div>
          <button
            type="button"
            className={styles.autoPreviewModalClose}
            onClick={handleClose}
            aria-label={t('close')}
            disabled={isApplyingWebDiff}>
            ×
          </button>
        </div>

        <div className={styles.autoDiffSheetBody}>
          {webSearchReview.diffs.map((diff) => {
            const checked = webSearchReview.selectedFields.includes(diff.key)
            return (
              <button
                key={diff.key}
                type="button"
                className={`${styles.autoDiffItem} ${checked ? styles.autoDiffItemSelected : ''}`}
                disabled={isApplyingWebDiff}
                onClick={() => {
                  if (isApplyingWebDiff) return
                  setWebSearchReview((prev) => {
                    if (!prev) return prev
                    const alreadySelected = prev.selectedFields.includes(diff.key)
                    return {
                      ...prev,
                      selectedFields: alreadySelected
                        ? prev.selectedFields.filter((key) => key !== diff.key)
                        : [...prev.selectedFields, diff.key],
                    }
                  })
                }}>
                <div className={styles.autoDiffItemContent}>
                  <div className={styles.autoDiffItemHeaderRow}>
                    <strong>{diff.label}</strong>
                    <span
                      className={
                        checked ? styles.autoDiffSelectedPill : styles.autoDiffUnselectedPill
                      }>
                      {checked ? t('selected') : t('unselected')}
                    </span>
                  </div>
                  <div className={styles.autoDiffColumns}>
                    <div className={styles.autoDiffColumn}>
                      <span>{t('automaticCurrentValueLabel')}</span>
                      <p>{diff.currentDisplay}</p>
                    </div>
                    <div className={styles.autoDiffColumn}>
                      <span>{t('automaticProposedValueLabel')}</span>
                      <p>{diff.proposedDisplay}</p>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className={styles.autoDiffSheetFooter}>
          <button type="button" className="btn neutral" onClick={() => setWebSearchReview(null)}>
            {t('close')}
          </button>
          <button
            type="button"
            className="btn success"
            disabled={isApplyingWebDiff || webSearchReview.selectedFields.length === 0}
            onClick={handleApplyWebSearchDiff}>
            {isApplyingWebDiff ? t('automaticUpdatingAction') : t('automaticApplyWebDiffAction')}
          </button>
        </div>
      </div>
    </div>
  )
}
