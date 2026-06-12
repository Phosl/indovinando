'use client'

import {useCallback} from 'react'
import {normalizeAiScanCredits} from '@/lib/aiScanCredits'
import {
  optimizeAutoTastingUploadFile,
  postJsonWithRetry,
  uniqueIds,
} from './autoTastingHelpers'

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

export function useAutoTastingActions({
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
  pendingAnalyzeImages,
  uploadedImages,
  userId,
  verifyingImageId,
  webSearchReview,
  webSearchingImageId,
}) {
  const handleFilesUpload = useCallback(
    async (fileList, fileInputRef) => {
      if (!userId || !fileList?.length) return

      setIsUploading(true)
      setUploadProgress({
        current: 0,
        total: 0,
        fileName: '',
        phase: '',
        percent: 0,
        overallPercent: 0,
        loadedBytes: 0,
        totalBytes: 0,
      })
      setUploadError('')
      try {
        const files = Array.from(fileList)
        const totalBytes = Math.max(
          1,
          files.reduce((sum, item) => sum + Math.max(1, Number(item.size) || 1), 0),
        )
        let uploadedBytes = 0

        setUploadProgress({
          current: 0,
          total: files.length,
          fileName: '',
          phase: '',
          percent: 0,
          overallPercent: 0,
          loadedBytes: 0,
          totalBytes,
        })
        const createdRows = []

        for (let index = 0; index < files.length; index += 1) {
          const file = files[index]
          const uploadFile = await optimizeAutoTastingUploadFile(file)
          setUploadProgress({
            current: index + 1,
            total: files.length,
            fileName: file.name,
            phase: t('automaticUploadPhaseFile'),
            percent: 0,
            overallPercent: Math.round((uploadedBytes / totalBytes) * 100),
            loadedBytes: uploadedBytes,
            totalBytes,
          })
          const formData = new FormData()
          formData.append('file', uploadFile)
          const currentFileBytes = Math.max(1, Number(file.size) || 1)

          let uploadResponse
          try {
            uploadResponse = await uploadFileWithProgress(formData, ({percent, loaded}) => {
              const loadedBytes = Math.max(0, Math.min(currentFileBytes, Number(loaded) || 0))
              const realLoadedBytes = Math.max(0, Math.min(totalBytes, uploadedBytes + loadedBytes))
              setUploadProgress((prev) => ({
                ...prev,
                percent,
                loadedBytes: realLoadedBytes,
                totalBytes,
                overallPercent: Math.round((realLoadedBytes / totalBytes) * 100),
              }))
            })
          } catch (networkError) {
            setUploadError(`${t('automaticUploadError')} (${networkError?.message || 'network'})`)
            continue
          }

          uploadedBytes += currentFileBytes
          const boundedUploadedBytes = Math.max(0, Math.min(totalBytes, uploadedBytes))

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
            overallPercent: Math.round((boundedUploadedBytes / totalBytes) * 100),
            loadedBytes: boundedUploadedBytes,
            totalBytes,
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
              metadataError = isAbort
                ? 'metadata timeout after 15s'
                : error?.message || 'metadata network'
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

          if (metadataResult?.image) {
            const previewUrl = URL.createObjectURL(uploadFile)
            setPreviewForImage(metadataResult.image.id, previewUrl, file)
            createdRows.push({...metadataResult.image, clientPreviewUrl: previewUrl})
          }
        }

        if (createdRows.length > 0) {
          const createdIds = uniqueIds(createdRows.map((row) => row.id))
          setSessionImageIds((prev) => {
            const next = uniqueIds([...prev, ...createdIds])
            persistSessionIds(next)
            return next
          })
          setUploadedImages((prev) => [...createdRows, ...prev])
        }
      } catch (error) {
        setUploadError(`${t('automaticUploadError')} (${error?.message || 'unknown'})`)
      } finally {
        setIsUploading(false)
        setUploadProgress({
          current: 0,
          total: 0,
          fileName: '',
          phase: '',
          percent: 0,
          overallPercent: 0,
          loadedBytes: 0,
          totalBytes: 0,
        })
        if (fileInputRef?.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [
      persistSessionIds,
      setIsUploading,
      setPreviewForImage,
      setSessionImageIds,
      setUploadError,
      setUploadedImages,
      setUploadProgress,
      t,
      userId,
    ],
  )

  const handleDeleteImage = useCallback(
    async (imageId) => {
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

        await new Promise((resolve) => setTimeout(resolve, 220))

        setUploadedImages((prev) => prev.filter((image) => image.id !== imageId))
        setFailedPreviewIds((prev) => prev.filter((id) => id !== imageId))
        removePreviewArtifacts(imageId)
        setSessionImageIds((prev) => {
          const next = prev.filter((id) => id !== imageId)
          if (next.length > 0) {
            persistSessionIds(next)
          } else {
            clearSessionIds()
          }
          return next
        })
        setToast({
          message: t('automaticDeleteSuccess'),
          tone: 'success',
          duration: 2600,
        })
      } catch (error) {
        setUploadError(`${t('automaticDeleteError')} (${error?.message || 'unknown'})`)
      } finally {
        setDeletingImageId('')
      }
    },
    [
      clearSessionIds,
      deletingImageId,
      persistSessionIds,
      removePreviewArtifacts,
      setDeletingImageId,
      setFailedPreviewIds,
      setSessionImageIds,
      setToast,
      setUploadError,
      setUploadedImages,
      t,
    ],
  )

  const handleAnalyzeImage = useCallback(
    async (imageId) => {
      if (!imageId) return
      if (analyzingImageId || isAnalyzingAll || webSearchingImageId) return
      if (!canAnalyzeSingle) {
        setUploadError(t('automaticCreditsInsufficient'))
        return
      }
      setAnalyzingImageId(imageId)
      setLastAnalyzedBottleName('')
      setUploadError('')
      const previousCreditsRemaining = aiScanCredits.remaining
      setWebPreviewUsageByImageId((prev) => {
        if (!(imageId in prev)) return prev
        const next = {...prev}
        delete next[imageId]
        return next
      })
      try {
        const {response, result} = await postJsonWithRetry(
          '/api/auto-tasting/analyze',
          {imageId, useWebEnrichment: true, forceWebEnrichment: true},
          {timeoutMs: 45000, retries: 3},
        )
        if (!response.ok) {
          if (result?.credits) setAiScanCredits(normalizeAiScanCredits(result.credits))
          if (response.status === 402) {
            setUploadError(t('automaticCreditsInsufficient'))
            return
          }
          setUploadError(`${t('automaticAnalyzeError')} (${result?.error || 'analyze'})`)
          return
        }
        if (result?.credits) {
          const normalizedCredits = normalizeAiScanCredits(result.credits)
          setAiScanCredits(normalizedCredits)
          animateCreditsSpend(previousCreditsRemaining, normalizedCredits.remaining)
        }

        const updatedRows = Array.isArray(result?.updated) ? result.updated : []
        if (updatedRows.length > 0) {
          const map = Object.fromEntries(updatedRows.map((row) => [row.id, row]))
          const updatedCurrentRow =
            updatedRows.find((row) => row.id === imageId) || updatedRows[0] || null
          if (updatedCurrentRow?.recognized_name) {
            const uploadedIndex = uploadedImages.findIndex((image) => image.id === updatedCurrentRow.id)
            setLastAnalyzedBottleName(
              getBottleDisplayName(updatedCurrentRow, uploadedIndex >= 0 ? uploadedIndex : 0),
            )
          }
          setUploadedImages((prev) =>
            prev.map((row) => (map[row.id] ? mergeImageRowWithPreview(map[row.id], row) : row)),
          )
        }
        setAutoStep(2)
        loadUploadedImages().catch(() => null)
      } catch (error) {
        setUploadError(`${t('automaticAnalyzeError')} (${error?.message || 'unknown'})`)
      } finally {
        setAnalyzingImageId('')
        setLastAnalyzedBottleName('')
      }
    },
    [
      aiScanCredits.remaining,
      analyzingImageId,
      animateCreditsSpend,
      canAnalyzeSingle,
      getBottleDisplayName,
      isAnalyzingAll,
      loadUploadedImages,
      mergeImageRowWithPreview,
      setAiScanCredits,
      setAnalyzingImageId,
      setAutoStep,
      setLastAnalyzedBottleName,
      setUploadError,
      setUploadedImages,
      setWebPreviewUsageByImageId,
      t,
      uploadedImages,
      webSearchingImageId,
    ],
  )

  const handleWebSearchImage = useCallback(
    async (imageId) => {
      if (!imageId) return
      if (webSearchingImageId || analyzingImageId || isAnalyzingAll) return
      if (!canRunWebSearch) {
        setUploadError(t('automaticCreditsInsufficient'))
        return
      }
      const currentImage = uploadedImages.find((image) => image.id === imageId) || null
      setWebSearchingImageId(imageId)
      setUploadError('')
      try {
        const {response, result} = await postJsonWithRetry(
          '/api/auto-tasting/analyze',
          {
            imageId,
            useWebEnrichment: true,
            forceWebEnrichment: true,
            webEnrichmentOnly: true,
            previewWebEnrichment: true,
          },
          {timeoutMs: 45000, retries: 2},
        )
        if (!response.ok) {
          if (result?.credits) setAiScanCredits(normalizeAiScanCredits(result.credits))
          if (response.status === 402) {
            setUploadError(t('automaticCreditsInsufficient'))
            return
          }
          setUploadError(`${t('automaticWebSearchError')} (${result?.error || 'web search'})`)
          return
        }
        if (result?.credits) setAiScanCredits(normalizeAiScanCredits(result.credits))

        const previewItems = Array.isArray(result?.preview) ? result.preview : []
        if (previewItems.length > 0) {
          const previewItem = previewItems.find((item) => item.id === imageId) || previewItems[0]
          const proposedRow = previewItem?.proposed || null
          const previewUsage =
            previewItem?.usage || proposedRow?.recognized_payload?.web_enrichment?.usage || null
          setWebPreviewUsageByImageId((prev) => ({...prev, [imageId]: previewUsage}))
          const diffs = buildWebSearchDiffs(currentImage || previewItem?.current || null, proposedRow)

          if (!diffs.length) {
            setUploadError(t('automaticWebSearchNoData'))
            return
          }

          setWebSearchReview({
            imageId,
            proposed: proposedRow,
            diffs,
            selectedFields: diffs.map((diff) => diff.key),
          })
          setLastWebSearchReview({
            imageId,
            proposed: proposedRow,
            diffs,
            selectedFields: diffs.map((diff) => diff.key),
          })
          return
        }

        const updatedRows = Array.isArray(result?.updated) ? result.updated : []
        if (updatedRows.length === 0) {
          setUploadError(t('automaticWebSearchNoData'))
          setWebPreviewUsageByImageId((prev) => {
            if (!(imageId in prev)) return prev
            const next = {...prev}
            delete next[imageId]
            return next
          })
        }
      } catch (error) {
        setUploadError(`${t('automaticWebSearchError')} (${error?.message || 'unknown'})`)
      } finally {
        setWebSearchingImageId('')
      }
    },
    [
      analyzingImageId,
      buildWebSearchDiffs,
      canRunWebSearch,
      isAnalyzingAll,
      setAiScanCredits,
      setLastWebSearchReview,
      setUploadError,
      setWebPreviewUsageByImageId,
      setWebSearchReview,
      setWebSearchingImageId,
      t,
      uploadedImages,
      webSearchingImageId,
    ],
  )

  const handleApplyWebSearchDiff = useCallback(async () => {
    if (!webSearchReview?.imageId || !Array.isArray(webSearchReview?.selectedFields)) return
    if (webSearchReview.selectedFields.length === 0 || isApplyingWebDiff) return

    setIsApplyingWebDiff(true)
    setUploadError('')
    try {
      const response = await fetch('/api/auto-tasting/apply-web-diff', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          imageId: webSearchReview.imageId,
          selectedFields: webSearchReview.selectedFields,
          proposed: webSearchReview.proposed,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.updated) {
        throw new Error(result?.error || 'apply web diff failed')
      }

      setUploadedImages((prev) =>
        prev.map((row) =>
          row.id === result.updated.id ? mergeImageRowWithPreview(result.updated, row) : row,
        ),
      )
      setWebPreviewUsageByImageId((prev) => {
        if (!(result.updated.id in prev)) return prev
        const next = {...prev}
        delete next[result.updated.id]
        return next
      })
      setLastWebSearchReview((prev) => (prev?.imageId === result.updated.id ? null : prev))
      setWebSearchReview(null)
      loadUploadedImages().catch(() => null)
    } catch (error) {
      setUploadError(`${t('automaticWebSearchError')} (${error?.message || 'unknown'})`)
    } finally {
      setIsApplyingWebDiff(false)
    }
  }, [
    isApplyingWebDiff,
    loadUploadedImages,
    mergeImageRowWithPreview,
    setIsApplyingWebDiff,
    setLastWebSearchReview,
    setUploadError,
    setUploadedImages,
    setWebPreviewUsageByImageId,
    setWebSearchReview,
    t,
    webSearchReview,
  ])

  const handleDetailDraftChange = useCallback((field, value) => {
    setDetailDraft((prev) => ({
      ...(prev || {}),
      [field]: value,
    }))
  }, [setDetailDraft])

  const handleSaveBottleDetail = useCallback(async () => {
    if (!selectedBottle || !detailDraft || isSavingDetail) return
    setIsSavingDetail(true)
    setUploadError('')
    try {
      const response = await fetch('/api/auto-tasting/manual-details', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          imageId: selectedBottle.id,
          draft: detailDraft,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.updated) {
        throw new Error(result?.error || 'manual detail update failed')
      }

      setUploadedImages((prev) =>
        prev.map((row) =>
          row.id === result.updated.id ? mergeImageRowWithPreview(result.updated, row) : row,
        ),
      )
      setDetailEditMode(false)
      syncDetailDraftFromImage(result.updated)
      loadUploadedImages().catch(() => null)
    } catch (error) {
      setUploadError(`${t('automaticUpdateDetailsError')} (${error?.message || 'unknown'})`)
    } finally {
      setIsSavingDetail(false)
    }
  }, [
    detailDraft,
    isSavingDetail,
    loadUploadedImages,
    mergeImageRowWithPreview,
    selectedBottle,
    setDetailEditMode,
    setIsSavingDetail,
    setUploadError,
    setUploadedImages,
    syncDetailDraftFromImage,
    t,
  ])

  const handleAnalyzeAll = useCallback(
    async (overrideIds = null) => {
      if (isAnalyzingAll || analyzingImageId || webSearchingImageId) return
      const ids = Array.isArray(overrideIds)
        ? overrideIds.map((id) => String(id || '').trim()).filter(Boolean)
        : pendingAnalyzeImages.map((image) => image.id).filter(Boolean)
      if (!ids.length) return
      const neededCredits = ids.length
      if (aiScanCredits.remaining < neededCredits) {
        setUploadError(
          neededCredits > aiScanCredits.remaining
            ? t('automaticAnalyzeAllCreditsNeeded', {
                needed: String(neededCredits),
                remaining: String(aiScanCredits.remaining),
              })
            : t('automaticCreditsInsufficient'),
        )
        return
      }
      setIsAnalyzingAll(true)
      setCurrentAnalyzeBatchCount(ids.length)
      setCurrentAnalyzeBatchTotal(ids.length)
      setCurrentAnalyzeBatchIndex(1)
      setLastAnalyzedBottleName('')
      setUploadError('')
      const previousCreditsRemaining = aiScanCredits.remaining
      let finalCreditsRemaining = previousCreditsRemaining
      try {
        for (let index = 0; index < ids.length; index += 1) {
          const imageId = ids[index]
          setCurrentAnalyzeBatchIndex(index + 1)
          const {response, result} = await postJsonWithRetry(
            '/api/auto-tasting/analyze',
            {imageId, useWebEnrichment: true, forceWebEnrichment: true},
            {timeoutMs: 45000, retries: 3},
          )
          if (!response.ok) {
            if (result?.credits) setAiScanCredits(normalizeAiScanCredits(result.credits))
            if (response.status === 402) {
              setUploadError(
                t('automaticAnalyzeAllCreditsNeeded', {
                  needed: String(neededCredits),
                  remaining: String(result?.credits?.remaining ?? aiScanCredits.remaining),
                }),
              )
              return
            }
            setUploadError(`${t('automaticAnalyzeError')} (${result?.error || 'analyze'})`)
            return
          }
          if (result?.credits) {
            const normalizedCredits = normalizeAiScanCredits(result.credits)
            setAiScanCredits(normalizedCredits)
            finalCreditsRemaining = normalizedCredits.remaining
          }
          const updatedRows = Array.isArray(result?.updated) ? result.updated : []
          if (updatedRows.length > 0) {
            const map = Object.fromEntries(updatedRows.map((row) => [row.id, row]))
            const updatedCurrentRow =
              updatedRows.find((row) => row.id === imageId) || updatedRows[0] || null
            if (updatedCurrentRow?.recognized_name) {
              const uploadedIndex = uploadedImages.findIndex((image) => image.id === updatedCurrentRow.id)
              setLastAnalyzedBottleName(
                getBottleDisplayName(updatedCurrentRow, uploadedIndex >= 0 ? uploadedIndex : 0),
              )
            }
            setUploadedImages((prev) =>
              prev.map((row) => (map[row.id] ? mergeImageRowWithPreview(map[row.id], row) : row)),
            )
          }
        }
        setSelectedBottleId('')
        setDetailEditMode(false)
        setDetailDraft(null)
        setAutoStep(2)
        animateCreditsSpend(previousCreditsRemaining, finalCreditsRemaining)
        loadUploadedImages().catch(() => null)
      } catch (error) {
        setUploadError(`${t('automaticAnalyzeError')} (${error?.message || 'unknown'})`)
      } finally {
        setIsAnalyzingAll(false)
        setCurrentAnalyzeBatchCount(0)
        setCurrentAnalyzeBatchIndex(0)
        setCurrentAnalyzeBatchTotal(0)
        setLastAnalyzedBottleName('')
      }
    },
    [
      aiScanCredits.remaining,
      analyzingImageId,
      animateCreditsSpend,
      getBottleDisplayName,
      isAnalyzingAll,
      loadUploadedImages,
      mergeImageRowWithPreview,
      setAiScanCredits,
      setAutoStep,
      setCurrentAnalyzeBatchCount,
      setCurrentAnalyzeBatchIndex,
      setCurrentAnalyzeBatchTotal,
      setDetailDraft,
      setDetailEditMode,
      setIsAnalyzingAll,
      setLastAnalyzedBottleName,
      setSelectedBottleId,
      setUploadError,
      setUploadedImages,
      t,
      pendingAnalyzeImages,
      uploadedImages,
      webSearchingImageId,
    ],
  )

  const handleVerifyImage = useCallback(
    async (imageId, options = {}) => {
      if (!imageId) return
      if (verifyingImageId || analyzingImageId || isAnalyzingAll || deletingImageId) return
      setVerifyingImageId(imageId)
      setUploadError('')
      try {
        const response = await fetch('/api/auto-tasting/verify-catalog', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({imageId}),
        })
        const result = await response.json().catch(() => null)
        if (!response.ok) {
          setUploadError(`${t('automaticVerifyError')} (${result?.error || 'verify'})`)
          return
        }

        if (result?.image) {
          setUploadedImages((prev) =>
            prev.map((row) =>
              row.id === result.image.id ? mergeImageRowWithPreview(result.image, row) : row,
            ),
          )
          if (options.closeAfterSave) {
            setSelectedBottleId('')
            setDetailEditMode(false)
            setDetailDraft(null)
          }
        }
        loadUploadedImages().catch(() => null)
      } catch (error) {
        setUploadError(`${t('automaticVerifyError')} (${error?.message || 'unknown'})`)
      } finally {
        setVerifyingImageId('')
      }
    },
    [
      analyzingImageId,
      deletingImageId,
      isAnalyzingAll,
      loadUploadedImages,
      mergeImageRowWithPreview,
      setDetailDraft,
      setDetailEditMode,
      setSelectedBottleId,
      setUploadError,
      setUploadedImages,
      setVerifyingImageId,
      t,
      verifyingImageId,
    ],
  )

  const handleAttemptExit = useCallback(async () => {
    const ids = sessionImageIdsRef.current
    if (!ids.length) {
      onBack?.()
      return
    }
    onBack?.()
  }, [onBack, sessionImageIdsRef])

  return {
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
  }
}
