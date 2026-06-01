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

const COUNTRY_CODE_BY_NAME = {
  italia: 'IT',
  italy: 'IT',
  francia: 'FR',
  france: 'FR',
  spagna: 'ES',
  spain: 'ES',
  germania: 'DE',
  germany: 'DE',
  portogallo: 'PT',
  portugal: 'PT',
  'stati uniti': 'US',
  'united states': 'US',
  usa: 'US',
}

const COUNTRY_FLAG_BY_CODE = {
  IT: '🇮🇹',
  FR: '🇫🇷',
  ES: '🇪🇸',
  DE: '🇩🇪',
  PT: '🇵🇹',
  US: '🇺🇸',
}

const WINE_TYPE_ALIASES = {
  Bianco: ['white', 'bianco', 'blanc', 'blanco', 'weiss'],
  Rosso: ['red', 'rosso', 'rouge', 'tinto'],
  Rose: ['rose', 'rosee', 'rose wine', 'rosato', 'rosé'],
  Champagne: ['champagne', 'sparkling', 'spumante', 'prosecco', 'cava', 'franciacorta'],
}

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function mapWineTypeLabel(value) {
  const normalized = normalizeToken(value)
  if (!normalized) return null

  const mapped = Object.entries(WINE_TYPE_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => normalizeToken(alias) === normalized),
  )

  if (mapped) return mapped[0]
  return String(value).trim()
}

function getCountryCode(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  if (!normalized) return null
  return COUNTRY_CODE_BY_NAME[normalized] || null
}

function getCountryFlag(value) {
  const code = getCountryCode(value)
  if (!code) return null
  return COUNTRY_FLAG_BY_CODE[code] || null
}

function toConfidencePercent(value) {
  if (value == null) return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  const raw = Math.round(numeric * 100)
  return Math.max(0, Math.min(100, raw))
}

function formatBytes(value) {
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const scaled = bytes / 1024 ** index
  const digits = index === 0 ? 0 : scaled < 10 ? 1 : 0
  return `${scaled.toFixed(digits)} ${units[index]}`
}

function uniqueIds(values) {
  return Array.from(
    new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean)),
  )
}

function readStoredIds(storage, key) {
  if (!storage || !key) return []
  try {
    const raw = storage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return uniqueIds(Array.isArray(parsed) ? parsed : [])
  } catch {
    return []
  }
}

function writeStoredIds(storage, key, ids) {
  if (!storage || !key) return
  storage.setItem(key, JSON.stringify(uniqueIds(ids)))
}

function AnalyzeMagicOverlay({active, className = ''}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!active) return undefined
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    let rafId = 0
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const particles = Array.from({length: 18}, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2.2 + 1,
      speed: Math.random() * 0.0024 + 0.0009,
      drift: Math.random() * 0.002 - 0.001,
      alpha: Math.random() * 0.6 + 0.2,
    }))
    const orbs = [
      {
        phase: Math.random() * Math.PI * 2,
        radius: 0.42,
        speed: 0.00034,
        xAmp: 0.24,
        yAmp: 0.18,
        core: 'rgba(140, 255, 0, 0.8)',
        mid: 'rgba(162, 0, 255, 0.9)',
        edge: 'rgba(0, 255, 132, 0.685)',
      },
      {
        phase: Math.random() * Math.PI * 2,
        radius: 0.5,
        speed: 0.00028,
        xAmp: 0.2,
        yAmp: 0.22,
        core: 'rgb(255, 55, 0)',
        mid: 'rgba(89, 0, 255, 0.7)',
        edge: 'rgba(176,132,255,0)',
      },
      {
        phase: Math.random() * Math.PI * 2,
        radius: 0.46,
        speed: 0.00041,
        xAmp: 0.17,
        yAmp: 0.15,
        core: 'rgb(255, 0, 0)',
        mid: 'rgb(191, 0, 255)',
        edge: 'rgba(129,243,222,0)',
      },
    ]

    function resize() {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function render(time) {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (!width || !height) {
        rafId = requestAnimationFrame(render)
        return
      }

      ctx.clearRect(0, 0, width, height)

      // Full-card color wash so the glow is clearly visible across the entire card.
      const wash = ctx.createLinearGradient(0, 0, width, height)
      wash.addColorStop(0, 'rgba(255, 0, 128, 0.725)')
      wash.addColorStop(0.45, 'rgba(106, 26, 255, 0.966)')
      wash.addColorStop(1, 'rgba(7, 248, 192, 0.764)')
      ctx.fillStyle = wash
      ctx.fillRect(0, 0, width, height)

      const backGlow = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        0,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.9,
      )
      backGlow.addColorStop(0, 'rgba(160, 118, 255, 0.12)')
      backGlow.addColorStop(1, 'rgba(160, 118, 255, 0)')
      ctx.fillStyle = backGlow
      ctx.fillRect(0, 0, width, height)

      const t = prefersReducedMotion ? 0 : time

      orbs.forEach((orb, idx) => {
        const angle = t * orb.speed + orb.phase
        const x = width * (0.5 + Math.cos(angle * (1.05 + idx * 0.15)) * orb.xAmp)
        const y = height * (0.5 + Math.sin(angle * (1.2 + idx * 0.11)) * orb.yAmp)
        const gradient = ctx.createRadialGradient(
          x,
          y,
          0,
          x,
          y,
          Math.min(width, height) * orb.radius,
        )
        gradient.addColorStop(0, orb.core)
        gradient.addColorStop(0.32, orb.mid)
        gradient.addColorStop(1, orb.edge)
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
      })

      rafId = requestAnimationFrame(render)
    }

    resize()
    const resizeObserver = new ResizeObserver(() => resize())
    resizeObserver.observe(canvas)
    rafId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
    }
  }, [active])

  if (!active) return null
  return (
    <canvas
      ref={canvasRef}
      className={`${styles.autoAnalyzeMagicCanvas} ${className}`.trim()}
      aria-hidden="true"
    />
  )
}

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
  const sessionImageIdsRef = useRef([])
  const loadedPreviewIdsRef = useRef(new Set())
  const queuedLoadRef = useRef(false)
  const imagesLoadChainRef = useRef(Promise.resolve())
  const loadRetryTimeoutRef = useRef(null)
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
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false)
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isLeavingSession, setIsLeavingSession] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadedImages, setUploadedImages] = useState([])
  const [previewLoadProgress, setPreviewLoadProgress] = useState({loaded: 0, total: 0})
  const [sessionImageIds, setSessionImageIds] = useState([])

  const sessionIdsStorageKey = useMemo(
    () => (userId ? `auto_tasting_session_image_ids:${userId}` : ''),
    [userId],
  )
  const pendingDeleteStorageKey = useMemo(
    () => (userId ? `auto_tasting_pending_delete_ids:${userId}` : ''),
    [userId],
  )

  const persistSessionIds = useCallback(
    (ids) => {
      if (typeof window === 'undefined') return
      writeStoredIds(window.sessionStorage, sessionIdsStorageKey, ids)
      writeStoredIds(window.localStorage, pendingDeleteStorageKey, ids)
    },
    [pendingDeleteStorageKey, sessionIdsStorageKey],
  )

  const clearSessionIds = useCallback(() => {
    if (typeof window === 'undefined') return
    if (sessionIdsStorageKey) window.sessionStorage.removeItem(sessionIdsStorageKey)
    if (pendingDeleteStorageKey) window.localStorage.removeItem(pendingDeleteStorageKey)
  }, [pendingDeleteStorageKey, sessionIdsStorageKey])

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
    const hit = regionHints.find((region) => source.includes(region))
    return hit ? hit.replace(/\b\w/g, (c) => c.toUpperCase()) : null
  }

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

  function isTransientLockError(error) {
    const errorName = String(error?.name || '').toLowerCase()
    const errorMessage = String(error?.message || '').toLowerCase()
    return errorName === 'aborterror' || errorMessage.includes('lock was stolen by another request')
  }

  function uploadFileWithProgress(formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/auto-tasting/upload')
      xhr.timeout = 45000

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

  const loadUploadedImages = useCallback(async () => {
    if (!userId) return

    async function runLoad() {
      let data = null
      let error = null

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const query = await supabase
          .from('tasting_bottle_images')
          .select(
            'id, original_filename, storage_bucket, storage_path, status, recognized_name, recognized_producer, recognized_vintage, recognition_confidence, recognized_payload, error_message, created_at',
          )
          .eq('uploaded_by', userId)
          .order('created_at', {ascending: false})

        data = query.data
        error = query.error

        if (!error) break

        const isTransientAbort = isTransientLockError(error)
        if (!isTransientAbort || attempt === 2) break
        await new Promise((resolve) => setTimeout(resolve, attempt * 250))
      }

      if (error) {
        if (isTransientLockError(error)) {
          if (loadRetryTimeoutRef.current) {
            clearTimeout(loadRetryTimeoutRef.current)
          }
          loadRetryTimeoutRef.current = setTimeout(() => {
            loadUploadedImages().catch(() => null)
          }, 900)
          return
        }
        setUploadError(`${t('automaticLoadError')} (${error.message || 'unknown'})`)
        return
      }

      const ids = sessionImageIdsRef.current
      if (!ids.length) {
        loadedPreviewIdsRef.current = new Set()
        setPreviewLoadProgress({loaded: 0, total: 0})
        setUploadedImages([])
        return
      }

      const idSet = new Set(ids)
      const filteredRows = (data || []).filter((row) => idSet.has(row.id))
      loadedPreviewIdsRef.current = new Set()
      setPreviewLoadProgress({loaded: 0, total: filteredRows.length})
      setUploadedImages(filteredRows)
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
  }, [supabase, t, userId])

  useEffect(() => {
    sessionImageIdsRef.current = sessionImageIds
  }, [sessionImageIds])

  useEffect(() => {
    return () => {
      if (loadRetryTimeoutRef.current) {
        clearTimeout(loadRetryTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return

    const sessionIds = readStoredIds(window.sessionStorage, sessionIdsStorageKey)
    setSessionImageIds(sessionIds)

    const pendingIds = readStoredIds(window.localStorage, pendingDeleteStorageKey)
    if (!pendingIds.length) return
    ;(async () => {
      await Promise.allSettled(
        pendingIds.map((id) =>
          fetch('/api/auto-tasting/delete', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({imageId: id}),
          }),
        ),
      )
      window.localStorage.removeItem(pendingDeleteStorageKey)
      if (sessionIdsStorageKey) {
        window.sessionStorage.removeItem(sessionIdsStorageKey)
      }
      setSessionImageIds([])
      if (sessionIdsStorageKey) {
        const freshSessionIds = readStoredIds(window.sessionStorage, sessionIdsStorageKey)
        setSessionImageIds(freshSessionIds)
      }
      loadUploadedImages().catch(() => null)
    })()
  }, [loadUploadedImages, pendingDeleteStorageKey, sessionIdsStorageKey, userId])

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return undefined

    function handleBeforeUnload(event) {
      const ids = sessionImageIdsRef.current
      if (!ids.length) return
      writeStoredIds(window.localStorage, pendingDeleteStorageKey, ids)
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [pendingDeleteStorageKey, userId])

  useEffect(() => {
    if (!userId) return

    loadUploadedImages()
  }, [loadUploadedImages, userId])

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

  async function handleFilesUpload(fileList) {
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
        const uploadFile = file
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

        if (metadataResult?.image) createdRows.push(metadataResult.image)
      }

      if (createdRows.length > 0) {
        const createdIds = uniqueIds(createdRows.map((row) => row.id))
        setSessionImageIds((prev) => {
          const next = uniqueIds([...prev, ...createdIds])
          persistSessionIds(next)
          return next
        })
        setUploadedImages((prev) => [...createdRows, ...prev])
        // Refresh in background: do not block upload completion UI.
        loadUploadedImages().catch(() => null)
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

      setUploadedImages((prev) => prev.filter((image) => image.id !== imageId))
      setSessionImageIds((prev) => {
        const next = prev.filter((id) => id !== imageId)
        if (next.length > 0) {
          persistSessionIds(next)
        } else {
          clearSessionIds()
        }
        return next
      })
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
        const map = Object.fromEntries(updatedRows.map((row) => [row.id, row]))
        setUploadedImages((prev) => prev.map((row) => map[row.id] || row))
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
    const ids = sessionImageIdsRef.current
    if (!ids.length) return
    setIsAnalyzingAll(true)
    setUploadError('')
    try {
      const response = await fetch('/api/auto-tasting/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({analyzeAll: true, imageIds: ids}),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setUploadError(`${t('automaticAnalyzeError')} (${result?.error || 'analyze all'})`)
        return
      }
      const updatedRows = Array.isArray(result?.updated) ? result.updated : []
      if (updatedRows.length > 0) {
        const map = Object.fromEntries(updatedRows.map((row) => [row.id, row]))
        setUploadedImages((prev) => prev.map((row) => map[row.id] || row))
      }
      loadUploadedImages().catch(() => null)
    } catch (error) {
      setUploadError(`${t('automaticAnalyzeError')} (${error?.message || 'unknown'})`)
    } finally {
      setIsAnalyzingAll(false)
    }
  }

  async function cleanupSessionImages(ids) {
    const normalizedIds = uniqueIds(ids)
    if (!normalizedIds.length) return

    await Promise.allSettled(
      normalizedIds.map((id) =>
        fetch('/api/auto-tasting/delete', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({imageId: id}),
        }),
      ),
    )
  }

  async function handleAttemptExit() {
    if (isLeavingSession) return
    const ids = sessionImageIdsRef.current
    if (!ids.length) {
      onBack?.()
      return
    }

    const shouldLeave = window.confirm(
      'Se esci ora, le foto caricate in questa sessione verranno cancellate. Vuoi continuare?',
    )
    if (!shouldLeave) return

    setIsLeavingSession(true)
    try {
      await cleanupSessionImages(ids)
      clearSessionIds()
      setSessionImageIds([])
      setUploadedImages([])
      onBack?.()
    } finally {
      setIsLeavingSession(false)
    }
  }

  function buildAutoQuizPayload(images) {
    const recognized = (images || []).filter(
      (image) =>
        image?.status === 'recognized' && image?.recognized_name && image?.recognized_producer,
    )
    if (recognized.length === 0) {
      throw new Error('no recognized bottles')
    }

    const bottles = recognized.map((image) => {
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
    const effectiveQuestions = questionDefs.map((def) => {
      const extractedValues = [...new Set(bottles.map((b) => b._values[def.key]).filter(Boolean))]
      const templateOptions = templateByKey[def.key] || []
      const maxOptions = Math.max(1, templateOptions.length || 7)
      const options = [
        ...extractedValues,
        ...templateOptions.filter((option) => !extractedValues.includes(option)),
      ].slice(0, maxOptions)
      return {_key: def.key, text: def.text, options}
    })

    const readyBottles = bottles.map((bottle) => {
      const answers = effectiveQuestions.map((question) => {
        if (!question._key) return null
        const value = bottle._values[question._key]
        if (!value) return null
        const idx = question.options.findIndex((option) => option === value)
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
    if (isCreatingQuiz || isUploading || isAnalyzingAll || analyzingImageId || deletingImageId)
      return
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
    <PageLayout title={t('title')} onBack={handleAttemptExit}>
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
            onChange={(event) => handleFilesUpload(event.target.files)}
          />

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
                Anteprime caricate: {previewLoadProgress.loaded}/{previewLoadProgress.total}
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
            <div
              className={styles.autoPreviewModalContent}
              onClick={(event) => event.stopPropagation()}>
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
              {uploadedImages.map((image) => {
                const details = image.recognized_payload?.catalog_details || null
                const country = details?.country || null
                const region = details
                  ? inferRegion(details, image) || details?.region || null
                  : null
                const wineType = mapWineTypeLabel(details?.type)
                const primaryGrape =
                  (Array.isArray(details?.grapes) && details.grapes.length > 0
                    ? details.grapes[0]
                    : null) || null
                const recognizedTitle = image.recognized_name || image.original_filename || '-'
                const recognizedSubtitle = [image.recognized_producer, image.recognized_vintage]
                  .filter(Boolean)
                  .join(' | ')
                const confidencePercent = toConfidencePercent(image.recognition_confidence)
                // const countryCode = getCountryCode(country)
                const countryFlag = getCountryFlag(country)
                const isAnalyzingThis = analyzingImageId === image.id
                const hasCatalogDetails = !!details
                const hasRecognitionData =
                  hasCatalogDetails ||
                  !!image.recognized_name ||
                  !!image.recognized_producer ||
                  !!image.recognized_vintage ||
                  image.status === 'recognized'
                const hasVision =
                  image.recognized_payload?.provider === 'google_vision_api' ||
                  String(image.recognized_payload?.extractor || '').startsWith('google-vision')
                const hasMatch = !!image.recognized_payload?.catalog_match?.matched

                return (
                  <li
                    key={image.id}
                    className={`${styles.autoBottleCard} ${isAnalyzingThis ? styles.autoBottleCardAnalyzing : ''}`}>
                    <AnalyzeMagicOverlay
                      active={isAnalyzingThis}
                      className={styles.autoBottleCardMagicCanvas}
                    />
                    <div
                      className={`${styles.autoBottleCardBody} ${!hasRecognitionData ? styles.autoBottleCardBodyPending : ''}`}>
                      <div className={styles.autoBottleCardMediaCol}>
                        <div className={styles.autoBottleCardPreviewWrap}>
                          <img
                            src={`/api/auto-tasting/image?id=${image.id}`}
                            alt={image.original_filename || image.storage_path}
                            className={styles.autoBottleCardPreview}
                            loading="lazy"
                            decoding="async"
                            onLoad={() => markPreviewLoaded(image.id)}
                            onError={() => markPreviewLoaded(image.id)}
                          />
                        </div>
                      </div>

                      {hasRecognitionData ? (
                        <div className={styles.autoBottleCardInfoCol}>
                          <div className={styles.autoModeUploadedBadges}>
                            {hasVision && (
                              <span className={styles.autoModeFeatureBadge}>
                                <Icon
                                  src="/icons/vision.svg"
                                  size={16}
                                  className={styles.autoModeFeatureIcon}
                                />
                                {t('automaticVisionBadge')}
                              </span>
                            )}
                            {hasMatch && (
                              <span className={styles.autoModeFeatureBadge}>
                                <Icon
                                  src="/icons/match.svg"
                                  size={16}
                                  className={styles.autoModeFeatureIcon}
                                />
                                {t('automaticMatchBadge')}
                              </span>
                            )}
                            {confidencePercent != null && (
                              <span className={styles.autoBottleConfidencePill}>
                                {confidencePercent}%
                              </span>
                            )}
                          </div>

                          <p className={styles.autoBottleFoundName}>{recognizedTitle}</p>

                          {recognizedSubtitle ? (
                            <p className={styles.autoBottleCardSubtitle}>{recognizedSubtitle}</p>
                          ) : null}

                          {hasCatalogDetails ? (
                            <p className={styles.autoBottleCardFacts}>
                              {country ? (
                                <span className={styles.autoBottleCountryBadge}>
                                  {countryFlag ? (
                                    <span aria-hidden="true">{countryFlag}</span>
                                  ) : null}
                                  {/* {countryCode ? <span>{countryCode}</span> : null} */}
                                </span>
                              ) : null}
                              {country ? <span>{country}</span> : null}
                              {region ? <span className={styles.autoBottleFactDot}>•</span> : null}
                              {region ? <span>{region}</span> : null}
                              {wineType ? (
                                <span className={styles.autoBottleFactDot}>•</span>
                              ) : null}
                              {wineType ? <span>{wineType}</span> : null}
                              {primaryGrape ? (
                                <span className={styles.autoBottleFactDot}>•</span>
                              ) : null}
                              {primaryGrape ? <span>{primaryGrape}</span> : null}
                            </p>
                          ) : null}

                          {hasCatalogDetails && (
                            <div className={styles.autoBottleCardDataBlock}>
                              <p className={styles.autoBottleCardDataRow}>
                                <span className={styles.autoBottleDataLabel}>
                                  <Icon src="/icons/vision.svg" size={16} />
                                  <strong>{t('automaticQuizDataLabel')}:</strong>
                                </span>{' '}
                                {[
                                  details.country,
                                  details.region,
                                  details.type,
                                  image.recognized_vintage,
                                ]
                                  .filter(Boolean)
                                  .join(' · ') || '-'}
                                {Array.isArray(details.grapes) && details.grapes.length > 0
                                  ? ` · ${details.grapes.join(', ')}`
                                  : ''}
                                {details.price != null
                                  ? ` · ${t('automaticPriceLabel')}: ${details.price}${details.currency ? ` ${details.currency}` : ''}`
                                  : ''}
                              </p>
                              <p className={styles.autoBottleCardDataRow}>
                                <span className={styles.autoBottleDataLabel}>
                                  <Icon src="/icons/match.svg" size={16} />
                                  <strong>{t('automaticQuizResolvedLabel')}:</strong>
                                </span>{' '}
                                {[
                                  details.country || '-',
                                  inferRegion(details, image) || '-',
                                  primaryGrape,
                                  image.recognized_vintage || '-',
                                ].join(' | ')}
                              </p>
                            </div>
                          )}

                          {image.error_message && (
                            <span className={styles.autoModeUploadedError}>
                              {image.error_message}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>

                    <div className={styles.autoBottleCardFooterActionBar}>
                      {deletingImageId === image.id ? (
                        <span className={styles.autoDeleteState}>{t('automaticDeleting')}</span>
                      ) : (
                        <button
                          type="button"
                          className="btn icon-circle"
                          disabled={!!deletingImageId || !!analyzingImageId || isAnalyzingAll}
                          aria-label={`${t('automaticDeleteAction')} ${image.original_filename || image.storage_path}`}
                          onClick={() => handleDeleteImage(image.id)}>
                          <Icon name="removeSmall" size={20} />
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-small ai btn-with-icon-end"
                        disabled={isAnalyzingAll || !!analyzingImageId || !!deletingImageId}
                        onClick={() => handleAnalyzeImage(image.id)}>
                        <Icon src="/icons/vision.svg" size={18} className="btn-icon" />
                        {isAnalyzingThis
                          ? t('automaticAnalyzingSingle')
                          : hasRecognitionData
                            ? t('automaticAnalyzeAgainAction')
                            : t('automaticAnalyzeAction')}
                      </button>
                    </div>
                  </li>
                )
              })}
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
