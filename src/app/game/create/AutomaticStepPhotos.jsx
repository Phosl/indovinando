'use client'

import Image from 'next/image'
import Icon from '@/components/Icon'
import styles from './gameCreate.module.scss'

export default function AutomaticStepPhotos({
  analyzingImageId,
  failedPreviewIds,
  fileInputRef,
  getBottleCompletionMeta,
  handleDeleteImage,
  handleFilesUpload,
  handlePreviewImageError,
  isAnalyzingAll,
  isUploading,
  deletingImageId,
  markPreviewError,
  markPreviewLoaded,
  previewLoadProgress,
  t,
  uploadProgress,
  uploadedImages,
  formatBytes,
}) {
  return (
    <>
      <h1 className={styles.autoModeTitleCentered}>
        {uploadedImages.length > 0 ? t('automaticStep1TitleWithPhotos') : t('automaticStep1Title')}
      </h1>
      <p className={styles.autoModeDescriptionCentered}>
        {uploadedImages.length > 0
          ? t('automaticStep1DescriptionWithPhotos')
          : t('automaticStep1Description')}
      </p>

      {isUploading && uploadProgress.total > 0 ? (
        <div className={styles.autoModeUploadProgressWrap}>
          <p className={styles.autoModeUploadProgress}>
            {uploadProgress.current}/{uploadProgress.total} {uploadProgress.phase}{' '}
            {uploadProgress.fileName} ({uploadProgress.overallPercent}%)
            {uploadProgress.totalBytes > 0
              ? ` · ${formatBytes(uploadProgress.loadedBytes)} / ${formatBytes(uploadProgress.totalBytes)}`
              : ''}
          </p>
          <div className={styles.autoModeUploadProgressBar}>
            <span style={{width: `${uploadProgress.overallPercent}%`}} />
          </div>
        </div>
      ) : null}

      {!isUploading &&
      previewLoadProgress.total > 0 &&
      previewLoadProgress.loaded < previewLoadProgress.total ? (
        <div className={styles.autoModeUploadProgressWrap}>
          <p className={styles.autoModeUploadProgress}>
            {t('automaticPreviewLoadingLabel', {
              loaded: String(previewLoadProgress.loaded),
              total: String(previewLoadProgress.total),
            })}
          </p>
          <div className={styles.autoModeUploadProgressBar}>
            <span
              style={{
                width: `${Math.round((previewLoadProgress.loaded / previewLoadProgress.total) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={`${styles.autoUploadHero} ${uploadedImages.length > 0 ? styles.autoUploadHeroActive : ''}`}
        disabled={isUploading || !!analyzingImageId || isAnalyzingAll}
        onClick={() => fileInputRef.current?.click()}>
        <span className={styles.autoUploadHeroIcon}>
          <Icon name="photo" size={34} />
        </span>
        <strong>
          {uploadedImages.length > 0 ? t('automaticNextPhotoTitle') : t('automaticFirstPhotoTitle')}
        </strong>
        <span>
          {uploadedImages.length > 0
            ? t('automaticNextPhotoSubtitle')
            : t('automaticFirstPhotoSubtitle')}
        </span>
      </button>

      <div className={styles.autoUploadSectionHeader}>
        <strong>{t('automaticAddedBottlesLabel')}</strong>
        <span>({uploadedImages.length}/6)</span>
      </div>

      <section className={styles.autoUploadGrid}>
        {Array.from({length: 6}).map((_, index) => {
          const image = uploadedImages[index] || null
          const previewFailed = image ? failedPreviewIds.includes(image.id) : false
          const completion = image ? getBottleCompletionMeta(image) : null

          if (!image) {
            return (
              <button
                key={`empty-${index}`}
                type="button"
                className={styles.autoUploadTileEmpty}
                onClick={() => fileInputRef.current?.click()}>
                <span className={styles.autoUploadTilePlus}>
                  <Icon name="photo" size={22} />
                </span>
              </button>
            )
          }

          return (
            <div
              key={image.id}
              className={`${styles.autoUploadTileFilled} ${
                deletingImageId === image.id ? styles.autoUploadTileDeleting : ''
              }`}>
              {deletingImageId === image.id ? (
                <div className={styles.autoUploadTileDeleteOverlay} aria-hidden="true" />
              ) : null}
              <button
                type="button"
                className={`btn danger-negative btn-circle ${styles.autoUploadTileDelete}`}
                onClick={() => handleDeleteImage(image.id)}
                disabled={!!deletingImageId || !!analyzingImageId || isAnalyzingAll}
                aria-label={
                  deletingImageId === image.id ? t('automaticDeleting') : t('automaticDeleteAction')
                }>
                <Icon src="/icons/bucket.svg" size={18} />
              </button>
              <Image
                src={image.clientPreviewUrl || `/api/auto-tasting/image?id=${image.id}`}
                alt={image.original_filename || image.storage_path}
                fill
                unoptimized
                className={styles.autoUploadTileImage}
                sizes="(max-width: 520px) 33vw, 160px"
                onLoad={() => markPreviewLoaded(image.id)}
                onError={() => {
                  handlePreviewImageError(image.id).catch(() => markPreviewError(image.id))
                }}
              />
              {previewFailed ? (
                <div className={styles.autoUploadTileFallback}>
                  <span>{t('automaticPreviewUnavailable')}</span>
                </div>
              ) : null}
              {image.status === 'recognized' && completion ? (
                <span className={styles.autoUploadTileProgressPill}>
                  <Icon name="check" size={14} />
                  <span>{completion.percent}%</span>
                </span>
              ) : null}
            </div>
          )
        })}
      </section>
    </>
  )
}
