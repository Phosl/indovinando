'use client'

import Image from 'next/image'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClient} from '@/lib/supabaseClient'
import {GameStepsBreadcrumbs} from '@/components/game'
import {useAppShellTopBar} from '@/components/AppShellContext'
import PageLayout from '@/components/PageLayout'
import Icon from '@/components/Icon'
import InfoModal from '@/components/InfoModal'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {useT} from '@/lib/i18n/useT'
import {normalizeAiScanCredits} from '@/lib/aiScanCredits'
import {scrollPageTop} from '@/lib/scrollPageTop'
import {
  formatBytes,
  OPENAI_TEMPLATE_OPTION_KEYS,
  TEMPLATE_QUESTION_OPTIONS,
  getQuickTemplateQuestions,
  inferRegion,
  isGenericBottleFilename,
  localizeAcidityLabel,
  localizeAppellationLabel,
  localizeBodyLabel,
  localizeCountryLabel,
  localizeHarmonyLabel,
  localizeNarrativeText,
  localizeRegionLabel,
  mapWineTypeLabel,
  normalizeAcidityForQuiz,
  normalizeBodyForQuiz,
  normalizeHarmonyForQuiz,
  normalizePriceAnswer,
  resolveRepresentativePrice,
  valuesEqualForDiff,
} from './autoTastingHelpers'
import AutoAnalyzeOverlay from './AutoAnalyzeOverlay'
import AutoToast from './AutoToast'
import AutoWebDiffSheet from './AutoWebDiffSheet'
import AutomaticBottleDetail from './AutomaticBottleDetail'
import AutomaticStepPhotos from './AutomaticStepPhotos'
import AutomaticStepQuizPreview from './AutomaticStepQuizPreview'
import AutomaticStepReviewList from './AutomaticStepReviewList'
import {useAutoTastingActions} from './useAutoTastingActions'
import {buildAutoQuizPayload} from './autoTastingQuizBuilder'
import {useAutoTastingDraftPersistence} from './useAutoTastingDraftPersistence'
import {useAutoTastingImages} from './useAutoTastingImages'
import styles from './gameCreate.module.scss'

export default function AutomaticModeContainer({onBack, userId, initialAiScanCredits}) {
  const router = useRouter()
  const t = useT('gameCreate')
  const {lang} = useLanguage()
  const supabase = useMemo(() => createClient(), [])
  const fileInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
    fileName: '',
    phase: '',
    percent: 0,
    overallPercent: 0,
    loadedBytes: 0,
    totalBytes: 0,
  })
  const [deletingImageId, setDeletingImageId] = useState('')
  const [analyzingImageId, setAnalyzingImageId] = useState('')
  const [verifyingImageId, setVerifyingImageId] = useState('')
  const [webSearchingImageId, setWebSearchingImageId] = useState('')
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false)
  const [currentAnalyzeBatchCount, setCurrentAnalyzeBatchCount] = useState(0)
  const [currentAnalyzeBatchIndex, setCurrentAnalyzeBatchIndex] = useState(0)
  const [currentAnalyzeBatchTotal, setCurrentAnalyzeBatchTotal] = useState(0)
  const [lastAnalyzedBottleName, setLastAnalyzedBottleName] = useState('')
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false)
  const [webSearchReview, setWebSearchReview] = useState(null)
  const [lastWebSearchReview, setLastWebSearchReview] = useState(null)
  const [isApplyingWebDiff, setIsApplyingWebDiff] = useState(false)
  const [, setWebPreviewUsageByImageId] = useState({})
  const [quizTemplateMode, setQuizTemplateMode] = useState('openai')
  const [generatedQuizSignature, setGeneratedQuizSignature] = useState('')
  const [autoStep, setAutoStep] = useState(1)
  const [selectedBottleId, setSelectedBottleId] = useState('')
  const [detailEditMode, setDetailEditMode] = useState(false)
  const [detailDraft, setDetailDraft] = useState(null)
  const [isSavingDetail, setIsSavingDetail] = useState(false)
  const [toast, setToast] = useState(null)
  const [aiScanCredits, setAiScanCredits] = useState(() =>
    normalizeAiScanCredits(initialAiScanCredits || {}),
  )
  const [displayedAiCredits, setDisplayedAiCredits] = useState(
    () => normalizeAiScanCredits(initialAiScanCredits || {}).remaining,
  )
  const [isCreditsSpendAnimating, setIsCreditsSpendAnimating] = useState(false)
  const [isCreditsInfoOpen, setIsCreditsInfoOpen] = useState(false)
  const creditsAnimationTimeoutRef = useRef(null)
  const creditsAnimationIntervalRef = useRef(null)

  const formatWebDiffValue = useCallback(
    (field, value, rowLike) => {
      if (value == null || value === '') return '—'
      if (field === 'country') return localizeCountryLabel(value, lang) || String(value)
      if (field === 'region' || field === 'quiz_region')
        return localizeRegionLabel(value, lang) || String(value)
      if (field === 'appellation' || field === 'quiz_appellation')
        return localizeAppellationLabel(value, lang) || String(value)
      if (field === 'type') return mapWineTypeLabel(value, lang) || String(value)
      if (field === 'body') return normalizeBodyForQuiz(value, lang) || String(value)
      if (field === 'acidity') return normalizeAcidityForQuiz(value, lang) || String(value)
      if (field === 'harmony' || field === 'harmonize')
        return normalizeHarmonyForQuiz(value, lang) || String(value)
      if (field === 'grapes') return Array.isArray(value) ? value.join(', ') : String(value)
      if (field === 'price' || field === 'average_price') {
        const currency = rowLike?.recognized_payload?.catalog_details?.currency || ''
        return `${value}${currency ? ` ${currency}` : ' EUR'}`
      }
      if (field === 'price_min' || field === 'price_max') {
        const currency = rowLike?.recognized_payload?.catalog_details?.currency || ''
        return `${value}${currency ? ` ${currency}` : ' EUR'}`
      }
      return String(value)
    },
    [lang],
  )

  const buildWebSearchDiffs = useCallback(
    (currentRow, proposedRow) => {
      const currentDetails = currentRow?.recognized_payload?.catalog_details || {}
      const proposedDetails = proposedRow?.recognized_payload?.catalog_details || {}
      const fields = [
        {
          key: 'name',
          label: t('automaticDiffNameLabel'),
          current: currentRow?.recognized_name,
          proposed: proposedRow?.recognized_name,
        },
        {
          key: 'producer',
          label: t('automaticDiffProducerLabel'),
          current: currentRow?.recognized_producer,
          proposed: proposedRow?.recognized_producer,
        },
        {
          key: 'vintage',
          label: t('automaticDiffVintageLabel'),
          current: currentRow?.recognized_vintage,
          proposed: proposedRow?.recognized_vintage,
        },
        {
          key: 'country',
          label: t('automaticQuestionCountry'),
          current: currentDetails.country,
          proposed: proposedDetails.country,
        },
        {
          key: 'region',
          label: t('automaticQuestionRegion'),
          current: currentDetails.region || currentDetails.quiz_region,
          proposed: proposedDetails.region || proposedDetails.quiz_region,
        },
        {
          key: 'appellation',
          label: t('automaticDiffAppellationLabel'),
          current: currentDetails.appellation || currentDetails.quiz_appellation,
          proposed: proposedDetails.appellation || proposedDetails.quiz_appellation,
        },
        {
          key: 'type',
          label: t('automaticDiffTypeLabel'),
          current: currentDetails.type,
          proposed: proposedDetails.type,
        },
        {
          key: 'grapes',
          label: t('automaticQuestionGrape'),
          current: currentDetails.grapes,
          proposed: proposedDetails.grapes,
        },
        {
          key: 'price_min',
          label: t('automaticDiffPriceMinLabel'),
          current: currentDetails.price_min,
          proposed: proposedDetails.price_min,
        },
        {
          key: 'price_max',
          label: t('automaticDiffPriceMaxLabel'),
          current: currentDetails.price_max,
          proposed: proposedDetails.price_max,
        },
        {
          key: 'average_price',
          label: t('automaticMediumPriceLabel'),
          current: currentDetails.average_price ?? currentDetails.price,
          proposed: proposedDetails.average_price ?? proposedDetails.price,
        },
        {
          key: 'body',
          label: t('automaticQuestionBody'),
          current: currentDetails.body,
          proposed: proposedDetails.body,
        },
        {
          key: 'acidity',
          label: t('automaticQuestionAcidity'),
          current: currentDetails.acidity,
          proposed: proposedDetails.acidity,
        },
        {
          key: 'harmonize',
          label: t('automaticQuestionHarmony'),
          current: currentDetails.harmonize || currentDetails.harmony,
          proposed: proposedDetails.harmonize || proposedDetails.harmony,
        },
        {
          key: 'why_notable',
          label: t('automaticQuestionNotable'),
          current: currentDetails.why_notable,
          proposed: proposedDetails.why_notable,
        },
        {
          key: 'short_description',
          label: t('automaticWebSummaryLabel'),
          current: currentDetails.short_description,
          proposed: proposedDetails.short_description,
        },
      ]

      return fields
        .filter((field) => !valuesEqualForDiff(field.current, field.proposed))
        .map((field) => ({
          ...field,
          currentDisplay: formatWebDiffValue(field.key, field.current, currentRow),
          proposedDisplay: formatWebDiffValue(field.key, field.proposed, proposedRow),
        }))
    },
    [formatWebDiffValue, t],
  )

  const localizedTemplateOptions = useMemo(
    () => ({
      country: TEMPLATE_QUESTION_OPTIONS.country.map((value) => localizeCountryLabel(value, lang)),
      region: TEMPLATE_QUESTION_OPTIONS.region.map((value) => localizeRegionLabel(value, lang)),
      grape: TEMPLATE_QUESTION_OPTIONS.grape,
      vintage: TEMPLATE_QUESTION_OPTIONS.vintage.map((value) => String(value)),
      rating: TEMPLATE_QUESTION_OPTIONS.rating,
      price: TEMPLATE_QUESTION_OPTIONS.price,
      body: OPENAI_TEMPLATE_OPTION_KEYS.body.map((value) => localizeBodyLabel(value, lang)),
      acidity: OPENAI_TEMPLATE_OPTION_KEYS.acidity.map((value) =>
        localizeAcidityLabel(value, lang),
      ),
      harmony: OPENAI_TEMPLATE_OPTION_KEYS.harmony.map((value) =>
        localizeHarmonyLabel(value, lang),
      ),
    }),
    [lang],
  )

  const mergeImageRowWithPreview = useCallback((row, fallbackRow = null) => {
    return row?.clientPreviewUrl || fallbackRow?.clientPreviewUrl
      ? {
          ...fallbackRow,
          ...row,
          clientPreviewUrl: row?.clientPreviewUrl || fallbackRow?.clientPreviewUrl || null,
        }
      : {...fallbackRow, ...row}
  }, [])

  const {clearSessionIds, persistSessionIds, sessionImageIds, sessionImageIdsRef, setSessionImageIds} =
    useAutoTastingDraftPersistence({
      userId,
      autoStep,
      setAutoStep,
      quizTemplateMode,
      setQuizTemplateMode,
      generatedQuizSignature,
      setGeneratedQuizSignature,
    })

  function uploadFileWithProgress(formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/auto-tasting/upload')
      xhr.timeout = 90000

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100))
        onProgress({percent, loaded: event.loaded, total: event.total})
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

  const {
    failedPreviewIds,
    handlePreviewImageError,
    loadUploadedImages,
    markPreviewError,
    markPreviewLoaded,
    previewLoadProgress,
    removePreviewArtifacts,
    setFailedPreviewIds,
    setPreviewForImage,
    setUploadError,
    setUploadedImages,
    uploadError,
    uploadedImages,
  } = useAutoTastingImages({
    mergeImageRowWithPreview,
    sessionImageIdsRef,
    supabase,
    t,
    userId,
  })

  useEffect(() => {
    if (!userId) return

    loadUploadedImages()
  }, [loadUploadedImages, sessionImageIds, userId])

  useEffect(() => {
    if (!uploadError) return
    setToast({
      message: uploadError,
      tone: 'error',
      duration: 4200,
    })
  }, [uploadError])

  const pendingAnalyzeImages = useMemo(
    () =>
      uploadedImages.filter((image) => ['processing', 'uploaded', 'failed'].includes(image.status)),
    [uploadedImages],
  )

  const pendingAnalyzeCount = useMemo(() => pendingAnalyzeImages.length, [pendingAnalyzeImages])

  const canAnalyzeSingle = aiScanCredits.remaining >= 1
  const canAnalyzeAll = pendingAnalyzeCount > 0 && aiScanCredits.remaining >= pendingAnalyzeCount
  const canRunWebSearch = aiScanCredits.remaining >= 1

  const webSearchLoadingMessages = useMemo(
    () => [
      t('automaticWebSearchingAction'),
      t('automaticWebSearchLoadingStepPrice'),
      t('automaticWebSearchLoadingStepNotes'),
      t('automaticWebSearchLoadingStepSources'),
    ],
    [t],
  )
  const analyzeLoadingMessages = useMemo(
    () => [
      t('automaticAnalyzeLoadingStepLabel'),
      t('automaticAnalyzeLoadingStepName'),
      t('automaticAnalyzeLoadingStepWine'),
      t('automaticAnalyzeSpeedHint'),
      t('automaticAnalyzeLoadingStepDetails'),
    ],
    [t],
  )
  const analyzeCelebratePrefixes = useMemo(
    () => [
      t('automaticAnalyzeCelebrateEureka'),
      t('automaticAnalyzeCelebrateYuppi'),
      t('automaticAnalyzeCelebrateOle'),
      t('automaticAnalyzeCelebrateCiSiamo'),
    ],
    [t],
  )
  const [webSearchLoadingStep, setWebSearchLoadingStep] = useState(0)
  const [analyzeLoadingStep, setAnalyzeLoadingStep] = useState(0)
  const isAnalyzeOverlayVisible = isAnalyzingAll || !!analyzingImageId
  const currentAnalyzeStepLabel = analyzeLoadingMessages[analyzeLoadingStep]

  useEffect(() => {
    if (!webSearchingImageId) {
      setWebSearchLoadingStep(0)
      return undefined
    }

    const intervalId = setInterval(() => {
      setWebSearchLoadingStep((prev) => (prev + 1) % webSearchLoadingMessages.length)
    }, 1100)

    return () => clearInterval(intervalId)
  }, [webSearchLoadingMessages.length, webSearchingImageId])

  useEffect(() => {
    if (!isAnalyzeOverlayVisible) {
      setAnalyzeLoadingStep(0)
      return undefined
    }

    const intervalId = setInterval(() => {
      setAnalyzeLoadingStep((prev) => (prev + 1) % analyzeLoadingMessages.length)
    }, 1400)

    return () => clearInterval(intervalId)
  }, [analyzeLoadingMessages.length, isAnalyzeOverlayVisible])

  useEffect(() => {
    return () => {
      if (creditsAnimationTimeoutRef.current) {
        clearTimeout(creditsAnimationTimeoutRef.current)
      }
      if (creditsAnimationIntervalRef.current) {
        clearInterval(creditsAnimationIntervalRef.current)
      }
    }
  }, [])

  const animateCreditsSpend = useCallback((fromRemaining, toRemaining) => {
    const startValue = Number(fromRemaining)
    const endValue = Number(toRemaining)

    if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || endValue >= startValue) {
      setDisplayedAiCredits(toRemaining)
      setIsCreditsSpendAnimating(false)
      return
    }

    if (creditsAnimationTimeoutRef.current) {
      clearTimeout(creditsAnimationTimeoutRef.current)
    }
    if (creditsAnimationIntervalRef.current) {
      clearInterval(creditsAnimationIntervalRef.current)
    }

    setDisplayedAiCredits(String(startValue))
    setIsCreditsSpendAnimating(false)

    creditsAnimationTimeoutRef.current = window.setTimeout(() => {
      setIsCreditsSpendAnimating(true)
      let currentValue = startValue

      creditsAnimationIntervalRef.current = window.setInterval(() => {
        currentValue -= 1
        setDisplayedAiCredits(String(Math.max(endValue, currentValue)))

        if (currentValue <= endValue) {
          if (creditsAnimationIntervalRef.current) {
            clearInterval(creditsAnimationIntervalRef.current)
            creditsAnimationIntervalRef.current = null
          }
          window.setTimeout(() => setIsCreditsSpendAnimating(false), 280)
        }
      }, 220)
    }, 2300)
  }, [])

  useEffect(() => {
    if (isCreditsSpendAnimating) return
    setDisplayedAiCredits(aiScanCredits.remaining)
  }, [aiScanCredits.remaining, isCreditsSpendAnimating])

  useEffect(() => {
    if (!userId) return undefined

    function refreshImages() {
      if (document.visibilityState === 'hidden') return
      loadUploadedImages().catch(() => null)
    }

    window.addEventListener('focus', refreshImages)
    document.addEventListener('visibilitychange', refreshImages)

    return () => {
      window.removeEventListener('focus', refreshImages)
      document.removeEventListener('visibilitychange', refreshImages)
    }
  }, [loadUploadedImages, userId])

  const automaticSteps = useMemo(
    () => [
      {id: 1, label: t('automaticStepPhotosLabel')},
      {id: 2, label: t('automaticStepReviewLabel')},
      {id: 3, label: t('automaticStepQuizLabel')},
    ],
    [t],
  )

  const creditsConfettiPieces = useMemo(
    () =>
      Array.from({length: 16}, (_, index) => ({
        id: `credit-confetti-${index}`,
        x: `${(index - 7.5) * 7}px`,
        delay: `${index * 18}ms`,
        rotation: `${(index % 2 === 0 ? -1 : 1) * (14 + index * 6)}deg`,
      })),
    [],
  )

  const topBarCredits = useMemo(
    () => (
      <button
        type="button"
        className={`${styles.autoTopBarCredits} ${isCreditsSpendAnimating ? styles.autoTopBarCreditsAnimating : ''}`}
        onClick={() => setIsCreditsInfoOpen(true)}
        aria-label={t('automaticCreditsInfoAction')}>
        {isCreditsSpendAnimating ? (
          <>
            <span className={styles.autoTopBarCreditsSweep} aria-hidden="true" />
            <span className={styles.autoTopBarCreditsGlow} aria-hidden="true" />
            <span className={styles.autoTopBarCreditsConfetti} aria-hidden="true">
              {creditsConfettiPieces.map((piece) => (
                <span
                  key={piece.id}
                  className={styles.autoTopBarCreditsConfettiPiece}
                  style={{
                    '--credit-confetti-x': piece.x,
                    '--credit-confetti-delay': piece.delay,
                    '--credit-confetti-rotation': piece.rotation,
                  }}
                />
              ))}
            </span>
          </>
        ) : null}
        <Icon src="/icons/token.svg" size={16} />
        <span>{displayedAiCredits}</span>
      </button>
    ),
    [creditsConfettiPieces, displayedAiCredits, isCreditsSpendAnimating, t],
  )

  const getBottleCoreData = useCallback(
    (image) => {
      const details = image?.recognized_payload?.catalog_details || {}
      const grapes = Array.isArray(details.grapes) ? details.grapes.filter(Boolean) : []
      const inferredRegion = inferRegion(details, image)
      const region = details.quiz_region || inferredRegion || details.region || ''
      const appellation = details.quiz_appellation || details.appellation || ''
      const wineType = mapWineTypeLabel(details.type, lang) || ''
      const priceBand = details.quiz_price_band || details.price_band || ''
      const averagePrice =
        resolveRepresentativePrice(
          details.average_price ?? details.price ?? null,
          details.price_min ?? null,
          details.price_max ?? null,
        ) ?? ''
      const priceRange =
        details.price_min != null && details.price_max != null
          ? `${details.price_min}-${details.price_max}${details.currency ? ` ${details.currency}` : ''}`
          : averagePrice
            ? `${averagePrice}${details.currency ? ` ${details.currency}` : ''}`
            : ''

      return {
        details,
        grapes,
        region,
        appellation,
        wineType,
        priceBand,
        averagePrice,
        priceRange,
      }
    },
    [lang],
  )

  const getBottleCompletionMeta = useCallback(
    (image) => {
      const {details, grapes, region, wineType} = getBottleCoreData(image)
      const requiredChecks = [
        image?.recognized_name,
        image?.recognized_producer,
        image?.recognized_vintage,
        details.country,
        region,
        wineType,
        grapes[0],
      ]
      const totalFields = requiredChecks.length
      const missingCount = requiredChecks.filter((value) => !String(value || '').trim()).length
      const completedCount = totalFields - missingCount
      const percent = Math.max(0, Math.min(100, Math.round((completedCount / totalFields) * 100)))
      return {
        isComplete: missingCount === 0,
        missingCount,
        completedCount,
        totalFields,
        percent,
      }
    },
    [getBottleCoreData],
  )

  const getBottleDisplayName = useCallback(
    (image, index = 0) => {
      const recognizedName = String(image?.recognized_name || '').trim()
      if (recognizedName) return recognizedName

      const originalFilename = String(image?.original_filename || '').trim()
      if (originalFilename && !isGenericBottleFilename(originalFilename)) {
        return originalFilename
      }

      return t('automaticBottleFallbackName', {index: String(index + 1)})
    },
    [t],
  )
  const analyzeCelebratePrefix =
    analyzeCelebratePrefixes[
      Math.max(0, ((currentAnalyzeBatchIndex || 1) - 1) % analyzeCelebratePrefixes.length)
    ]

  const reanalyzableImages = useMemo(
    () =>
      uploadedImages.filter((image) => {
        if (!image?.id) return false
        if (['processing', 'uploaded', 'failed'].includes(image.status)) return true
        if (image.status !== 'recognized') return false
        return !getBottleCompletionMeta(image).isComplete
      }),
    [getBottleCompletionMeta, uploadedImages],
  )
  const reanalyzableImageIds = useMemo(
    () => reanalyzableImages.map((image) => image.id).filter(Boolean),
    [reanalyzableImages],
  )
  const reanalyzableCount = reanalyzableImageIds.length
  const canReanalyzeAll = reanalyzableCount > 0 && aiScanCredits.remaining >= reanalyzableCount

  const recognizedBottleCount = useMemo(
    () => uploadedImages.filter((image) => image.status === 'recognized').length,
    [uploadedImages],
  )

  const selectedBottle = useMemo(
    () => uploadedImages.find((image) => image.id === selectedBottleId) || null,
    [selectedBottleId, uploadedImages],
  )
  const selectedBottleIndex = useMemo(
    () => uploadedImages.findIndex((image) => image.id === selectedBottleId),
    [selectedBottleId, uploadedImages],
  )

  const syncDetailDraftFromImage = useCallback(
    (image) => {
      if (!image) {
        setDetailDraft(null)
        return
      }
      const {details, grapes} = getBottleCoreData(image)
      setDetailDraft({
        recognized_name: image.recognized_name || '',
        recognized_producer: image.recognized_producer || '',
        recognized_vintage: image.recognized_vintage ? String(image.recognized_vintage) : '',
        country: details.country || '',
        region: details.quiz_region || details.region || '',
        appellation: details.quiz_appellation || details.appellation || '',
        type: details.type || '',
        grapes: grapes.join(', '),
        average_price:
          details.average_price != null || details.price != null
            ? String(details.average_price ?? details.price)
            : '',
        price_min: details.price_min != null ? String(details.price_min) : '',
        price_max: details.price_max != null ? String(details.price_max) : '',
        currency: details.currency || '',
        body: details.body || '',
        acidity: details.acidity || '',
        harmony: details.harmony || details.harmonize || '',
        why_notable: details.why_notable || '',
        short_description: details.short_description || '',
      })
    },
    [getBottleCoreData],
  )

  const handleOpenBottleDetail = useCallback(
    (image) => {
      if (!image?.id) return
      setSelectedBottleId(image.id)
      setDetailEditMode(false)
      syncDetailDraftFromImage(image)
      setAutoStep(2)
    },
    [syncDetailDraftFromImage],
  )

  const handleCloseBottleDetail = useCallback(() => {
    setSelectedBottleId('')
    setDetailEditMode(false)
    setDetailDraft(null)
  }, [])
  const {
    handleAnalyzeAll,
    handleAnalyzeImage,
    handleApplyWebSearchDiff,
    handleAttemptExit,
    handleDeleteImage,
    handleDetailDraftChange,
    handleFilesUpload,
    handleSaveBottleDetail,
    handleVerifyImage,
    handleWebSearchImage,
  } = useAutoTastingActions({
    aiScanCredits,
    analyzingImageId,
    animateCreditsSpend,
    buildWebSearchDiffs,
    canAnalyzeSingle,
    canRunWebSearch,
    clearSessionIds,
    deletingImageId,
    detailDraft,
    getBottleDisplayName,
    isAnalyzingAll,
    isApplyingWebDiff,
    isSavingDetail,
    loadUploadedImages,
    mergeImageRowWithPreview,
    onBack,
    pendingAnalyzeImages,
    persistSessionIds,
    removePreviewArtifacts,
    selectedBottle,
    sessionImageIdsRef,
    setAiScanCredits,
    setAnalyzingImageId,
    setAutoStep,
    setCurrentAnalyzeBatchCount,
    setCurrentAnalyzeBatchIndex,
    setCurrentAnalyzeBatchTotal,
    setDeletingImageId,
    setDetailDraft,
    setDetailEditMode,
    setFailedPreviewIds,
    setIsAnalyzingAll,
    setIsApplyingWebDiff,
    setIsSavingDetail,
    setIsUploading,
    setLastAnalyzedBottleName,
    setLastWebSearchReview,
    setPreviewForImage,
    setSessionImageIds,
    setSelectedBottleId,
    setToast,
    setUploadError,
    setUploadedImages,
    setUploadProgress,
    setVerifyingImageId,
    setWebPreviewUsageByImageId,
    setWebSearchReview,
    setWebSearchingImageId,
    syncDetailDraftFromImage,
    t,
    uploadedImages,
    userId,
    verifyingImageId,
    webSearchReview,
    webSearchingImageId,
  })

  async function handleCreateQuickQuiz() {
    if (isCreatingQuiz || isUploading || isAnalyzingAll || analyzingImageId || deletingImageId)
      return
    setIsCreatingQuiz(true)
    setUploadError('')
    try {
      const payload = buildAutoQuizPayload({
        images: uploadedImages,
        lang,
        localizedTemplateOptions,
        mode: quizTemplateMode,
        t,
      })
      const response = await fetch('/api/game/save', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.id) {
        throw new Error(result?.error || 'save failed')
      }
      clearSessionIds()
      router.push(`/game/${result.id}`)
    } catch (error) {
      setUploadError(`${t('automaticCreateQuizError')} (${error?.message || 'unknown'})`)
    } finally {
      setIsCreatingQuiz(false)
    }
  }

  let quizPreview = null
  try {
    quizPreview = buildAutoQuizPayload({
      images: uploadedImages,
      lang,
      localizedTemplateOptions,
      mode: quizTemplateMode,
      t,
    })
  } catch {
    quizPreview = null
  }

  const currentQuizSignature = useMemo(() => {
    if (!quizPreview) return ''
    return JSON.stringify({
      template: quizTemplateMode,
      questions: quizPreview.questions,
      bottles: quizPreview.bottles,
    })
  }, [quizPreview, quizTemplateMode])

  const hasGeneratedQuiz = generatedQuizSignature.length > 0
  const isQuizOutdated =
    !!currentQuizSignature && hasGeneratedQuiz && generatedQuizSignature !== currentQuizSignature
  const step2Ready = uploadedImages.length > 0
  const detailCore = selectedBottle ? getBottleCoreData(selectedBottle) : null
  const detailCompletion = selectedBottle ? getBottleCompletionMeta(selectedBottle) : null

  useEffect(() => {
    if (!selectedBottle || detailEditMode) return
    syncDetailDraftFromImage(selectedBottle)
  }, [detailEditMode, selectedBottle, syncDetailDraftFromImage])

  useEffect(() => {
    scrollPageTop()
  }, [autoStep, selectedBottleId])

  const automaticPageTitle = selectedBottle
    ? getBottleDisplayName(selectedBottle, selectedBottleIndex >= 0 ? selectedBottleIndex : 0)
    : t('title')

  const handleTopBack = useCallback(() => {
    if (selectedBottleId) {
      handleCloseBottleDetail()
      return
    }
    if (autoStep === 3) {
      setAutoStep(2)
      return
    }
    if (autoStep === 2) {
      setAutoStep(1)
      return
    }
    handleAttemptExit()
  }, [autoStep, handleAttemptExit, handleCloseBottleDetail, selectedBottleId])

  const shellTopBar = useMemo(
    () => ({
      title: automaticPageTitle,
      onBack: handleTopBack,
      actions: topBarCredits,
    }),
    [automaticPageTitle, handleTopBack, topBarCredits],
  )

  useAppShellTopBar(shellTopBar)

  function handleStepClick(nextStep) {
    if (selectedBottleId) {
      handleCloseBottleDetail()
    }
    if (nextStep === 1) {
      setAutoStep(1)
      return
    }
    if (nextStep === 2 && step2Ready) {
      setAutoStep(2)
      return
    }
  }

  function handleProceedToQuestionnaire() {
    if (!quizPreview || !currentQuizSignature) return
    if (!hasGeneratedQuiz || isQuizOutdated) {
      setGeneratedQuizSignature(currentQuizSignature)
    }
    setAutoStep(3)
  }

  function handleSyncGeneratedQuiz() {
    if (!quizPreview || !currentQuizSignature) return
    setGeneratedQuizSignature(currentQuizSignature)
  }

  return (
    <PageLayout>
      <AutoToast toast={toast} onClose={() => setToast(null)} closeLabel={t('close')} />
      <InfoModal
        isOpen={isCreditsInfoOpen}
        onClose={() => setIsCreditsInfoOpen(false)}
        title={t('automaticCreditsInfoTitle')}>
        <p>{t('automaticCreditsInfoBody')}</p>
        <p className={styles.autoCreditsInfoRemaining}>
          {t('automaticCreditsInfoRemaining', {count: String(aiScanCredits.remaining)})}
        </p>
        <ul className={styles.autoCreditsInfoList}>
          <li>{t('automaticCreditsInfoAnalyze')}</li>
          <li>{t('automaticCreditsInfoWeb')}</li>
        </ul>
      </InfoModal>

      {webSearchingImageId ? (
        <div className={styles.autoPageWebSearchOverlay}>
          <div className={styles.autoBottleWebSearchPanel}>
            <div className={styles.autoBottleWebSearchTitleWrap}>
              <div className={styles.autoBottleWebSearchSpinner} aria-hidden="true" />
              <strong>{webSearchLoadingMessages[webSearchLoadingStep]}</strong>
            </div>
            <div className={styles.autoBottleWebSearchCopy}>
              <span>{t('automaticWebSearchPanelHint')}</span>
            </div>
          </div>
        </div>
      ) : null}

      {isAnalyzingAll || analyzingImageId ? (
        <AutoAnalyzeOverlay
          analyzeCelebratePrefix={analyzeCelebratePrefix}
          currentAnalyzeBatchCount={currentAnalyzeBatchCount}
          currentAnalyzeBatchIndex={currentAnalyzeBatchIndex}
          currentAnalyzeBatchTotal={currentAnalyzeBatchTotal}
          currentAnalyzeStepLabel={currentAnalyzeStepLabel}
          lastAnalyzedBottleName={lastAnalyzedBottleName}
          pendingAnalyzeCount={pendingAnalyzeCount}
          t={t}
        />
      ) : null}

      <main className={styles.autoModePage}>
        {!selectedBottleId ? (
          <GameStepsBreadcrumbs
            steps={automaticSteps}
            currentStep={autoStep}
            onStepClick={handleStepClick}
            isStep2Completed={false}
            isStep3Completed={false}
          />
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className={styles.autoModeFileInput}
          onChange={(event) => handleFilesUpload(event.target.files, fileInputRef)}
        />

        {autoStep === 1 ? (
          <AutomaticStepPhotos
            analyzingImageId={analyzingImageId}
            deletingImageId={deletingImageId}
            failedPreviewIds={failedPreviewIds}
            fileInputRef={fileInputRef}
            formatBytes={formatBytes}
            getBottleCompletionMeta={getBottleCompletionMeta}
            handleDeleteImage={handleDeleteImage}
            handleFilesUpload={handleFilesUpload}
            handlePreviewImageError={handlePreviewImageError}
            isAnalyzingAll={isAnalyzingAll}
            isUploading={isUploading}
            markPreviewError={markPreviewError}
            markPreviewLoaded={markPreviewLoaded}
            previewLoadProgress={previewLoadProgress}
            t={t}
            uploadProgress={uploadProgress}
            uploadedImages={uploadedImages}
          />
        ) : null}

        {autoStep === 2 && !selectedBottle ? (
          <AutomaticStepReviewList
            failedPreviewIds={failedPreviewIds}
            getBottleCompletionMeta={getBottleCompletionMeta}
            getBottleCoreData={getBottleCoreData}
            getBottleDisplayName={getBottleDisplayName}
            handleOpenBottleDetail={handleOpenBottleDetail}
            handlePreviewImageError={handlePreviewImageError}
            markPreviewError={markPreviewError}
            setAutoStep={setAutoStep}
            t={t}
            uploadedImages={uploadedImages}
          />
        ) : null}

        {autoStep === 2 && selectedBottle ? (
          <AutomaticBottleDetail
            analyzingImageId={analyzingImageId}
            canAnalyzeSingle={canAnalyzeSingle}
            canRunWebSearch={canRunWebSearch}
            deletingImageId={deletingImageId}
            detailCompletion={detailCompletion}
            detailCore={detailCore}
            detailDraft={detailDraft}
            detailEditMode={detailEditMode}
            getBottleDisplayName={getBottleDisplayName}
            handleAnalyzeImage={handleAnalyzeImage}
            handleCloseBottleDetail={handleCloseBottleDetail}
            handleDetailDraftChange={handleDetailDraftChange}
            handleSaveBottleDetail={handleSaveBottleDetail}
            handleVerifyImage={handleVerifyImage}
            handleWebSearchImage={handleWebSearchImage}
            isAnalyzingAll={isAnalyzingAll}
            isSavingDetail={isSavingDetail}
            lang={lang}
            lastWebSearchReview={lastWebSearchReview}
            localizeNarrativeText={localizeNarrativeText}
            normalizeAcidityForQuiz={normalizeAcidityForQuiz}
            normalizeBodyForQuiz={normalizeBodyForQuiz}
            normalizeHarmonyForQuiz={normalizeHarmonyForQuiz}
            normalizePriceAnswer={normalizePriceAnswer}
            representativePrice={null}
            resolveRepresentativePrice={resolveRepresentativePrice}
            selectedBottle={selectedBottle}
            selectedBottleIndex={selectedBottleIndex}
            setDetailEditMode={setDetailEditMode}
            setToast={setToast}
            setWebSearchReview={setWebSearchReview}
            syncDetailDraftFromImage={syncDetailDraftFromImage}
            t={t}
            verifyingImageId={verifyingImageId}
            webSearchingImageId={webSearchingImageId}
            webSearchReview={webSearchReview}
          />
        ) : null}
        {autoStep === 3 ? (
          <AutomaticStepQuizPreview
            quizPreview={quizPreview}
            quizTemplateMode={quizTemplateMode}
            setQuizTemplateMode={setQuizTemplateMode}
            t={t}
          />
        ) : null}

        <AutoWebDiffSheet
          handleApplyWebSearchDiff={handleApplyWebSearchDiff}
          isApplyingWebDiff={isApplyingWebDiff}
          setLastWebSearchReview={setLastWebSearchReview}
          setWebSearchReview={setWebSearchReview}
          t={t}
          webSearchReview={webSearchReview}
        />
      </main>

      {autoStep === 1 && uploadedImages.length > 0 ? (
        <div className={styles.autoStepFixedRow}>
          <button
            type="button"
            className="btn success"
            disabled={
              pendingAnalyzeCount > 0
                ? !canAnalyzeAll || isUploading || !!analyzingImageId || isAnalyzingAll
                : reanalyzableCount > 0
                  ? !canReanalyzeAll || isUploading || !!analyzingImageId || isAnalyzingAll
                  : false
            }
            onClick={
              pendingAnalyzeCount > 0
                ? () => handleAnalyzeAll()
                : reanalyzableCount > 0
                  ? () => handleAnalyzeAll(reanalyzableImageIds)
                  : () => setAutoStep(2)
            }>
            {isAnalyzingAll
              ? t('automaticAnalyzingAll')
              : pendingAnalyzeCount > 0
                ? t('automaticAnalyzeActionWithCount', {count: String(pendingAnalyzeCount)})
                : reanalyzableCount > 0
                  ? t('automaticAnalyzeAgainAction')
                  : t('continue')}
          </button>
        </div>
      ) : null}

      {autoStep === 2 && !selectedBottle ? (
        <div className={styles.autoStepFixedRow}>
          <button
            type="button"
            className="btn success"
            disabled={!quizPreview || isCreatingQuiz || recognizedBottleCount === 0}
            onClick={handleProceedToQuestionnaire}>
            {hasGeneratedQuiz && isQuizOutdated
              ? t('automaticRegenerateQuestionnaireAction')
              : t('automaticCreateQuestionnaireAction')}
          </button>
        </div>
      ) : null}

      {autoStep === 3 ? (
        <div className={styles.autoStepFixedRow}>
          <button
            type="button"
            className="btn success"
            disabled={isCreatingQuiz || !quizPreview}
            onClick={isQuizOutdated ? handleSyncGeneratedQuiz : handleCreateQuickQuiz}>
            {isQuizOutdated
              ? t('automaticRegenerateQuestionnaireAction')
              : isCreatingQuiz
                ? t('automaticCreatingQuiz')
                : t('automaticSaveAction')}
          </button>
        </div>
      ) : null}
    </PageLayout>
  )
}
