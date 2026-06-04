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

const COST_CURRENCY = process.env.NEXT_PUBLIC_OPENAI_COST_CURRENCY || 'EUR'
const VISION_INPUT_COST_PER_1K_TOKENS = Number(
  process.env.NEXT_PUBLIC_OPENAI_VISION_INPUT_COST_PER_1K_TOKENS || 0,
)
const VISION_OUTPUT_COST_PER_1K_TOKENS = Number(
  process.env.NEXT_PUBLIC_OPENAI_VISION_OUTPUT_COST_PER_1K_TOKENS || 0,
)
const WEB_INPUT_COST_PER_1K_TOKENS = Number(
  process.env.NEXT_PUBLIC_OPENAI_WEB_INPUT_COST_PER_1K_TOKENS || 0,
)
const WEB_OUTPUT_COST_PER_1K_TOKENS = Number(
  process.env.NEXT_PUBLIC_OPENAI_WEB_OUTPUT_COST_PER_1K_TOKENS || 0,
)

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
    text: 'Che voto daresti a questo vino?',
    kind: 'rating',
    isNeutral: true,
    options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  },
  {
    text: 'Prezzo',
    options: ['5€', '10€', '20€', '30€', '40€', '60€', '80€'],
  },
]

function normalizePriceAnswer(price, min = 5) {
  const numeric = Number(price)
  if (!Number.isFinite(numeric)) return null
  return `${Math.max(min, Math.round(numeric / 5) * 5)}€`
}

function getVintageBandLabel(year) {
  const numeric = Number(year)
  if (!Number.isFinite(numeric)) return null
  if (numeric >= 2022) return '2022-2024'
  if (numeric >= 2019) return '2019-2021'
  if (numeric >= 2016) return '2016-2018'
  if (numeric >= 2012) return '2012-2015'
  return '2011 o prima'
}

function inferVintageQuizValue(recognizedVintage, knownVintages = []) {
  if (recognizedVintage) return String(recognizedVintage)

  const normalizedKnownVintages = (Array.isArray(knownVintages) ? knownVintages : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)

  if (!normalizedKnownVintages.length) return null

  const latestKnownVintage = normalizedKnownVintages[0]
  return getVintageBandLabel(latestKnownVintage)
}
function normalizePriceRangeAnswer(priceMin, priceMax, fallbackPrice, min = 5) {
  const low = Number(priceMin)
  const high = Number(priceMax)

  if (Number.isFinite(low) && Number.isFinite(high) && high > low) {
    const roundedLow = Math.max(min, Math.round(low / 5) * 5)
    const roundedHigh = Math.max(roundedLow + 5, Math.round(high / 5) * 5)
    return `${roundedLow}-${roundedHigh}€`
  }

  return normalizePriceAnswer(fallbackPrice, min)
}

function createPriceOptionsFromPrices(prices, min = 5) {
  const normalizedPrices = prices.map((price) => Number(price)).filter(Number.isFinite)

  if (!normalizedPrices.length) {
    return ['5€', '10€', '20€', '30€', '40€']
  }

  const roundedPrices = normalizedPrices.map((price) => Math.max(min, Math.round(price / 5) * 5))

  const minPrice = Math.min(...roundedPrices)
  const maxPrice = Math.max(...roundedPrices)

  const center =
    roundedPrices.length === 1 ? roundedPrices[0] : Math.round((minPrice + maxPrice) / 2 / 5) * 5

  const options = [center - 10, center - 5, center, center + 5, center + 10]
    .filter((value) => value >= min)
    .map((value) => `${value}€`)

  return [...new Set(options)]
}

const OPENAI_TEMPLATE_OPTIONS = {
  body: ['Leggero', 'Medio-leggero', 'Medio', 'Medio-pieno', 'Pieno'],
  acidity: ['Morbida', 'Fresca', 'Media', 'Vivace', 'Alta'],
  harmony: ['Diretto', 'Equilibrato', 'Elegante', 'Strutturato', 'Complesso'],
}

const MIN_AUTO_QUIZ_OPTIONS = 5
const AUTO_TASTING_LIST_TIMEOUT_MS = 12000

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

function normalizeBodyForQuiz(value) {
  const normalized = normalizeToken(value)
  if (!normalized) return null
  if (normalized === 'light' || normalized === 'light-bodied') return 'Leggero'
  if (normalized === 'medium' || normalized === 'medium-bodied') return 'Medio'
  if (normalized === 'full' || normalized === 'full-bodied') return 'Pieno'
  return String(value).trim()
}

function normalizeAcidityForQuiz(value) {
  const normalized = normalizeToken(value)
  if (!normalized) return null
  if (normalized === 'fresh' || normalized === 'low') return 'Fresca'
  if (normalized === 'medium') return 'Media'
  if (normalized === 'high') return 'Alta'
  return String(value).trim()
}

function normalizeHarmonyForQuiz(value) {
  const normalized = normalizeToken(value)
  if (!normalized) return null
  if (normalized === 'balanced') return 'Equilibrato'
  if (normalized === 'elegant') return 'Elegante'
  if (normalized === 'structured') return 'Strutturato'
  return String(value).trim()
}

function normalizeNotableForQuiz(value, notableOptions) {
  const normalized = normalizeToken(value)
  if (!normalized) return null

  if (
    normalized.includes('collaboration') ||
    normalized.includes('collaborazione') ||
    normalized.includes('renowned producers') ||
    normalized.includes('renowned winemakers') ||
    normalized.includes('gaja') ||
    normalized.includes('graci')
  ) {
    return notableOptions.collaboration
  }

  if (
    normalized.includes('etna') ||
    normalized.includes('territory') ||
    normalized.includes('terroir') ||
    normalized.includes('volcanic') ||
    normalized.includes('territorio') ||
    normalized.includes('vulcan')
  ) {
    return notableOptions.territory
  }

  if (
    normalized.includes('grape') ||
    normalized.includes('grapes') ||
    normalized.includes('vitigno') ||
    normalized.includes('uvaggio') ||
    normalized.includes('carricante') ||
    normalized.includes('nebbiolo') ||
    normalized.includes('sangiovese')
  ) {
    return notableOptions.grape
  }

  if (
    normalized.includes('producer') ||
    normalized.includes('cantina') ||
    normalized.includes('winemaking') ||
    normalized.includes('style') ||
    normalized.includes('stile')
  ) {
    return notableOptions.producer
  }

  if (
    normalized.includes('appellation') ||
    normalized.includes('denominazione') ||
    normalized.includes('dop') ||
    normalized.includes('doc') ||
    normalized.includes('docg')
  ) {
    return notableOptions.appellation
  }

  return notableOptions.profile
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

function getTokenUsageFromImage(image) {
  const visionUsage = image?.recognized_payload?.openai_payload?.usage || null
  const webUsage = image?.recognized_payload?.web_enrichment?.usage || null

  const visionTotal = Number(visionUsage?.total_tokens || 0)
  const webTotal = Number(webUsage?.total_tokens || 0)
  const visionInput = Number(visionUsage?.input_tokens || 0)
  const visionOutput = Number(visionUsage?.output_tokens || 0)
  const webInput = Number(webUsage?.input_tokens || 0)
  const webOutput = Number(webUsage?.output_tokens || 0)
  const estimatedCost =
    ((Number.isFinite(visionInput) ? visionInput : 0) / 1000) * VISION_INPUT_COST_PER_1K_TOKENS +
    ((Number.isFinite(visionOutput) ? visionOutput : 0) / 1000) *
      VISION_OUTPUT_COST_PER_1K_TOKENS +
    ((Number.isFinite(webInput) ? webInput : 0) / 1000) * WEB_INPUT_COST_PER_1K_TOKENS +
    ((Number.isFinite(webOutput) ? webOutput : 0) / 1000) * WEB_OUTPUT_COST_PER_1K_TOKENS

  return {
    vision: Number.isFinite(visionTotal) ? visionTotal : 0,
    web: Number.isFinite(webTotal) ? webTotal : 0,
    total:
      (Number.isFinite(visionTotal) ? visionTotal : 0) + (Number.isFinite(webTotal) ? webTotal : 0),
    cost: Number.isFinite(estimatedCost) ? estimatedCost : 0,
  }
}

function formatEstimatedCost(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: COST_CURRENCY,
    minimumFractionDigits: numeric < 1 ? 3 : 2,
    maximumFractionDigits: numeric < 1 ? 3 : 2,
  }).format(numeric)
}

function getResolvedQuizValuesForImage(image, preview) {
  const bottles = Array.isArray(preview?.bottles) ? preview.bottles : []
  const questions = Array.isArray(preview?.questions) ? preview.questions : []
  if (!bottles.length || !questions.length) return []

  const imageName = normalizeToken(image?.recognized_name || '')
  const imageProducer = normalizeToken(image?.recognized_producer || '')
  const imageYear = String(image?.recognized_vintage || '').trim()

  const matchedBottle =
    bottles.find((bottle) => {
      const sameName = normalizeToken(bottle?.name || '') === imageName
      const sameProducer = normalizeToken(bottle?.producer || '') === imageProducer
      const sameYear = String(bottle?.year || '').trim() === imageYear
      return sameName && sameProducer && (sameYear || (!bottle?.year && !imageYear))
    }) ||
    bottles.find((bottle) => normalizeToken(bottle?.name || '') === imageName) ||
    null

  if (!matchedBottle) return []

  return questions.map((question, idx) => {
    const answerIndex = Number.isInteger(matchedBottle?.answers?.[idx]) ? matchedBottle.answers[idx] : null
    if (answerIndex == null) return '-'
    return question?.options?.[answerIndex] ?? '-'
  })
}

function withClientTimeout(promise, ms, label) {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} timeout after ${Math.floor(ms / 1000)}s`)),
      ms,
    )
  })

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
}

function isTransientLockError(error) {
  const errorName = String(error?.name || '').toLowerCase()
  const errorMessage = String(error?.message || '').toLowerCase()
  return errorName === 'aborterror' || errorMessage.includes('lock was stolen by another request')
}

function isTransientLoadError(error) {
  const errorMessage = String(error?.message || '').toLowerCase()
  return (
    isTransientLockError(error) ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('failed to fetch')
  )
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
  const [verifyingImageId, setVerifyingImageId] = useState('')
  const [webSearchingImageId, setWebSearchingImageId] = useState('')
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false)
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [quizTemplateMode, setQuizTemplateMode] = useState('standard')
  const [isLeavingSession, setIsLeavingSession] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadedImages, setUploadedImages] = useState([])
  const [previewLoadProgress, setPreviewLoadProgress] = useState({loaded: 0, total: 0})
  const [sessionImageIds, setSessionImageIds] = useState([])
  const lastLoggedImagesRef = useRef('')

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
    const quizRegion = String(details?.quiz_region || '').trim()
    if (quizRegion) return quizRegion

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

  const bindPreviewImageNode = useCallback(
    (node, imageId) => {
      if (!node) return
      if (node.complete) {
        markPreviewLoaded(imageId)
      }
    },
    [markPreviewLoaded],
  )

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
            loadUploadedImages().catch(() => null)
          }, 1200)
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
      const nextRowIds = new Set(filteredRows.map((row) => row.id))
      const retainedLoadedIds = new Set(
        [...loadedPreviewIdsRef.current].filter((loadedId) => nextRowIds.has(loadedId)),
      )

      loadedPreviewIdsRef.current = retainedLoadedIds
      setPreviewLoadProgress({loaded: retainedLoadedIds.size, total: filteredRows.length})
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
    if (typeof window === 'undefined' || uploadedImages.length === 0) return

    const snapshot = JSON.stringify(
      uploadedImages.map((image) => ({
        id: image.id,
        status: image.status,
        recognized_name: image.recognized_name || null,
        recognized_producer: image.recognized_producer || null,
        recognized_vintage: image.recognized_vintage || null,
        recognition_confidence: image.recognition_confidence || null,
        review_required: !!image.recognized_payload?.review?.required,
        catalog_match: !!image.recognized_payload?.catalog_match?.matched,
        country: image.recognized_payload?.catalog_details?.country || null,
        region:
          image.recognized_payload?.catalog_details?.quiz_region ||
          image.recognized_payload?.catalog_details?.region ||
          null,
        appellation:
          image.recognized_payload?.catalog_details?.quiz_appellation ||
          image.recognized_payload?.catalog_details?.appellation ||
          null,
        grapes: Array.isArray(image.recognized_payload?.catalog_details?.grapes)
          ? image.recognized_payload.catalog_details.grapes
          : [],
        short_description: image.recognized_payload?.catalog_details?.short_description || null,
        why_notable: image.recognized_payload?.catalog_details?.why_notable || null,
        body: image.recognized_payload?.catalog_details?.body || null,
        acidity: image.recognized_payload?.catalog_details?.acidity || null,
        harmony:
          image.recognized_payload?.catalog_details?.harmony ||
          image.recognized_payload?.catalog_details?.harmonize ||
          null,
        web_enrichment_applied: !!image.recognized_payload?.web_enrichment?.applied,
        web_enrichment_sources: Array.isArray(image.recognized_payload?.web_enrichment?.sources)
          ? image.recognized_payload.web_enrichment.sources
          : [],
      })),
    )

    if (lastLoggedImagesRef.current === snapshot) return
    lastLoggedImagesRef.current = snapshot

    const rows = uploadedImages.map((image) => {
      const details = image.recognized_payload?.catalog_details || {}
      return {
        id: image.id,
        status: image.status,
        name: image.recognized_name || null,
        producer: image.recognized_producer || null,
        vintage: image.recognized_vintage || null,
        country: details.country || null,
        region: details.quiz_region || details.region || null,
        appellation: details.quiz_appellation || details.appellation || null,
        grapes: Array.isArray(details.grapes) ? details.grapes.join(', ') : '',
        shortDescription: details.short_description || null,
        whyNotable: details.why_notable || null,
        body: details.body || null,
        acidity: details.acidity || null,
        harmony: details.harmony || details.harmonize || null,
        webEnrichmentApplied: !!image.recognized_payload?.web_enrichment?.applied,
        webSources: Array.isArray(image.recognized_payload?.web_enrichment?.sources)
          ? image.recognized_payload.web_enrichment.sources.join('\n')
          : '',
        confidence: image.recognition_confidence || null,
        reviewRequired: !!image.recognized_payload?.review?.required,
        matchedInCatalog: !!image.recognized_payload?.catalog_match?.matched,
      }
    })

    console.groupCollapsed(`[auto-tasting] recognized bottles (${rows.length})`)
    console.table(rows)
    const webRows = uploadedImages
      .map((image) => ({
        id: image.id,
        name: image.recognized_name || null,
        producer: image.recognized_producer || null,
        applied: !!image.recognized_payload?.web_enrichment?.applied,
        confidence: image.recognized_payload?.web_enrichment?.confidence ?? null,
        shortDescription: image.recognized_payload?.catalog_details?.short_description || null,
        whyNotable: image.recognized_payload?.catalog_details?.why_notable || null,
        sources: Array.isArray(image.recognized_payload?.web_enrichment?.sources)
          ? image.recognized_payload.web_enrichment.sources
          : [],
        error: image.recognized_payload?.web_enrichment?.error || null,
      }))
      .filter(
        (row) =>
          row.applied ||
          row.shortDescription ||
          row.whyNotable ||
          row.sources.length > 0 ||
          row.error,
      )
    if (webRows.length > 0) {
      console.log('[auto-tasting] web enrichment', webRows)
    }
    console.log('[auto-tasting] raw images', uploadedImages)
    console.groupEnd()
  }, [uploadedImages])

  const autoTastingTokenTotals = useMemo(() => {
    return uploadedImages.reduce(
      (acc, image) => {
        const usage = getTokenUsageFromImage(image)
        acc.vision += usage.vision
        acc.web += usage.web
        acc.total += usage.total
        acc.cost += usage.cost
        return acc
      },
      {vision: 0, web: 0, total: 0, cost: 0},
    )
  }, [uploadedImages])

  const analyzedImagesCount = useMemo(
    () => uploadedImages.filter((image) => image.status === 'recognized').length,
    [uploadedImages],
  )

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
    if (analyzingImageId || isAnalyzingAll || webSearchingImageId) return
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

  async function handleWebSearchImage(imageId) {
    if (!imageId) return
    if (webSearchingImageId || analyzingImageId || isAnalyzingAll) return
    setWebSearchingImageId(imageId)
    setUploadError('')
    try {
      const response = await fetch('/api/auto-tasting/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          imageId,
          useWebEnrichment: true,
          forceWebEnrichment: true,
          webEnrichmentOnly: true,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setUploadError(`${t('automaticWebSearchError')} (${result?.error || 'web search'})`)
        return
      }

      const updatedRows = Array.isArray(result?.updated) ? result.updated : []
      if (updatedRows.length > 0) {
        const map = Object.fromEntries(updatedRows.map((row) => [row.id, row]))
        setUploadedImages((prev) => prev.map((row) => map[row.id] || row))
      }
      loadUploadedImages().catch(() => null)
    } catch (error) {
      setUploadError(`${t('automaticWebSearchError')} (${error?.message || 'unknown'})`)
    } finally {
      setWebSearchingImageId('')
    }
  }

  async function handleAnalyzeAll() {
    if (isAnalyzingAll || analyzingImageId || webSearchingImageId) return
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

  async function handleVerifyImage(imageId) {
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
          prev.map((row) => (row.id === result.image.id ? result.image : row)),
        )
      }
      loadUploadedImages().catch(() => null)
    } catch (error) {
      setUploadError(`${t('automaticVerifyError')} (${error?.message || 'unknown'})`)
    } finally {
      setVerifyingImageId('')
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

  function buildAutoQuizPayload(images, mode = 'standard') {
    const notableOptions = {
      collaboration: t('automaticNotableOptionCollaboration'),
      grape: t('automaticNotableOptionGrape'),
      territory: t('automaticNotableOptionTerritory'),
      producer: t('automaticNotableOptionProducer'),
      appellation: t('automaticNotableOptionAppellation'),
      profile: t('automaticNotableOptionProfile'),
    }

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
      const vintageValue = inferVintageQuizValue(
        image.recognized_vintage,
        details.known_vintages,
      )
      const whyNotableValue = normalizeNotableForQuiz(
        String(details.why_notable || details.short_description || '')
          .trim()
          .replace(/\s+/g, ' '),
        notableOptions,
      )
      const averagePrice = details.average_price ?? details.price ?? null
      const priceValue = normalizePriceAnswer(averagePrice)
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
          notable: whyNotableValue,
          price: priceValue,
          rawPrice: averagePrice,
          body: normalizeBodyForQuiz(details.body),
          acidity: normalizeAcidityForQuiz(details.acidity),
          harmony: normalizeHarmonyForQuiz(details.harmony || details.harmonize),
        },
      }
    })

    const quizPriceOptions = createPriceOptionsFromPrices(
      bottles.map((bottle) => bottle._values.rawPrice),
    )

    const standardQuestionDefs = [
      {key: 'country', text: t('automaticQuestionCountry')},
      {key: 'region', text: t('automaticQuestionRegion')},
      {key: 'grape', text: t('automaticQuestionGrape')},
      {key: 'vintage', text: t('automaticQuestionVintage')},
      {key: 'price', text: t('automaticQuestionPrice')},
    ]
    const openAiQuestionDefs = [
      ...standardQuestionDefs,
      {key: 'body', text: t('automaticQuestionBody')},
      {key: 'acidity', text: t('automaticQuestionAcidity')},
      {key: 'harmony', text: t('automaticQuestionHarmony')},
      {key: 'notable', text: t('automaticQuestionNotable')},
    ]

    const isSingleBottleQuiz = bottles.length === 1
    const questionDefs = (mode === 'openai' ? openAiQuestionDefs : standardQuestionDefs).filter(
      (question) => {
        const values = bottles.map((bottle) => bottle._values[question.key]).filter(Boolean)
        if (values.length !== bottles.length) return false

        const uniqueValuesCount = new Set(values).size
        if (uniqueValuesCount >= 2) return true
        if (isSingleBottleQuiz) return true

        return mode === 'standard' && ['country', 'price'].includes(question.key)
      },
    )

    const templateByKey = {
      country: TEMPLATE_QUESTIONS[0]?.options || [],
      region: TEMPLATE_QUESTIONS[1]?.options || [],
      grape: TEMPLATE_QUESTIONS[2]?.options || [],
      vintage: TEMPLATE_QUESTIONS[3]?.options || [],
      notable: Object.values(notableOptions),
      price: quizPriceOptions,
      body: OPENAI_TEMPLATE_OPTIONS.body,
      acidity: OPENAI_TEMPLATE_OPTIONS.acidity,
      harmony: OPENAI_TEMPLATE_OPTIONS.harmony,
    }
    const effectiveQuestions = questionDefs.map((def) => {
      const extractedValues = [...new Set(bottles.map((b) => b._values[def.key]).filter(Boolean))]
      const templateOptions = templateByKey[def.key] || []
      const options = [
        ...extractedValues,
        ...templateOptions.filter((option) => !extractedValues.includes(option)),
      ].slice(
        0,
        Math.max(MIN_AUTO_QUIZ_OPTIONS, templateOptions.length || 0, extractedValues.length),
      )
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
      const payload = buildAutoQuizPayload(uploadedImages, quizTemplateMode)
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
    quizPreview = buildAutoQuizPayload(uploadedImages, quizTemplateMode)
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
                <div className={styles.autoPreviewModalHeaderMain}>
                  <h3>{t('automaticPreviewTitle')}</h3>
                  <div className={styles.autoPreviewModalTemplateRow}>
                    <span className={styles.autoModeQuizTemplateLabel}>
                      {t('automaticQuizTemplateLabel')}
                    </span>
                    <div className={styles.autoModeQuizTemplateSegmented}>
                      <button
                        type="button"
                        className={`${styles.autoModeQuizTemplateButton} ${
                          quizTemplateMode === 'standard'
                            ? styles.autoModeQuizTemplateButtonActive
                            : ''
                        }`}
                        onClick={() => setQuizTemplateMode('standard')}>
                        {t('automaticQuizTemplateStandard')}
                      </button>
                      <button
                        type="button"
                        className={`${styles.autoModeQuizTemplateButton} ${
                          quizTemplateMode === 'openai'
                            ? styles.autoModeQuizTemplateButtonActive
                            : ''
                        }`}
                        onClick={() => setQuizTemplateMode('openai')}>
                        {t('automaticQuizTemplateOpenAi')}
                      </button>
                    </div>
                  </div>
                </div>
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
          <div className={styles.autoModeMetricsGrid}>
            <div className={styles.autoModeMetricCard}>
              <span className={styles.autoModeMetricLabel}>
                {t('automaticMetricBottlesLabel')}
              </span>
              <strong className={styles.autoModeMetricValue}>{uploadedImages.length}</strong>
              <span className={styles.autoModeMetricMeta}>
                {t('automaticMetricBottlesMeta', {
                  analyzed: analyzedImagesCount,
                  total: uploadedImages.length,
                })}
              </span>
            </div>
            <div className={styles.autoModeMetricCard}>
              <span className={styles.autoModeMetricLabel}>
                {t('automaticMetricTokensLabel')}
              </span>
              <strong className={styles.autoModeMetricValue}>{autoTastingTokenTotals.total}</strong>
              <span className={styles.autoModeMetricMeta}>
                {t('automaticMetricTokensMeta', {
                  vision: autoTastingTokenTotals.vision,
                  web: autoTastingTokenTotals.web,
                })}
              </span>
            </div>
            <div className={styles.autoModeMetricCard}>
              <span className={styles.autoModeMetricLabel}>
                {t('automaticMetricCostLabel')}
              </span>
              <strong className={styles.autoModeMetricValue}>
                {formatEstimatedCost(autoTastingTokenTotals.cost) || '—'}
              </strong>
              <span className={styles.autoModeMetricMeta}>
                {uploadedImages.length > 0
                  ? t('automaticMetricCostMeta', {
                      average:
                        formatEstimatedCost(autoTastingTokenTotals.cost / uploadedImages.length) ||
                        '—',
                    })
                  : t('automaticMetricCostMetaEmpty')}
              </span>
            </div>
          </div>
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
                const appellation = details?.quiz_appellation || details?.appellation || null
                const wineType = mapWineTypeLabel(details?.type)
                const primaryGrape =
                  (Array.isArray(details?.grapes) && details.grapes.length > 0
                    ? details.grapes[0]
                    : null) || null
                const priceBand = details?.quiz_price_band || details?.price_band || null
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
                  image.recognized_payload?.provider === 'openai_vision' ||
                  String(image.recognized_payload?.extractor || '').startsWith('openai-vision')
                const hasMatch = !!image.recognized_payload?.catalog_match?.matched
                const hasCatalogSync = !!image.recognized_payload?.catalog_sync?.synced
                const hasCatalogPresence = hasMatch || hasCatalogSync
                const hasWebEnrichment = !!image.recognized_payload?.web_enrichment?.applied
                const requiresReview = !!image.recognized_payload?.review?.required
                const isVerified = !!image.recognized_payload?.verification?.verified
                const tokenUsage = getTokenUsageFromImage(image)
                const isVerifyingThis = verifyingImageId === image.id
                const isWebSearchingThis = webSearchingImageId === image.id
                const resolvedQuizValues = getResolvedQuizValuesForImage(image, quizPreview)
                const webSources = Array.isArray(image.recognized_payload?.web_enrichment?.sources)
                  ? image.recognized_payload.web_enrichment.sources.filter(Boolean)
                  : []
                const bottleSpecItems = [
                  primaryGrape
                    ? {label: t('automaticQuestionGrape'), value: primaryGrape}
                    : null,
                  details.price_min != null && details.price_max != null
                    ? {
                        label: t('automaticPriceLabel'),
                        value: `${details.price_min}${t('automaticMinPriceLabel')} - ${details.price_max}${t('automaticMaxPriceLabel')}${details.currency ? ` ${details.currency}` : ' EUR'}`,
                      }
                    : details.average_price != null || details.price != null
                      ? {
                          label: t('automaticPriceLabel'),
                          value: `${details.average_price ?? details.price}${details.currency ? ` ${details.currency}` : ' EUR'}`,
                        }
                      : null,
                  details.average_price != null || details.price != null
                    ? {
                        label: t('automaticMediumPriceLabel'),
                        value: normalizePriceAnswer(details.average_price ?? details.price),
                      }
                    : null,
                  priceBand ? {label: t('automaticQuestionPrice'), value: priceBand} : null,
                  details.body ? {label: t('automaticQuestionBody'), value: details.body} : null,
                  details.acidity
                    ? {label: t('automaticQuestionAcidity'), value: details.acidity}
                    : null,
                  details.harmony || details.harmonize
                    ? {
                        label: t('automaticQuestionHarmony'),
                        value: details.harmony || details.harmonize,
                      }
                    : null,
                ].filter(Boolean)

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
                            ref={(node) => bindPreviewImageNode(node, image.id)}
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
                            {hasCatalogPresence && (
                              <span className={styles.autoModeFeatureBadge}>
                                <Icon
                                  src="/icons/match.svg"
                                  size={16}
                                  className={styles.autoModeFeatureIcon}
                                />
                                {t('automaticCatalogBadge')}
                              </span>
                            )}
                            {hasWebEnrichment && !hasCatalogPresence && (
                              <span className={styles.autoModeFeatureBadge}>
                                <Icon
                                  src="/icons/vision.svg"
                                  size={16}
                                  className={styles.autoModeFeatureIcon}
                                />
                                {t('automaticWebBadge')}
                              </span>
                            )}
                            {requiresReview && (
                              <span className={styles.autoModeFeatureBadge}>
                                <Icon
                                  name="checkWarning"
                                  size={16}
                                  className={styles.autoModeFeatureIcon}
                                />
                                {t('automaticReviewBadge')}
                              </span>
                            )}
                            {isVerified && (
                              <span className={styles.autoModeFeatureBadge}>
                                <Icon
                                  src="/icons/match.svg"
                                  size={16}
                                  className={styles.autoModeFeatureIcon}
                                />
                                {t('automaticVerifiedBadge')}
                              </span>
                            )}
                            {hasCatalogSync && (
                              <span className={styles.autoModeFeatureBadge}>
                                <Icon
                                  src="/icons/bottles.svg"
                                  size={16}
                                  className={styles.autoModeFeatureIcon}
                                />
                                {t('automaticCatalogSyncedBadge')}
                              </span>
                            )}
                            {confidencePercent != null && (
                              <span className={styles.autoBottleConfidencePill}>
                                {confidencePercent}%
                              </span>
                            )}
                            {tokenUsage.total > 0 && (
                              <span className={styles.autoBottleMetaPill}>
                                {t('automaticTokenUsageValue', {
                                  total: tokenUsage.total,
                                  vision: tokenUsage.vision,
                                  web: tokenUsage.web,
                                })}
                              </span>
                            )}
                            {tokenUsage.cost > 0 && (
                              <span className={styles.autoBottleMetaPill}>
                                {t('automaticEstimatedCostValue', {
                                  cost: formatEstimatedCost(tokenUsage.cost),
                                })}
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
                              {appellation ? (
                                <span className={styles.autoBottleFactDot}>•</span>
                              ) : null}
                              {appellation ? <span>{appellation}</span> : null}
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
                                {details.price_min != null && details.price_max != null
                                  ? ` · ${t('automaticPriceLabel')}: ${details.price_min}${t('automaticMinPriceLabel')} -${details.price_max}${t('automaticMaxPriceLabel')}${details.currency ? ` ${details.currency}` : ' EUR'}`
                                  : details.average_price != null || details.price != null
                                    ? ` · ${t('automaticPriceLabel')}: ${details.average_price ?? details.price}${details.currency ? ` ${details.currency}` : ' EUR'}`
                                    : ''}
                                {details.average_price != null || details.price != null
                                  ? ` · ${t('automaticMediumPriceLabel')}: ${normalizePriceAnswer(details.average_price ?? details.price)}${details.currency ? `` : ''}`
                                  : ''}
                                {priceBand ? ` · ${t('automaticQuestionPrice')}: ${priceBand}` : ''}
                                {details.body ||
                                details.acidity ||
                                details.harmony ||
                                details.harmonize
                                  ? ` · ${[
                                      details.body,
                                      details.acidity,
                                      details.harmony || details.harmonize,
                                    ]
                                      .filter(Boolean)
                                      .join(' / ')}`
                                  : ''}
                              </p>
                              {bottleSpecItems.length > 0 ? (
                                <div className={styles.autoBottleSectionBlock}>
                                  <p className={styles.autoBottleSectionTitle}>
                                    {t('automaticBottleSpecsLabel')}
                                  </p>
                                  <div className={styles.autoBottleSpecGrid}>
                                    {bottleSpecItems.map((item) => (
                                      <div
                                        key={`${image.id}-${item.label}`}
                                        className={styles.autoBottleSpecCard}>
                                        <span className={styles.autoBottleSpecLabel}>
                                          {item.label}
                                        </span>
                                        <strong className={styles.autoBottleSpecValue}>
                                          {item.value}
                                        </strong>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                              <p className={styles.autoBottleCardDataRow}>
                                <span className={styles.autoBottleDataLabel}>
                                  <Icon src="/icons/match.svg" size={16} />
                                  <strong>{t('automaticQuizResolvedLabel')}:</strong>
                                </span>{' '}
                                {(resolvedQuizValues.length > 0
                                  ? resolvedQuizValues
                                  : [
                                      details.country || '-',
                                      inferRegion(details, image) || '-',
                                      primaryGrape,
                                      image.recognized_vintage || '-',
                                    ]
                                ).join(' | ')}
                              </p>
                              {details.why_notable ? (
                                <div className={styles.autoBottleNarrativeCard}>
                                  <p className={styles.autoBottleCardDataRow}>
                                    <span className={styles.autoBottleDataLabel}>
                                      <Icon src="/icons/match.svg" size={16} />
                                      <strong>{t('automaticQuestionNotable')}:</strong>
                                    </span>
                                  </p>
                                  <p className={styles.autoBottleNarrativeText}>
                                    {details.why_notable}
                                  </p>
                                </div>
                              ) : null}
                              {details.short_description ? (
                                <div className={styles.autoBottleNarrativeCard}>
                                  <p className={styles.autoBottleCardDataRow}>
                                    <span className={styles.autoBottleDataLabel}>
                                      <Icon src="/icons/vision.svg" size={16} />
                                      <strong>{t('automaticWebSummaryLabel')}:</strong>
                                    </span>
                                  </p>
                                  <p className={styles.autoBottleNarrativeText}>
                                    {details.short_description}
                                  </p>
                                </div>
                              ) : null}
                              {webSources.length > 0 ? (
                                <details className={styles.autoBottleAccordion}>
                                  <summary className={styles.autoBottleAccordionSummary}>
                                    <Icon src="/icons/vision.svg" size={16} />
                                    <strong>{t('automaticWebSourcesLabel')}:</strong>
                                  </summary>
                                  <div className={styles.autoBottleAccordionBody}>
                                    {webSources.map((source) => (
                                      <a
                                        key={`${image.id}-${source}`}
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
                        disabled={
                          isAnalyzingAll ||
                          !!analyzingImageId ||
                          !!deletingImageId ||
                          !!verifyingImageId ||
                          !!webSearchingImageId
                        }
                        onClick={() => handleAnalyzeImage(image.id)}>
                        <Icon src="/icons/vision.svg" size={18} className="btn-icon" />
                        {isAnalyzingThis
                          ? t('automaticAnalyzingSingle')
                          : hasRecognitionData
                            ? t('automaticAnalyzeAgainAction')
                            : t('automaticAnalyzeAction')}
                      </button>
                      {hasRecognitionData ? (
                        <button
                          type="button"
                          className="btn btn-small neutral"
                          disabled={
                            !!deletingImageId ||
                            !!analyzingImageId ||
                            isAnalyzingAll ||
                            !!verifyingImageId ||
                            !!webSearchingImageId
                          }
                          onClick={() => handleWebSearchImage(image.id)}>
                          {isWebSearchingThis
                            ? t('automaticWebSearchingAction')
                            : t('automaticWebSearchAction')}
                        </button>
                      ) : null}
                      {hasRecognitionData ? (
                        <button
                          type="button"
                          className="btn btn-small neutral"
                          disabled={
                            !!deletingImageId ||
                            !!analyzingImageId ||
                            isAnalyzingAll ||
                            !!verifyingImageId ||
                            !!webSearchingImageId
                          }
                          onClick={() => handleVerifyImage(image.id)}>
                          {isVerifyingThis
                            ? t('automaticSavingCatalogAction')
                            : isVerified
                              ? t('automaticUpdateCatalogAction')
                              : t('automaticSaveCatalogAction')}
                        </button>
                      ) : null}
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
