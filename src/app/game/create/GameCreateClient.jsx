'use client'

import {Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClient} from '@/lib/supabaseClient'
import GameEditor from '@/components/game/GameEditor'
import Loader from '@/components/Loader'
import OnboardingModal from '@/components/game/OnboardingModal'
import {AutoTastingGamePreview} from '@/components/game'
import PageLayout from '@/components/PageLayout'
import Icon from '@/components/Icon'
import {useT} from '@/lib/i18n/useT'
import styles from './gameCreate.module.scss'

const TEMPLATE_QUESTIONS = [
  {
    text: 'Stato',
    options: ['Italia', 'Francia', 'Usa', 'Australia', 'Grecia', 'Svezia', 'Spagna'],
  },
  {
    text: 'Regione',
    options: ['Toscana', 'Borgogna', 'Marche', 'Piemonte', 'Campania', 'Napa Valley', 'Umbria'],
  },
  {
    text: 'Uvaggio',
    options: [
      'Blend',
      'Sangiovese',
      'Pinot Nero',
      'Aglianico',
      'Nebbiolo',
      'Merlot',
      'Syrah',
      'Verdicchio',
    ],
  },
  {
    text: 'Anno',
    options: ['2017', '2018', '2019', '2020', '2021', '2022', '2023'],
  },
  {
    text: 'Prezzo',
    options: ['5€', '10€', '20€', '30€', '40€', '60€', '80€'],
  },
]

function ModePickerScreen({onPick, onOpenGuide}) {
  const router = useRouter()
  const t = useT('gameCreate')

  return (
    <PageLayout title={t('title')} onBack={() => router.push('/miei-giochi')}>
      <h1 className={styles.modePickerTitle}>{t('chooseModeTitle')}</h1>
      <div className={styles.modePickerGrid}>
        <button
          className={`${styles.modeCard} ${styles.modeCardQuick}`}
          onClick={() => onPick('quick')}>
          <img
            src="/game-options-quick.svg"
            alt=""
            aria-hidden="true"
            className={styles.modeCardBgImage}
          />
          <div className={styles.modeCardContent}>
            <strong className={styles.modeCardTitle}>{t('quickTitle')}</strong>
            <p className={styles.modeCardDesc}>{t('quickDescription')}</p>
            <span className="btn btn-small quaternary btn-quick-game btn-inline btn-with-icon-end">
              <span>{t('quickAction')}</span>
              <Icon name="forward" size={24} className="btn-icon" />
            </span>
          </div>
        </button>

        <button
          className={`${styles.modeCard} ${styles.modeCardCustom}`}
          onClick={() => onPick('custom')}>
          <img
            src="/game-options-custom.svg"
            alt=""
            aria-hidden="true"
            className={styles.modeCardBgImage}
          />
          <div className={styles.modeCardContent}>
            <strong className={styles.modeCardTitle}>{t('customTitle')}</strong>
            <p className={styles.modeCardDesc}>{t('customDescription')}</p>
            <span className="btn btn-small quaternary btn-custom-game btn-inline btn-with-icon-end">
              <span>{t('customAction')}</span>
              <Icon name="forward" size={24} className="btn-icon" />
            </span>
          </div>
        </button>

        <button
          className={`${styles.modeCard} ${styles.modeCardAutomatic}`}
          onClick={() => onPick('automatic')}>
          <div className={styles.modeCardContent}>
            <strong className={styles.modeCardTitle}>{t('automaticTitle')}</strong>
            <p className={styles.modeCardDesc}>{t('automaticDescription')}</p>
            <span className="btn btn-small quaternary btn-automatic-game btn-inline btn-with-icon-end">
              <span>{t('automaticAction')}</span>
              <Icon name="plusSimple" size={24} className="btn-icon" />
            </span>
          </div>
        </button>
      </div>
      <button
        type="button"
        className={`btn neutral btn-small ${styles.openGuideBtn}`}
        onClick={onOpenGuide}>
        {t('openGuide')}
      </button>
    </PageLayout>
  )
}

function AutomaticModePlaceholder({onBack, userId}) {
  const router = useRouter()
  const t = useT('gameCreate')
  const supabase = useMemo(() => createClient(), [])
  const fileInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
    fileName: '',
    phase: '',
    percent: 0,
  })
  const [deletingImageId, setDeletingImageId] = useState('')
  const [analyzingImageId, setAnalyzingImageId] = useState('')
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false)
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadedImages, setUploadedImages] = useState([])

  function normalizeCountryForQuiz(value) {
    const raw = String(value || '').trim()
    if (!raw) return null
    const lower = raw.toLowerCase()
    if (lower === 'italy') return 'Italia'
    if (lower === 'france') return 'Francia'
    if (lower === 'spain') return 'Spagna'
    if (lower === 'germany') return 'Germania'
    if (lower === 'portugal') return 'Portogallo'
    if (lower === 'united states' || lower === 'usa' || lower === 'us') return 'Stati Uniti'
    return raw
  }

  function inferRegion(details, image) {
    const direct = String(details?.region || '').trim()
    if (direct) return direct

    const source = [
      details?.appellation,
      image?.recognized_name,
      image?.recognized_payload?.text_preview,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (!source) return null

    const regionHints = [
      'sicilia',
      'toscana',
      'piemonte',
      'veneto',
      'umbria',
      'marche',
      'campania',
      'puglia',
      'lazio',
      'abruzzo',
      'sardegna',
      'friuli',
      'trentino',
      'liguria',
      'calabria',
      'molise',
      'basilicata',
      'valdost',
      'emilia romagna',
      'lombardia',
    ]
    const hit = regionHints.find(region => source.includes(region))
    return hit ? hit.replace(/\b\w/g, c => c.toUpperCase()) : null
  }

  function uploadFileWithProgress(formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/auto-tasting/upload')
      xhr.timeout = 45000

      xhr.upload.onprogress = event => {
        if (!event.lengthComputable) return
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100))
        onProgress(percent)
      }

      xhr.onload = () => {
        let parsed = null
        try {
          parsed = JSON.parse(xhr.responseText || '{}')
        } catch {
          parsed = null
        }
        resolve({status: xhr.status, body: parsed})
      }

      xhr.onerror = () => reject(new Error('network'))
      xhr.ontimeout = () => reject(new Error('request timeout after 45s'))
      xhr.send(formData)
    })
  }

  async function postMetadataWithTimeout(payload, timeoutMs = 15000) {
    const controller = new AbortController()
    let timeoutId
    try {
      return await Promise.race([
        (async () => {
          const response = await fetch('/api/auto-tasting/metadata', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
            signal: controller.signal,
          })
          const result = await response.json().catch(() => null)
          return {response, result}
        })(),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort()
            reject(new Error(`metadata timeout after ${Math.floor(timeoutMs / 1000)}s`))
          }, timeoutMs)
        }),
      ])
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  const loadUploadedImages = useCallback(async () => {
    if (!userId) return

    const {data, error} = await supabase
      .from('tasting_bottle_images')
      .select(
        'id, original_filename, storage_bucket, storage_path, status, recognized_name, recognized_producer, recognized_vintage, recognition_confidence, recognized_payload, error_message, created_at',
      )
      .eq('uploaded_by', userId)
      .order('created_at', {ascending: false})
      .limit(100)

    if (error) {
      setUploadError(`${t('automaticLoadError')} (${error.message || 'unknown'})`)
      return
    }
    setUploadedImages(data || [])
  }, [supabase, t, userId])

  useEffect(() => {
    if (!userId) return

    loadUploadedImages()
  }, [loadUploadedImages, userId])

  async function handleFilesUpload(fileList) {
    if (!userId || !fileList?.length) return

    setIsUploading(true)
    setUploadProgress({current: 0, total: 0, fileName: '', phase: '', percent: 0})
    setUploadError('')
    try {
      const files = Array.from(fileList)
      setUploadProgress({current: 0, total: files.length, fileName: '', phase: '', percent: 0})
      const createdRows = []

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const uploadFile = file
        setUploadProgress({
          current: index + 1,
          total: files.length,
          fileName: file.name,
          phase: t('automaticUploadPhaseFile'),
          percent: 0,
        })
        const formData = new FormData()
        formData.append('file', uploadFile)

        let uploadResponse
        try {
          uploadResponse = await uploadFileWithProgress(formData, percent => {
            setUploadProgress(prev => ({...prev, percent}))
          })
        } catch (networkError) {
          setUploadError(
            `${t('automaticUploadError')} (${networkError?.message || 'network'})`,
          )
          continue
        }

        if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
          setUploadError(
            `${t('automaticUploadError')} (${uploadResponse?.body?.error || 'upload'})`,
          )
          continue
        }
        const uploadInfo = uploadResponse?.body?.upload
        if (!uploadInfo?.storage_path) {
          setUploadError(`${t('automaticUploadError')} (missing upload payload)`)
          continue
        }

        setUploadProgress({
          current: index + 1,
          total: files.length,
          fileName: file.name,
          phase: t('automaticUploadPhaseMetadata'),
          percent: 100,
        })

        const metadataPayload = {
          storage_bucket: uploadInfo.storage_bucket || 'tasting-bottles',
          storage_path: uploadInfo.storage_path,
          original_filename: uploadInfo.original_filename || file.name,
          mime_type: uploadInfo.mime_type || uploadFile.type || file.type || null,
          size_bytes: uploadInfo.size_bytes ?? uploadFile.size ?? file.size,
        }

        let metadataResponse
        let metadataResult
        let metadataError = null
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          try {
            const call = await postMetadataWithTimeout(metadataPayload, 15000)
            metadataResponse = call.response
            metadataResult = call.result
            if (metadataResponse.ok) break
            metadataError = metadataResult?.error || `metadata http ${metadataResponse.status}`
          } catch (error) {
            const isAbort = error?.name === 'AbortError'
            metadataError = isAbort ? 'metadata timeout after 15s' : error?.message || 'metadata network'
          }
        }

        if (!metadataResponse?.ok) {
          await fetch('/api/auto-tasting/delete', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              storagePath: uploadInfo.storage_path,
              storageBucket: uploadInfo.storage_bucket || 'tasting-bottles',
            }),
          }).catch(() => null)
          setUploadError(`${t('automaticUploadError')} (${metadataError || 'metadata insert'})`)
          continue
        }

        if (metadataResult?.image) createdRows.push(metadataResult.image)
      }

      if (createdRows.length > 0) {
        setUploadedImages(prev => [...createdRows, ...prev])
        // Refresh in background: do not block upload completion UI.
        loadUploadedImages().catch(() => null)
      }
    } catch (error) {
      setUploadError(`${t('automaticUploadError')} (${error?.message || 'unknown'})`)
    } finally {
      setIsUploading(false)
      setUploadProgress({current: 0, total: 0, fileName: '', phase: '', percent: 0})
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleDeleteImage(imageId) {
    if (!imageId) return
    if (deletingImageId) return
    setDeletingImageId(imageId)
    setUploadError('')
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)
      let response
      let result
      try {
        response = await fetch('/api/auto-tasting/delete', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({imageId}),
          signal: controller.signal,
        })
        result = await response.json().catch(() => null)
      } finally {
        clearTimeout(timeoutId)
      }

      if (!response.ok) {
        setUploadError(`${t('automaticDeleteError')} (${result?.error || 'delete'})`)
        return
      }

      setUploadedImages(prev => prev.filter(image => image.id !== imageId))
    } catch (error) {
      setUploadError(`${t('automaticDeleteError')} (${error?.message || 'unknown'})`)
    } finally {
      setDeletingImageId('')
    }
  }

  async function handleAnalyzeImage(imageId) {
    if (!imageId) return
    if (analyzingImageId || isAnalyzingAll) return
    setAnalyzingImageId(imageId)
    setUploadError('')
    try {
      const response = await fetch('/api/auto-tasting/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({imageId}),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setUploadError(`${t('automaticAnalyzeError')} (${result?.error || 'analyze'})`)
        return
      }

      const updatedRows = Array.isArray(result?.updated) ? result.updated : []
      if (updatedRows.length > 0) {
        const map = Object.fromEntries(updatedRows.map(row => [row.id, row]))
        setUploadedImages(prev => prev.map(row => map[row.id] || row))
      }
      loadUploadedImages().catch(() => null)
    } catch (error) {
      setUploadError(`${t('automaticAnalyzeError')} (${error?.message || 'unknown'})`)
    } finally {
      setAnalyzingImageId('')
    }
  }

  async function handleAnalyzeAll() {
    if (isAnalyzingAll || analyzingImageId) return
    setIsAnalyzingAll(true)
    setUploadError('')
    try {
      const response = await fetch('/api/auto-tasting/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({analyzeAll: true}),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setUploadError(`${t('automaticAnalyzeError')} (${result?.error || 'analyze all'})`)
        return
      }
      const updatedRows = Array.isArray(result?.updated) ? result.updated : []
      if (updatedRows.length > 0) {
        const map = Object.fromEntries(updatedRows.map(row => [row.id, row]))
        setUploadedImages(prev => prev.map(row => map[row.id] || row))
      }
      loadUploadedImages().catch(() => null)
    } catch (error) {
      setUploadError(`${t('automaticAnalyzeError')} (${error?.message || 'unknown'})`)
    } finally {
      setIsAnalyzingAll(false)
    }
  }

  function buildAutoQuizPayload(images) {
    const recognized = (images || []).filter(
      image => image?.status === 'recognized' && image?.recognized_name && image?.recognized_producer,
    )
    if (recognized.length === 0) {
      throw new Error('no recognized bottles')
    }

    const bottles = recognized.map(image => {
      const details = image.recognized_payload?.catalog_details || {}
      const inferredRegion = inferRegion(details, image)
      const grapes = Array.isArray(details.grapes) ? details.grapes.filter(Boolean) : []
      const mainGrape = grapes[0] || null
      const vintageValue = image.recognized_vintage ? String(image.recognized_vintage) : null
      const priceValue =
        details.price != null
          ? `${details.price}${details.currency ? ` ${details.currency}` : ''}`.trim()
          : null
      return {
        name: image.recognized_name,
        producer: image.recognized_producer,
        year: vintageValue || '',
        wineType: details.type || '',
        _values: {
          country: normalizeCountryForQuiz(details.country),
          region: inferredRegion || null,
          grape: mainGrape,
          vintage: vintageValue,
          price: priceValue,
        },
      }
    })

    const questionDefs = [
      {key: 'country', text: t('automaticQuestionCountry')},
      {key: 'region', text: t('automaticQuestionRegion')},
      {key: 'grape', text: t('automaticQuestionGrape')},
      {key: 'vintage', text: t('automaticQuestionVintage')},
      {key: 'price', text: t('automaticQuestionPrice')},
    ]

    const templateByKey = {
      country: TEMPLATE_QUESTIONS[0]?.options || [],
      region: TEMPLATE_QUESTIONS[1]?.options || [],
      grape: TEMPLATE_QUESTIONS[2]?.options || [],
      vintage: TEMPLATE_QUESTIONS[3]?.options || [],
      price: TEMPLATE_QUESTIONS[4]?.options || [],
    }
    const effectiveQuestions = questionDefs.map(def => {
      const extractedValues = [...new Set(bottles.map(b => b._values[def.key]).filter(Boolean))]
      const templateOptions = templateByKey[def.key] || []
      const maxOptions = Math.max(1, templateOptions.length || 7)
      const options = [
        ...extractedValues,
        ...templateOptions.filter(option => !extractedValues.includes(option)),
      ].slice(0, maxOptions)
      return {_key: def.key, text: def.text, options}
    })

    const readyBottles = bottles.map(bottle => {
      const answers = effectiveQuestions.map(question => {
        if (!question._key) return null
        const value = bottle._values[question._key]
        if (!value) return null
        const idx = question.options.findIndex(option => option === value)
        return idx >= 0 ? idx : null
      })
      return {
        name: bottle.name,
        producer: bottle.producer,
        year: bottle.year,
        wineType: bottle.wineType,
        answers,
      }
    })

    return {
      name: `${t('automaticGameNamePrefix')} ${new Date().toLocaleDateString()}`,
      mode: 'create',
      status: 'draft',
      coverIndex: 0,
      questions: effectiveQuestions.map(({text, options}) => ({text, options})),
      bottles: readyBottles,
    }
  }

  async function handleCreateQuickQuiz() {
    if (isCreatingQuiz || isUploading || isAnalyzingAll || analyzingImageId || deletingImageId) return
    setIsCreatingQuiz(true)
    setUploadError('')
    try {
      const payload = buildAutoQuizPayload(uploadedImages)
      const response = await fetch('/api/game/save', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.id) {
        throw new Error(result?.error || 'save failed')
      }
      router.push(`/game/${result.id}`)
    } catch (error) {
      setUploadError(`${t('automaticCreateQuizError')} (${error?.message || 'unknown'})`)
    } finally {
      setIsCreatingQuiz(false)
    }
  }

  let quizPreview = null
  try {
    quizPreview = buildAutoQuizPayload(uploadedImages)
  } catch {
    quizPreview = null
  }

  return (
    <PageLayout title={t('title')} onBack={onBack}>
      <main className={styles.autoModePage}>
        <h1 className={styles.autoModeTitleCentered}>{t('automaticFlowTitle')}</h1>
        <p className={styles.autoModeDescriptionCentered}>{t('automaticFlowDescription')}</p>

        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className={styles.autoModeFileInput}
            onChange={event => handleFilesUpload(event.target.files)}
          />

          {isUploading && uploadProgress.total > 0 ? (
            <div className={styles.autoModeUploadProgressWrap}>
              <p className={styles.autoModeUploadProgress}>
                {uploadProgress.current}/{uploadProgress.total} {uploadProgress.phase}{' '}
                {uploadProgress.fileName} ({uploadProgress.percent}%)
              </p>
              <div className={styles.autoModeUploadProgressBar}>
                <span style={{width: `${uploadProgress.percent}%`}} />
              </div>
            </div>
          ) : null}
          {!isUploading && uploadedImages.length > 0 ? (
            <div className={styles.autoModeTopActions}>
              <button
                type="button"
                className="btn btn-small ai btn-with-icon-end"
                disabled={isUploading || isAnalyzingAll || !!analyzingImageId || isCreatingQuiz}
                onClick={handleAnalyzeAll}>
                <Icon src="/icons/vision.svg" size={20} className="btn-icon" />
                {isAnalyzingAll ? t('automaticAnalyzingAll') : t('automaticAnalyzeAllAction')}
              </button>
              <button
                type="button"
                className="btn btn-small tertiary"
                disabled={
                  isUploading ||
                  isAnalyzingAll ||
                  !!analyzingImageId ||
                  uploadedImages.length === 0 ||
                  !quizPreview
                }
                onClick={() => setIsPreviewOpen(true)}>
                {t('automaticPreviewQuizAction')}
              </button>
            </div>
          ) : null}

          <div className={styles.autoStepFixedRow}>
            <button
              type="button"
              className="btn success"
              disabled={isUploading || !!analyzingImageId || isAnalyzingAll}
              onClick={() => fileInputRef.current?.click()}>
              {isUploading ? t('automaticUploading') : t('automaticScanAction')}
            </button>
          </div>
        </>

        {isPreviewOpen && quizPreview && (
          <div className={styles.autoPreviewModalOverlay} onClick={() => setIsPreviewOpen(false)}>
            <div className={styles.autoPreviewModalContent} onClick={event => event.stopPropagation()}>
              <div className={styles.autoPreviewModalHeader}>
                <h3>{t('automaticPreviewTitle')}</h3>
                <button
                  type="button"
                  className={styles.autoPreviewModalClose}
                  onClick={() => setIsPreviewOpen(false)}
                  aria-label={t('close')}>
                  ×
                </button>
              </div>

              <div className={styles.autoPreviewModalBody}>
                <AutoTastingGamePreview
                  preview={quizPreview}
                  labels={{
                    sliderAria: t('automaticPreviewBottles'),
                    bottle: t('automaticPreviewBottleLabel'),
                    of: t('automaticPreviewOf'),
                    question: t('automaticPreviewQuestionLabel'),
                    producerMissing: t('automaticPreviewProducerMissing'),
                    yearMissing: t('automaticPreviewYearMissing'),
                    unnamedBottle: t('automaticPreviewUnnamedBottle'),
                  }}
                />
              </div>

              <div className={styles.autoPreviewModalFooter}>
                <button
                  type="button"
                  className="btn btn-small neutral"
                  onClick={() => setIsPreviewOpen(false)}>
                  {t('close')}
                </button>
                <button
                  type="button"
                  className="btn success"
                  disabled={isCreatingQuiz}
                  onClick={handleCreateQuickQuiz}>
                  {isCreatingQuiz ? t('automaticCreatingQuiz') : t('automaticCreateQuizAction')}
                </button>
              </div>
            </div>
          </div>
        )}

        <section className={styles.autoModeEmptyState}>
          <strong>{t('automaticBottlesTitle')}</strong>
          {uploadError ? <p>{uploadError}</p> : null}
          {uploadedImages.length === 0 ? (
            <p>{t('automaticBottlesEmpty')}</p>
          ) : (
            <ul className={styles.autoModeUploadedList}>
              {uploadedImages.map(image => (
                <li key={image.id} className={styles.autoModeUploadedItem}>
                  <div className={styles.autoModeUploadedPreviewWrap}>
                    <img
                      src={`/api/auto-tasting/image?id=${image.id}`}
                      alt={image.original_filename || image.storage_path}
                      className={styles.autoModeUploadedPreview}
                    />
                  </div>
                  <div className={styles.autoModeUploadedMeta}>
                    <span className={styles.autoModeUploadedName}>
                      {image.original_filename || image.storage_path}
                    </span>
                    <div className={styles.autoModeUploadedBadges}>
                      {(image.recognized_payload?.provider === 'google_vision_api' ||
                        String(image.recognized_payload?.extractor || '').startsWith(
                          'google-vision',
                        )) && (
                        <span className={styles.autoModeFeatureBadge}>
                          <Icon src="/icons/vision.svg" size={16} className={styles.autoModeFeatureIcon} />
                          {t('automaticVisionBadge')}
                        </span>
                      )}
                      {image.recognized_payload?.catalog_match?.matched && (
                        <span className={styles.autoModeFeatureBadge}>
                          <Icon src="/icons/match.svg" size={16} className={styles.autoModeFeatureIcon} />
                          {t('automaticMatchBadge')}
                        </span>
                      )}
                    </div>
                    {(image.recognized_name ||
                      image.recognized_producer ||
                      image.recognized_vintage) && (
                      <span className={styles.autoModeUploadedExtracted}>
                        {image.recognized_name || '-'} | {image.recognized_producer || '-'} |{' '}
                        {image.recognized_vintage || '-'}
                      </span>
                    )}
                    {image.recognized_payload?.catalog_details && (
                      <>
                        <span className={styles.autoModeUploadedExtracted}>
                          {t('automaticQuizDataLabel')}:{' '}
                          {[
                            image.recognized_payload.catalog_details.country,
                            image.recognized_payload.catalog_details.region,
                            image.recognized_payload.catalog_details.type,
                            image.recognized_vintage,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '-'}
                          {Array.isArray(image.recognized_payload.catalog_details.grapes) &&
                          image.recognized_payload.catalog_details.grapes.length > 0
                            ? ` · ${image.recognized_payload.catalog_details.grapes.join(', ')}`
                            : ''}
                          {image.recognized_payload.catalog_details.price != null
                            ? ` · ${t('automaticPriceLabel')}: ${image.recognized_payload.catalog_details.price}${image.recognized_payload.catalog_details.currency ? ` ${image.recognized_payload.catalog_details.currency}` : ''}`
                            : ''}
                        </span>
                        <span className={styles.autoModeUploadedExtracted}>
                          {t('automaticQuizResolvedLabel')}:{' '}
                          {[
                            image.recognized_payload.catalog_details.country || '-',
                            inferRegion(image.recognized_payload.catalog_details, image) || '-',
                            (Array.isArray(image.recognized_payload.catalog_details.grapes) &&
                            image.recognized_payload.catalog_details.grapes.length > 0
                              ? image.recognized_payload.catalog_details.grapes[0]
                              : null) || '-',
                            image.recognized_vintage || '-',
                          ].join(' | ')}
                        </span>
                      </>
                    )}
                    {image.recognition_confidence != null && (
                      <span className={styles.autoModeUploadedConfidence}>
                        conf: {Math.round(Number(image.recognition_confidence) * 100)}%
                      </span>
                    )}
                    {image.error_message && (
                      <span className={styles.autoModeUploadedError}>{image.error_message}</span>
                    )}
                  </div>
                  <div className={styles.autoModeUploadedActions}>
                    <button
                      type="button"
                      className="btn btn-small ai btn-with-icon-end"
                      disabled={isAnalyzingAll || !!analyzingImageId || !!deletingImageId}
                      onClick={() => handleAnalyzeImage(image.id)}>
                      <Icon src="/icons/vision.svg" size={20} className="btn-icon" />
                      {analyzingImageId === image.id
                        ? t('automaticAnalyzingSingle')
                        : t('automaticAnalyzeAction')}
                    </button>
                    <button
                      type="button"
                      className="btn icon-circle"
                      disabled={!!deletingImageId || !!analyzingImageId || isAnalyzingAll}
                      aria-label={`${t('automaticDeleteAction')} ${image.original_filename || image.storage_path}`}
                      onClick={() => handleDeleteImage(image.id)}>
                      <Icon name="removeSmall" size={20} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </PageLayout>
  )
}

function CreateOnboardingModal({showOnboarding, onClose, onDisable}) {
  if (!showOnboarding) return null
  return <OnboardingModal onClose={onClose} onDisable={onDisable} />
}

export default function GameCreateClient({
  initialShowOnboarding,
  userId,
  avatarOptions = [],
  mode = 'choose',
}) {
  const router = useRouter()
  const t = useT('gameCreate')
  const supabase = useMemo(() => createClient(), [])
  const [showOnboarding, setShowOnboarding] = useState(initialShowOnboarding)

  function handlePickMode(nextMode) {
    if (nextMode === 'quick') {
      router.push('/game/create/quick')
      return
    }
    if (nextMode === 'automatic') {
      router.push('/game/create/automatic')
      return
    }
    router.push('/game/create/custom')
  }

  function handleBackToModePicker() {
    router.push('/game/create')
  }

  async function handleDisableOnboarding() {
    if (!userId) {
      setShowOnboarding(false)
      return
    }
    await supabase.from('profiles').update({onboarding: false}).eq('id', userId)
    setShowOnboarding(false)
  }

  if (mode === 'choose') {
    return (
      <>
        <CreateOnboardingModal
          showOnboarding={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onDisable={handleDisableOnboarding}
        />
        <ModePickerScreen onPick={handlePickMode} onOpenGuide={() => setShowOnboarding(true)} />
      </>
    )
  }

  if (mode === 'automatic') {
    return (
      <>
        <CreateOnboardingModal
          showOnboarding={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onDisable={handleDisableOnboarding}
        />
        <AutomaticModePlaceholder onBack={handleBackToModePicker} userId={userId} />
      </>
    )
  }

  return (
    <main className="flex-container">
      <div className="flex-column">
        <CreateOnboardingModal
          showOnboarding={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onDisable={handleDisableOnboarding}
        />

        <Suspense fallback={<Loader label={t('loadingEditor')} />}>
          {mode === 'quick' ? (
            <GameEditor
              initialQuestions={TEMPLATE_QUESTIONS}
              initialGameName="Indovinando"
              userId={userId}
              avatarOptions={avatarOptions}
              isQuickCreate={true}
              onBack={handleBackToModePicker}
            />
          ) : (
            <GameEditor
              userId={userId}
              avatarOptions={avatarOptions}
              onBack={handleBackToModePicker}
            />
          )}
        </Suspense>
      </div>
    </main>
  )
}
