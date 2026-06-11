'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {
  AUTO_TASTING_LIST_TIMEOUT_MS,
  isTransientLoadError,
  optimizeAutoTastingUploadFile,
  withClientTimeout,
} from './autoTastingHelpers'

export function useAutoTastingImages({mergeImageRowWithPreview, sessionImageIdsRef, supabase, t, userId}) {
  const loadedPreviewIdsRef = useRef(new Set())
  const previewUrlByImageIdRef = useRef(new Map())
  const originalPreviewFileByImageIdRef = useRef(new Map())
  const previewRecoveryAttemptedIdsRef = useRef(new Set())
  const queuedLoadRef = useRef(false)
  const imagesLoadChainRef = useRef(Promise.resolve())
  const loadRetryTimeoutRef = useRef(null)
  const loadUploadedImagesRef = useRef(async () => {})

  const [uploadedImages, setUploadedImages] = useState([])
  const [previewLoadProgress, setPreviewLoadProgress] = useState({loaded: 0, total: 0})
  const [failedPreviewIds, setFailedPreviewIds] = useState([])
  const [uploadError, setUploadError] = useState('')

  const markPreviewLoaded = useCallback((imageId) => {
    const id = String(imageId || '').trim()
    if (!id) return
    if (loadedPreviewIdsRef.current.has(id)) return
    loadedPreviewIdsRef.current.add(id)
    setPreviewLoadProgress((prev) => {
      if (!prev.total) return prev
      const nextLoaded = Math.min(prev.total, prev.loaded + 1)
      if (nextLoaded === prev.loaded) return prev
      return {...prev, loaded: nextLoaded}
    })
  }, [])

  const markPreviewError = useCallback(
    (imageId) => {
      const id = String(imageId || '').trim()
      if (!id) return
      setFailedPreviewIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
      markPreviewLoaded(id)
    },
    [markPreviewLoaded],
  )

  const revokePreviewUrl = useCallback((imageId) => {
    const id = String(imageId || '').trim()
    if (!id) return
    const currentUrl = previewUrlByImageIdRef.current.get(id)
    if (!currentUrl) return
    URL.revokeObjectURL(currentUrl)
    previewUrlByImageIdRef.current.delete(id)
  }, [])

  const buildFallbackPreviewUrlFromOriginalFile = useCallback(
    async (imageId) => {
      const id = String(imageId || '').trim()
      if (!id) return null
      const originalFile = originalPreviewFileByImageIdRef.current.get(id)
      if (!(originalFile instanceof File)) return null

      const convertedFile = await optimizeAutoTastingUploadFile(originalFile)
      const nextPreviewUrl = URL.createObjectURL(convertedFile)
      revokePreviewUrl(id)
      previewUrlByImageIdRef.current.set(id, nextPreviewUrl)
      return nextPreviewUrl
    },
    [revokePreviewUrl],
  )

  const handlePreviewImageError = useCallback(
    async (imageId) => {
      const id = String(imageId || '').trim()
      if (!id) return

      if (previewRecoveryAttemptedIdsRef.current.has(id)) {
        markPreviewError(id)
        return
      }

      previewRecoveryAttemptedIdsRef.current.add(id)
      const nextPreviewUrl = await buildFallbackPreviewUrlFromOriginalFile(id).catch(() => null)
      if (nextPreviewUrl) {
        setUploadedImages((prev) =>
          prev.map((row) => (row.id === id ? {...row, clientPreviewUrl: nextPreviewUrl} : row)),
        )
        return
      }

      markPreviewError(id)
    },
    [buildFallbackPreviewUrlFromOriginalFile, markPreviewError],
  )

  const setPreviewForImage = useCallback((imageId, previewUrl, originalFile) => {
    const id = String(imageId || '').trim()
    if (!id || !previewUrl) return
    previewUrlByImageIdRef.current.set(id, previewUrl)
    if (originalFile instanceof File) {
      originalPreviewFileByImageIdRef.current.set(id, originalFile)
    }
  }, [])

  const removePreviewArtifacts = useCallback(
    (imageId) => {
      revokePreviewUrl(imageId)
      originalPreviewFileByImageIdRef.current.delete(imageId)
      previewRecoveryAttemptedIdsRef.current.delete(imageId)
    },
    [revokePreviewUrl],
  )

  const resetAllImages = useCallback(() => {
    previewUrlByImageIdRef.current.forEach((url) => {
      URL.revokeObjectURL(url)
    })
    previewUrlByImageIdRef.current.clear()
    originalPreviewFileByImageIdRef.current.clear()
    previewRecoveryAttemptedIdsRef.current.clear()
    loadedPreviewIdsRef.current = new Set()
    setFailedPreviewIds([])
    setPreviewLoadProgress({loaded: 0, total: 0})
    setUploadedImages([])
  }, [])

  const loadUploadedImages = useCallback(async () => {
    if (!userId) return

    async function runLoad() {
      let data = null
      let error = null

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const queryPromise = supabase
          .from('tasting_bottle_images')
          .select(
            'id, original_filename, storage_bucket, storage_path, status, recognized_name, recognized_producer, recognized_vintage, recognition_confidence, recognized_payload, error_message, created_at',
          )
          .eq('uploaded_by', userId)
          .order('created_at', {ascending: false})

        const query = await withClientTimeout(
          queryPromise,
          AUTO_TASTING_LIST_TIMEOUT_MS,
          'auto tasting list',
        ).catch((caughtError) => ({
          data: null,
          error: caughtError,
        }))

        data = query.data
        error = query.error

        if (!error) break

        const isTransientAbort = isTransientLoadError(error)
        if (!isTransientAbort || attempt === 3) break
        await new Promise((resolve) => setTimeout(resolve, attempt * 350))
      }

      if (error) {
        if (isTransientLoadError(error)) {
          if (loadRetryTimeoutRef.current) {
            clearTimeout(loadRetryTimeoutRef.current)
          }
          loadRetryTimeoutRef.current = setTimeout(() => {
            loadUploadedImagesRef.current().catch(() => null)
          }, 1200)
          return
        }
        setUploadError(`${t('automaticLoadError')} (${error.message || 'unknown'})`)
        return
      }

      const ids = sessionImageIdsRef.current
      if (!ids.length) {
        resetAllImages()
        return
      }

      const idSet = new Set(ids)
      const filteredRows = (data || []).filter((row) => idSet.has(row.id))
      const nextRowIds = new Set(filteredRows.map((row) => row.id))
      const retainedLoadedIds = new Set(
        [...loadedPreviewIdsRef.current].filter((loadedId) => nextRowIds.has(loadedId)),
      )

      loadedPreviewIdsRef.current = retainedLoadedIds
      setPreviewLoadProgress({loaded: retainedLoadedIds.size, total: filteredRows.length})
      setUploadedImages((prev) => {
        const previousMap = new Map((prev || []).map((row) => [row.id, row]))
        return filteredRows.map((row) =>
          mergeImageRowWithPreview(row, previousMap.get(row.id) || null),
        )
      })
    }

    if (queuedLoadRef.current) {
      return imagesLoadChainRef.current
    }

    queuedLoadRef.current = true
    imagesLoadChainRef.current = imagesLoadChainRef.current
      .catch(() => null)
      .then(async () => {
        queuedLoadRef.current = false
        await runLoad()
      })

    return imagesLoadChainRef.current
  }, [mergeImageRowWithPreview, resetAllImages, sessionImageIdsRef, supabase, t, userId])

  useEffect(() => {
    loadUploadedImagesRef.current = loadUploadedImages
  }, [loadUploadedImages])

  useEffect(() => {
    const previewUrlMap = previewUrlByImageIdRef.current
    return () => {
      if (loadRetryTimeoutRef.current) {
        clearTimeout(loadRetryTimeoutRef.current)
      }
      previewUrlMap.forEach((url) => {
        URL.revokeObjectURL(url)
      })
      previewUrlMap.clear()
    }
  }, [])

  return {
    failedPreviewIds,
    handlePreviewImageError,
    loadUploadedImages,
    markPreviewError,
    markPreviewLoaded,
    previewLoadProgress,
    removePreviewArtifacts,
    revokePreviewUrl,
    setFailedPreviewIds,
    setPreviewForImage,
    setUploadError,
    setUploadedImages,
    uploadError,
    uploadedImages,
  }
}
