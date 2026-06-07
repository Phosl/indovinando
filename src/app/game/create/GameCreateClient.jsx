'use client'

import Image from 'next/image'
import {Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClient} from '@/lib/supabaseClient'
import GameEditor from '@/components/game/GameEditor'
import Loader from '@/components/Loader'
import OnboardingModal from '@/components/game/OnboardingModal'
import {AutoTastingGamePreview} from '@/components/game'
import PageLayout from '@/components/PageLayout'
import Icon from '@/components/Icon'
import InfoModal from '@/components/InfoModal'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {useT} from '@/lib/i18n/useT'
import {normalizeAiScanCredits} from '@/lib/aiScanCredits'
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

const TEMPLATE_QUESTION_OPTIONS = {
  country: ['Italy', 'France', 'United States', 'Australia', 'Greece', 'Sweden', 'Spain'],
  region: ['Tuscany', 'Burgundy', 'Marche', 'Piedmont', 'Campania', 'Napa Valley', 'Umbria'],
  grape: [
    'Blend',
    'Sangiovese',
    'Pinot Noir',
    'Aglianico',
    'Nebbiolo',
    'Merlot',
    'Syrah',
    'Verdicchio',
  ],
  vintage: ['2017', '2018', '2019', '2020', '2021', '2022', '2023'],
  rating: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  price: ['5€', '10€', '20€', '30€', '40€', '60€', '80€'],
}

function getQuickTemplateQuestions(t, lang = 'it') {
  return [
    {
      id: 'quick-country',
      text: t('automaticQuestionCountry'),
      options: TEMPLATE_QUESTION_OPTIONS.country.map((value) => localizeCountryLabel(value, lang)),
    },
    {
      id: 'quick-region',
      text: t('automaticQuestionRegion'),
      options: TEMPLATE_QUESTION_OPTIONS.region.map((value) => localizeRegionLabel(value, lang)),
    },
    {
      id: 'quick-grape',
      text: t('automaticQuestionGrape'),
      options: TEMPLATE_QUESTION_OPTIONS.grape,
    },
    {
      id: 'quick-vintage',
      text: t('automaticQuestionVintage'),
      options: TEMPLATE_QUESTION_OPTIONS.vintage,
    },
    {
      id: 'quick-rating',
      text: t('automaticQuestionRating'),
      kind: 'rating',
      isNeutral: true,
      options: TEMPLATE_QUESTION_OPTIONS.rating,
    },
    {
      id: 'quick-price',
      text: t('automaticQuestionPrice'),
      options: TEMPLATE_QUESTION_OPTIONS.price,
    },
  ]
}

function normalizePriceAnswer(price, min = 5) {
  const numeric = Number(price)
  if (!Number.isFinite(numeric)) return null
  return `${Math.max(min, Math.round(numeric / 5) * 5)}€`
}

function getVintageBandLabel(year, lang = 'it') {
  const numeric = Number(year)
  if (!Number.isFinite(numeric)) return null
  if (numeric >= 2022) return '2022-2024'
  if (numeric >= 2019) return '2019-2021'
  if (numeric >= 2016) return '2016-2018'
  if (numeric >= 2012) return '2012-2015'
  return lang === 'en' ? '2011 or earlier' : '2011 o prima'
}

function inferVintageQuizValue(recognizedVintage, knownVintages = [], lang = 'it') {
  if (recognizedVintage) return String(recognizedVintage)

  const normalizedKnownVintages = (Array.isArray(knownVintages) ? knownVintages : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)

  if (!normalizedKnownVintages.length) return null

  const latestKnownVintage = normalizedKnownVintages[0]
  return getVintageBandLabel(latestKnownVintage, lang)
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

const OPENAI_TEMPLATE_OPTION_KEYS = {
  body: ['light', 'medium-light', 'medium', 'medium-full', 'full'],
  acidity: ['soft', 'fresh', 'medium', 'lively', 'high'],
  harmony: ['direct', 'balanced', 'elegant', 'structured', 'complex'],
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

function mapWineTypeLabel(value, lang = 'it') {
  const normalized = normalizeToken(value)
  if (!normalized) return null

  const mapped = Object.entries(WINE_TYPE_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => normalizeToken(alias) === normalized),
  )

  if (mapped) {
    const canonical = mapped[0]
    if (lang === 'en') {
      if (canonical === 'Bianco') return 'White'
      if (canonical === 'Rosso') return 'Red'
      if (canonical === 'Rose') return 'Rosé'
      if (canonical === 'Champagne') return 'Sparkling'
    }
    if (canonical === 'Rose') return lang === 'it' ? 'Rosato' : 'Rosé'
    if (canonical === 'Champagne') return lang === 'it' ? 'Spumante' : 'Sparkling'
    return canonical
  }
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

function localizeBodyLabel(canonical, lang = 'it') {
  const labels = {
    it: {
      light: 'Leggero',
      'medium-light': 'Medio-leggero',
      medium: 'Medio',
      'medium-full': 'Medio-pieno',
      full: 'Pieno',
    },
    en: {
      light: 'Light',
      'medium-light': 'Medium-light',
      medium: 'Medium',
      'medium-full': 'Medium-full',
      full: 'Full',
    },
  }
  return labels[lang]?.[canonical] || labels.it[canonical] || null
}

function localizeAcidityLabel(canonical, lang = 'it') {
  const labels = {
    it: {soft: 'Morbida', fresh: 'Fresca', medium: 'Media', lively: 'Vivace', high: 'Alta'},
    en: {soft: 'Soft', fresh: 'Fresh', medium: 'Medium', lively: 'Lively', high: 'High'},
  }
  return labels[lang]?.[canonical] || labels.it[canonical] || null
}

function localizeHarmonyLabel(canonical, lang = 'it') {
  const labels = {
    it: {
      direct: 'Diretto',
      balanced: 'Equilibrato',
      elegant: 'Elegante',
      structured: 'Strutturato',
      complex: 'Complesso',
    },
    en: {
      direct: 'Direct',
      balanced: 'Balanced',
      elegant: 'Elegant',
      structured: 'Structured',
      complex: 'Complex',
    },
  }
  return labels[lang]?.[canonical] || labels.it[canonical] || null
}

function normalizeBodyForQuiz(value, lang = 'it') {
  const normalized = normalizeToken(value)
  if (!normalized) return null
  if (normalized === 'light' || normalized === 'light-bodied')
    return localizeBodyLabel('light', lang)
  if (normalized === 'medium-light') return localizeBodyLabel('medium-light', lang)
  if (normalized === 'medium' || normalized === 'medium-bodied')
    return localizeBodyLabel('medium', lang)
  if (normalized === 'medium-full') return localizeBodyLabel('medium-full', lang)
  if (normalized === 'full' || normalized === 'full-bodied') return localizeBodyLabel('full', lang)
  return String(value).trim()
}

function normalizeAcidityForQuiz(value, lang = 'it') {
  const normalized = normalizeToken(value)
  if (!normalized) return null
  if (normalized === 'soft' || normalized === 'morbida') return localizeAcidityLabel('soft', lang)
  if (normalized === 'fresh' || normalized === 'low') return localizeAcidityLabel('fresh', lang)
  if (normalized === 'medium') return localizeAcidityLabel('medium', lang)
  if (normalized === 'lively' || normalized === 'vivace')
    return localizeAcidityLabel('lively', lang)
  if (normalized === 'high') return localizeAcidityLabel('high', lang)
  return String(value).trim()
}

function normalizeHarmonyForQuiz(value, lang = 'it') {
  const normalized = normalizeToken(value)
  if (!normalized) return null
  if (normalized === 'direct' || normalized === 'diretto')
    return localizeHarmonyLabel('direct', lang)
  if (normalized === 'balanced') return localizeHarmonyLabel('balanced', lang)
  if (normalized === 'elegant') return localizeHarmonyLabel('elegant', lang)
  if (normalized === 'structured') return localizeHarmonyLabel('structured', lang)
  if (normalized === 'complex' || normalized === 'complesso')
    return localizeHarmonyLabel('complex', lang)
  return String(value).trim()
}

function localizeCountryLabel(value, lang = 'it') {
  const normalized = normalizeToken(value)
  if (!normalized) return null
  const map = {
    italy: {it: 'Italia', en: 'Italy'},
    italia: {it: 'Italia', en: 'Italy'},
    france: {it: 'Francia', en: 'France'},
    francia: {it: 'Francia', en: 'France'},
    spain: {it: 'Spagna', en: 'Spain'},
    spagna: {it: 'Spagna', en: 'Spain'},
    germany: {it: 'Germania', en: 'Germany'},
    germania: {it: 'Germania', en: 'Germany'},
    portugal: {it: 'Portogallo', en: 'Portugal'},
    portogallo: {it: 'Portogallo', en: 'Portugal'},
    'united states': {it: 'Stati Uniti', en: 'United States'},
    usa: {it: 'USA', en: 'USA'},
    us: {it: 'USA', en: 'USA'},
    australia: {it: 'Australia', en: 'Australia'},
    greece: {it: 'Grecia', en: 'Greece'},
    grecia: {it: 'Grecia', en: 'Greece'},
    sweden: {it: 'Svezia', en: 'Sweden'},
    svezia: {it: 'Svezia', en: 'Sweden'},
  }
  return map[normalized]?.[lang] || String(value).trim()
}

function localizeRegionLabel(value, lang = 'it') {
  const normalized = normalizeToken(value)
  if (!normalized) return null
  const map = {
    sicily: {it: 'Sicilia', en: 'Sicily'},
    sicilia: {it: 'Sicilia', en: 'Sicily'},
    tuscany: {it: 'Toscana', en: 'Tuscany'},
    toscana: {it: 'Toscana', en: 'Tuscany'},
    piedmont: {it: 'Piemonte', en: 'Piedmont'},
    piemonte: {it: 'Piemonte', en: 'Piedmont'},
    burgundy: {it: 'Borgogna', en: 'Burgundy'},
    borgogna: {it: 'Borgogna', en: 'Burgundy'},
    marche: {it: 'Marche', en: 'Marche'},
    campania: {it: 'Campania', en: 'Campania'},
    umbria: {it: 'Umbria', en: 'Umbria'},
  }
  return map[normalized]?.[lang] || String(value).trim()
}

function localizeAppellationLabel(value, lang = 'it') {
  const normalized = normalizeToken(value)
  if (!normalized) return null
  if (normalized === 'denominazione di origine protetta') {
    return lang === 'en' ? 'Protected Designation of Origin' : 'Denominazione di Origine Protetta'
  }
  return String(value).trim()
}

function localizeNarrativeText(value, lang = 'it') {
  const text = String(value || '').trim()
  if (!text) return null

  const replacements =
    lang === 'it'
      ? [
          [
            /A collaboration between renowned (producers|winemakers)/gi,
            'Una collaborazione tra produttori rinomati',
          ],
          [
            /highlighting Etna'?s unique terroir/gi,
            "che valorizza l'unicità del terroir dell'Etna",
          ],
          [
            /highlighting Sicily'?s volcanic terroir/gi,
            'che valorizza il terroir vulcanico della Sicilia',
          ],
          [/focusing on Etna'?s unique terroir/gi, "incentrata sull'unicità del terroir dell'Etna"],
          [/A refined white wine/gi, 'Un raffinato vino bianco'],
          [/A Sicilian white wine/gi, 'Un vino bianco siciliano'],
          [/A crisp, mineral-driven white wine/gi, 'Un vino bianco teso e minerale'],
          [/white wine/gi, 'vino bianco'],
          [/showcasing the Carricante grape/gi, 'che esprime il vitigno Carricante'],
          [/made entirely from Carricante grapes/gi, 'ottenuto interamente da uve Carricante'],
          [/from Sicily'?s Etna region/gi, 'della zona etnea in Sicilia'],
          [/from the Etna region/gi, "della zona dell'Etna"],
          [/volcanic terroir/gi, 'terroir vulcanico'],
          [/with floral and citrus notes/gi, 'con note floreali e agrumate'],
          [/with mineral notes/gi, 'con note minerali'],
        ]
      : [
          [
            /Una collaborazione tra produttori rinomati/gi,
            'A collaboration between renowned producers',
          ],
          [/Un raffinato vino bianco/gi, 'A refined white wine'],
          [/Un vino bianco siciliano/gi, 'A Sicilian white wine'],
          [/Un vino bianco teso e minerale/gi, 'A crisp, mineral-driven white wine'],
          [/che esprime il vitigno Carricante/gi, 'showcasing the Carricante grape'],
          [/ottenuto interamente da uve Carricante/gi, 'made entirely from Carricante grapes'],
          [/terroir vulcanico/gi, 'volcanic terroir'],
          [/con note floreali e agrumate/gi, 'with floral and citrus notes'],
          [/con note minerali/gi, 'with mineral notes'],
        ]

  return replacements.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    text,
  )
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
    'vallée d aoste',
    'valle d aosta',
    'lombardia',
    'emilia romagna',
  ]

  const hit = regionHints.find((region) => source.includes(region))
  return hit || null
}

function getLocalizedNotableOptions(lang = 'it') {
  if (lang === 'en') {
    return {
      collaboration: 'For the collaboration between renowned producers',
      grape: 'For the grape variety or blend',
      territory: 'For the territory of origin',
      producer: 'For the winery style',
      appellation: 'For the denomination or appellation',
      profile: 'For the wine profile',
    }
  }

  return {
    collaboration: 'Per la collaborazione tra produttori noti',
    grape: "Per il vitigno o l'uvaggio",
    territory: 'Per il territorio di provenienza',
    producer: 'Per lo stile della cantina',
    appellation: "Per la denominazione o l'appellazione",
    profile: 'Per il profilo del vino',
  }
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

const AUTO_UPLOAD_COMPRESS_THRESHOLD_BYTES = 3.5 * 1024 * 1024

function getAutoUploadCompressionPolicy(fileSize) {
  if (fileSize >= 12 * 1024 * 1024) {
    return {
      maxDimension: 1500,
      qualitySteps: [0.72, 0.64],
      targetBytes: 1.6 * 1024 * 1024,
    }
  }

  if (fileSize >= 8 * 1024 * 1024) {
    return {
      maxDimension: 1700,
      qualitySteps: [0.78, 0.7],
      targetBytes: 2.1 * 1024 * 1024,
    }
  }

  if (fileSize >= 5 * 1024 * 1024) {
    return {
      maxDimension: 1900,
      qualitySteps: [0.82, 0.74],
      targetBytes: 2.5 * 1024 * 1024,
    }
  }

  return {
    maxDimension: 2200,
    qualitySteps: [0.84, 0.78],
    targetBytes: 3 * 1024 * 1024,
  }
}

async function loadImageElementFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new window.Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('image decode failed'))
    }
    image.src = objectUrl
  })
}

async function renderCompressedImageBlob(image, {maxDimension, quality}) {
  const width = Number(image.naturalWidth || image.width || 0)
  const height = Number(image.naturalHeight || image.height || 0)
  if (!width || !height) return null

  const longestSide = Math.max(width, height)
  const scale = longestSide > maxDimension ? maxDimension / longestSide : 1
  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d', {alpha: false})
  if (!ctx) return null

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight)

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality)
  })
}

async function optimizeAutoTastingUploadFile(file) {
  if (!(file instanceof File)) return file

  const mimeType = String(file.type || '').toLowerCase()
  const isRasterConvertible =
    mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/webp'

  if (!isRasterConvertible || file.size <= AUTO_UPLOAD_COMPRESS_THRESHOLD_BYTES) {
    return file
  }

  try {
    const policy = getAutoUploadCompressionPolicy(file.size)
    const image = await loadImageElementFromFile(file)
    let optimizedBlob = null

    for (const quality of policy.qualitySteps) {
      const candidate = await renderCompressedImageBlob(image, {
        maxDimension: policy.maxDimension,
        quality,
      })
      if (!candidate) continue
      optimizedBlob = candidate
      if (candidate.size <= policy.targetBytes) break
    }

    if (!optimizedBlob) return file
    if (optimizedBlob.size >= file.size * 0.92) return file

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'bottle'
    return new File([optimizedBlob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified || Date.now(),
    })
  } catch {
    return file
  }
}

function getTokenUsageFromImage(image, previewWebUsage = null) {
  const visionUsage = image?.recognized_payload?.openai_payload?.usage || null
  const webMeta = image?.recognized_payload?.web_enrichment || null
  const persistedWebUsage =
    webMeta?.restored_from_catalog && !webMeta?.applied ? null : webMeta?.usage || null
  const webUsage = previewWebUsage || persistedWebUsage

  const visionTotal = Number(visionUsage?.total_tokens || 0)
  const webTotal = Number(webUsage?.total_tokens || 0)
  const visionInput = Number(visionUsage?.input_tokens || 0)
  const visionOutput = Number(visionUsage?.output_tokens || 0)
  const webInput = Number(webUsage?.input_tokens || 0)
  const webOutput = Number(webUsage?.output_tokens || 0)
  const estimatedCost =
    ((Number.isFinite(visionInput) ? visionInput : 0) / 1000) * VISION_INPUT_COST_PER_1K_TOKENS +
    ((Number.isFinite(visionOutput) ? visionOutput : 0) / 1000) * VISION_OUTPUT_COST_PER_1K_TOKENS +
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

function getQuizValueForImageByKey(image, key, lang = 'it') {
  const details = image?.recognized_payload?.catalog_details || {}
  const inferredRegion = inferRegion(details, image)
  const grapes = Array.isArray(details.grapes) ? details.grapes.filter(Boolean) : []
  const mainGrape = grapes[0] || null
  const vintageValue = inferVintageQuizValue(
    image?.recognized_vintage,
    details?.known_vintages,
    lang,
  )
  const averagePrice = details?.average_price ?? details?.price ?? null

  switch (key) {
    case 'country':
      return localizeCountryLabel(details.country, lang) || null
    case 'region':
      return localizeRegionLabel(inferredRegion || details.region, lang) || null
    case 'grape':
      return mainGrape
    case 'vintage':
      return vintageValue
    case 'price':
      return averagePrice != null ? normalizePriceAnswer(averagePrice) : null
    case 'body':
      return normalizeBodyForQuiz(details.body, lang)
    case 'acidity':
      return normalizeAcidityForQuiz(details.acidity, lang)
    case 'harmony':
      return normalizeHarmonyForQuiz(details.harmony || details.harmonize, lang)
    case 'notable':
      return normalizeNotableForQuiz(
        String(details.why_notable || details.short_description || '')
          .trim()
          .replace(/\s+/g, ' '),
        getLocalizedNotableOptions(lang),
      )
    default:
      return null
  }
}

function getResolvedQuizValuesForImage(image, preview, lang = 'it') {
  const bottles = Array.isArray(preview?.bottles) ? preview.bottles : []
  const questions = Array.isArray(preview?.questions) ? preview.questions : []
  if (!bottles.length || !questions.length) return []

  const directValues = questions
    .map((question) => {
      if (!question?._key) return null
      return getQuizValueForImageByKey(image, question._key, lang)
    })
    .filter(Boolean)
  if (directValues.length > 0) return directValues

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
    const answerIndex = Number.isInteger(matchedBottle?.answers?.[idx])
      ? matchedBottle.answers[idx]
      : null
    if (answerIndex == null) return '-'
    return question?.options?.[answerIndex] ?? '-'
  })
}

function valuesEqualForDiff(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    const left = Array.isArray(a) ? a.filter(Boolean) : []
    const right = Array.isArray(b) ? b.filter(Boolean) : []
    return JSON.stringify(left) === JSON.stringify(right)
  }
  const left = a == null ? '' : String(a).trim()
  const right = b == null ? '' : String(b).trim()
  return left === right
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

function isTransientRequestError(error) {
  const errorMessage = String(error?.message || '').toLowerCase()
  return (
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('abort')
  )
}

async function postJsonWithRetry(url, payload, {timeoutMs = 30000, retries = 2} = {}) {
  let lastError = null

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    let timeoutId
    try {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      const result = await response.json().catch(() => null)
      return {response, result}
    } catch (error) {
      lastError = error
      if (!isTransientRequestError(error) || attempt === retries) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 350))
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  throw lastError || new Error('request failed')
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

function AutoToast({toast, onClose, closeLabel}) {
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => {
      onClose()
    }, toast.duration || 3200)
    return () => window.clearTimeout(timer)
  }, [onClose, toast])

  if (!toast) return null

  return (
    <div className={styles.autoToastViewport} aria-live="polite">
      <div
        className={`${styles.autoToast} ${
          toast.tone === 'success'
            ? styles.autoToastSuccess
            : toast.tone === 'info'
              ? styles.autoToastInfo
              : styles.autoToastError
        }`}>
        <span className={styles.autoToastMessage}>{toast.message}</span>
        <button
          type="button"
          className={styles.autoToastClose}
          onClick={onClose}
          aria-label={closeLabel}>
          <Icon name="removeSmall" size={16} />
        </button>
      </div>
    </div>
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
          <Image
            src="/game-options-quick.svg"
            alt=""
            aria-hidden="true"
            className={styles.modeCardBgImage}
            width={260}
            height={260}
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
          <Image
            src="/game-options-custom.svg"
            alt=""
            aria-hidden="true"
            className={styles.modeCardBgImage}
            width={260}
            height={260}
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
              <Icon name="plusFat" size={24} className="btn-icon" />
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

function AutomaticModePlaceholder({onBack, userId, initialAiScanCredits}) {
  const router = useRouter()
  const t = useT('gameCreate')
  const {lang} = useLanguage()
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
  const [webSearchReview, setWebSearchReview] = useState(null)
  const [lastWebSearchReview, setLastWebSearchReview] = useState(null)
  const [isApplyingWebDiff, setIsApplyingWebDiff] = useState(false)
  const [webPreviewUsageByImageId, setWebPreviewUsageByImageId] = useState({})
  const [quizTemplateMode, setQuizTemplateMode] = useState('standard')
  const [isLeavingSession, setIsLeavingSession] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [toast, setToast] = useState(null)
  const [uploadedImages, setUploadedImages] = useState([])
  const [previewLoadProgress, setPreviewLoadProgress] = useState({loaded: 0, total: 0})
  const [sessionImageIds, setSessionImageIds] = useState([])
  const [aiScanCredits, setAiScanCredits] = useState(() =>
    normalizeAiScanCredits(initialAiScanCredits || {}),
  )
  const [isCreditsInfoOpen, setIsCreditsInfoOpen] = useState(false)
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
    if (!uploadError) return
    setToast({
      message: uploadError,
      tone: 'error',
      duration: 4200,
    })
  }, [uploadError])

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
        const usage = getTokenUsageFromImage(image, webPreviewUsageByImageId[image.id] || null)
        acc.vision += usage.vision
        acc.web += usage.web
        acc.total += usage.total
        acc.cost += usage.cost
        return acc
      },
      {vision: 0, web: 0, total: 0, cost: 0},
    )
  }, [uploadedImages, webPreviewUsageByImageId])

  const analyzedImagesCount = useMemo(
    () => uploadedImages.filter((image) => image.status === 'recognized').length,
    [uploadedImages],
  )

  const pendingAnalyzeCount = useMemo(
    () =>
      uploadedImages.filter((image) => ['processing', 'uploaded', 'failed'].includes(image.status))
        .length,
    [uploadedImages],
  )

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
  const [webSearchLoadingStep, setWebSearchLoadingStep] = useState(0)

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
    if (!canAnalyzeSingle) {
      setUploadError(t('automaticCreditsInsufficient'))
      return
    }
    setAnalyzingImageId(imageId)
    setUploadError('')
    setWebPreviewUsageByImageId((prev) => {
      if (!(imageId in prev)) return prev
      const next = {...prev}
      delete next[imageId]
      return next
    })
    try {
      const {response, result} = await postJsonWithRetry(
        '/api/auto-tasting/analyze',
        {imageId},
        {timeoutMs: 35000, retries: 3},
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
      if (result?.credits) setAiScanCredits(normalizeAiScanCredits(result.credits))

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
        setWebPreviewUsageByImageId((prev) => ({
          ...prev,
          [imageId]: previewUsage,
        }))
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
  }

  async function handleApplyWebSearchDiff() {
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
        prev.map((row) => (row.id === result.updated.id ? result.updated : row)),
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
  }

  async function handleAnalyzeAll() {
    if (isAnalyzingAll || analyzingImageId || webSearchingImageId) return
    const ids = sessionImageIdsRef.current
    if (!ids.length) return
    if (!canAnalyzeAll) {
      setUploadError(
        pendingAnalyzeCount > aiScanCredits.remaining
          ? t('automaticAnalyzeAllCreditsNeeded', {
              needed: String(pendingAnalyzeCount),
              remaining: String(aiScanCredits.remaining),
            })
          : t('automaticCreditsInsufficient'),
      )
      return
    }
    setIsAnalyzingAll(true)
    setUploadError('')
    try {
      const {response, result} = await postJsonWithRetry(
        '/api/auto-tasting/analyze',
        {analyzeAll: true, imageIds: ids},
        {timeoutMs: 60000, retries: 2},
      )
      if (!response.ok) {
        if (result?.credits) setAiScanCredits(normalizeAiScanCredits(result.credits))
        if (response.status === 402) {
          setUploadError(
            t('automaticAnalyzeAllCreditsNeeded', {
              needed: String(pendingAnalyzeCount),
              remaining: String(result?.credits?.remaining ?? aiScanCredits.remaining),
            }),
          )
          return
        }
        setUploadError(`${t('automaticAnalyzeError')} (${result?.error || 'analyze all'})`)
        return
      }
      if (result?.credits) setAiScanCredits(normalizeAiScanCredits(result.credits))
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
    const notableOptions = getLocalizedNotableOptions(lang)

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
        lang,
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
          country: localizeCountryLabel(details.country, lang),
          region: localizeRegionLabel(inferredRegion || details.region, lang),
          grape: mainGrape,
          vintage: vintageValue,
          notable: whyNotableValue,
          price: priceValue,
          rawPrice: averagePrice,
          body: normalizeBodyForQuiz(details.body, lang),
          acidity: normalizeAcidityForQuiz(details.acidity, lang),
          harmony: normalizeHarmonyForQuiz(details.harmony || details.harmonize, lang),
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
      country: localizedTemplateOptions.country,
      region: localizedTemplateOptions.region,
      grape: localizedTemplateOptions.grape,
      vintage: localizedTemplateOptions.vintage,
      notable: Object.values(notableOptions),
      price: quizPriceOptions,
      body: localizedTemplateOptions.body,
      acidity: localizedTemplateOptions.acidity,
      harmony: localizedTemplateOptions.harmony,
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
      name: `${t('automaticGameNamePrefix')} ${new Date().toLocaleDateString(
        lang === 'en' ? 'en-US' : 'it-IT',
      )}`,
      mode: 'create',
      status: 'draft',
      coverIndex: 0,
      questions: effectiveQuestions.map(({_key, text, options}) => ({_key, text, options})),
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
      <AutoToast toast={toast} onClose={() => setToast(null)} closeLabel={t('close')} />
      <InfoModal
        isOpen={isCreditsInfoOpen}
        onClose={() => setIsCreditsInfoOpen(false)}
        title={t('automaticCreditsInfoTitle')}>
        <p>{t('automaticCreditsInfoBody')}</p>
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
              {/* <button
                type="button"
                className="btn  btn-ai btn-with-icon-end"
                disabled={isUploading || isAnalyzingAll || !!analyzingImageId || isCreatingQuiz}
                onClick={handleAnalyzeAll}>
                <Icon src="/icons/vision.svg" size={36} className="btn-icon-big" />
                {isAnalyzingAll ? t('automaticAnalyzingAll') : t('automaticAnalyzeAllAction')}
              </button> */}
              <button
                type="button"
                className="btn  tertiary"
                disabled={
                  isUploading ||
                  isAnalyzingAll ||
                  !!analyzingImageId ||
                  uploadedImages.length === 0 ||
                  !quizPreview
                }
                onClick={() => setIsPreviewOpen(true)}>
                <Icon src="/icons/quiz.svg" size={36} className="btn-icon-big" />
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

        {webSearchReview ? (
          <div
            className={styles.autoDiffSheetOverlay}
            onClick={() => {
              if (!isApplyingWebDiff) {
                setLastWebSearchReview(webSearchReview)
                setWebSearchReview(null)
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
                  onClick={() => {
                    setLastWebSearchReview(webSearchReview)
                    setWebSearchReview(null)
                  }}
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
                      className={`${styles.autoDiffItem} ${
                        checked ? styles.autoDiffItemSelected : ''
                      }`}
                      disabled={isApplyingWebDiff}
                      onClick={() =>
                        setWebSearchReview((prev) => {
                          if (!prev) return prev
                          const nextSelected = checked
                            ? prev.selectedFields.filter((field) => field !== diff.key)
                            : [...prev.selectedFields, diff.key]
                          return {...prev, selectedFields: nextSelected}
                        })
                      }>
                      <div className={styles.autoDiffItemContent}>
                        <strong>{diff.label}</strong>
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
                <button
                  type="button"
                  className="btn  neutral"
                  onClick={() => {
                    setLastWebSearchReview(webSearchReview)
                    setWebSearchReview(null)
                  }}
                  disabled={isApplyingWebDiff}>
                  {t('skip')}
                </button>
                <button
                  type="button"
                  className="btn success"
                  disabled={isApplyingWebDiff || webSearchReview.selectedFields.length === 0}
                  onClick={handleApplyWebSearchDiff}>
                  {isApplyingWebDiff
                    ? t('automaticUpdatingAction')
                    : t('automaticApplyWebDiffAction')}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <section className={styles.autoModeEmptyState}>
          <strong>{t('automaticBottlesTitle')}</strong>
          <div className={styles.autoModeMetricsGrid}>
            <div className={`${styles.autoModeMetricCard} ${styles.autoModeMetricCardCredits}`}>
              <span className={styles.autoModeMetricLabel}>
                <div
                  className={styles.autoModeMetricLabelIconWrapper + ' ' + styles.metricCardToken}>
                  <Icon src="/icons/token.svg" size={36} className={styles.autoModeMetricIcon} />
                </div>
                {t('automaticMetricCreditsLabel')}
              </span>
              <strong className={styles.autoModeMetricValue}>{aiScanCredits.remaining}</strong>
              <span className={styles.autoModeMetricMeta}>
                {t('automaticMetricCreditsMeta', {
                  used: String(aiScanCredits.used),
                  total: String(aiScanCredits.available),
                })}
              </span>
            </div>
            <div className={`${styles.autoModeMetricCard} ${styles.autoModeMetricCardBottles}`}>
              <span className={styles.autoModeMetricLabel}>
                <div
                  className={styles.autoModeMetricLabelIconWrapper + ' ' + styles.metricCardBottle}>
                  <Icon src="/icons/bottle.svg" size={36} className={styles.autoModeMetricIcon} />
                </div>
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
            <div className={`${styles.autoModeMetricCard} ${styles.autoModeMetricCardTokens}`}>
              <span className={styles.autoModeMetricLabel}>
                <div
                  className={styles.autoModeMetricLabelIconWrapper + ' ' + styles.metricCardToken}>
                  <Icon src="/icons/token.svg" size={36} className={styles.autoModeMetricIcon} />
                </div>
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
            <div className={`${styles.autoModeMetricCard} ${styles.autoModeMetricCardCost}`}>
              <span className={styles.autoModeMetricLabel}>
                <div
                  className={styles.autoModeMetricLabelIconWrapper + ' ' + styles.metricCardCost}>
                  <Icon src="/icons/dollar.svg" size={36} className={styles.autoModeMetricIcon} />
                </div>
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
          {uploadedImages.length === 0 ? (
            <p className={styles.autoModeEmptyCopy}>{t('automaticBottlesEmpty')}</p>
          ) : (
            <ul className={styles.autoModeUploadedList}>
              {uploadedImages.map((image) => {
                const details = image.recognized_payload?.catalog_details || {}
                const country = localizeCountryLabel(details?.country, lang)
                const region = details
                  ? localizeRegionLabel(inferRegion(details, image) || details?.region, lang) ||
                    null
                  : null
                const appellation = localizeAppellationLabel(
                  details?.quiz_appellation || details?.appellation,
                  lang,
                )
                const wineType = mapWineTypeLabel(details?.type, lang)
                const primaryGrape =
                  (Array.isArray(details?.grapes) && details.grapes.length > 0
                    ? details.grapes[0]
                    : null) || null
                const priceBand = details?.quiz_price_band || details?.price_band || null
                const recognizedTitle = image.recognized_name || image.original_filename || '-'
                const recognizedSubtitle = [image.recognized_producer, image.recognized_vintage]
                  .filter(Boolean)
                  .join(' | ')
                const isProcessingThis = image.status === 'processing'
                const confidencePercent = toConfidencePercent(image.recognition_confidence)
                // const countryCode = getCountryCode(country)
                const countryFlag = getCountryFlag(country)
                const isAnalyzingThis = analyzingImageId === image.id
                const hasCatalogDetails = Object.keys(details).length > 0
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
                const webEnrichmentMeta = image.recognized_payload?.web_enrichment || {}
                const hasWebEnrichment = !!webEnrichmentMeta?.applied
                const hasWebSources =
                  Array.isArray(webEnrichmentMeta?.sources) && webEnrichmentMeta.sources.length > 0
                const hasWebNarrative = !!details?.why_notable || !!details?.short_description
                const hasWebRestored = !!webEnrichmentMeta?.restored_from_catalog
                const hasRestoredWebData = hasWebRestored && !hasWebEnrichment
                const hasWebEvidence =
                  hasWebEnrichment || hasWebSources || hasWebNarrative || hasWebRestored
                const requiresReview = !!image.recognized_payload?.review?.required
                const isVerified = !!image.recognized_payload?.verification?.verified
                const webSearchError = image.recognized_payload?.web_enrichment?.error || null
                const webSearchSkippedReason =
                  image.recognized_payload?.web_enrichment?.skipped &&
                  image.recognized_payload?.web_enrichment?.reason
                    ? image.recognized_payload.web_enrichment.reason
                    : null
                const tokenUsage = getTokenUsageFromImage(
                  image,
                  webPreviewUsageByImageId[image.id] || null,
                )
                const isVerifyingThis = verifyingImageId === image.id
                const isWebSearchingThis = webSearchingImageId === image.id
                const resolvedQuizValues = getResolvedQuizValuesForImage(image, quizPreview, lang)
                const resolvedQuizDisplayValues =
                  resolvedQuizValues.length > 0
                    ? resolvedQuizValues
                    : [
                        details.country || '-',
                        inferRegion(details, image) || '-',
                        primaryGrape,
                        image.recognized_vintage || '-',
                      ].filter(Boolean)
                const webSources = hasWebSources ? webEnrichmentMeta.sources.filter(Boolean) : []
                const localizedWhyNotable = localizeNarrativeText(details?.why_notable, lang)
                const localizedShortDescription = localizeNarrativeText(
                  details?.short_description,
                  lang,
                )
                const webStatusMessage = isWebSearchingThis
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
                const bottleSpecItems = [
                  primaryGrape ? {label: t('automaticQuestionGrape'), value: primaryGrape} : null,
                  details.price_min != null && details.price_max != null
                    ? {
                        label:
                          t('automaticPriceLabel') +
                          (details.currency ? ` ${details.currency}` : ' EUR'),
                        value: `${details.price_min} - ${details.price_max}`,
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
                  details.body
                    ? {
                        label: t('automaticQuestionBody'),
                        value: normalizeBodyForQuiz(details.body, lang),
                      }
                    : null,
                  details.acidity
                    ? {
                        label: t('automaticQuestionAcidity'),
                        value: normalizeAcidityForQuiz(details.acidity, lang),
                      }
                    : null,
                  details.harmony || details.harmonize
                    ? {
                        label: t('automaticQuestionHarmony'),
                        value: normalizeHarmonyForQuiz(details.harmony || details.harmonize, lang),
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
                          {deletingImageId === image.id ? (
                            <span
                              className={`${styles.autoDeleteState} ${styles.autoBottleDeleteState}`}>
                              {t('automaticDeleting')}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className={`btn danger-negative btn-circle btn-with-icon-end ${styles.autoBottleDeleteButton}`}
                              disabled={!!deletingImageId || !!analyzingImageId || isAnalyzingAll}
                              aria-label={`${t('automaticDeleteAction')} ${image.original_filename || image.storage_path}`}
                              onClick={() => handleDeleteImage(image.id)}>
                              <Icon src="/icons/bucket.svg" size={24} className="btn-icon-big" />
                            </button>
                          )}
                          <Image
                            src={`/api/auto-tasting/image?id=${image.id}`}
                            alt={image.original_filename || image.storage_path}
                            className={styles.autoBottleCardPreview}
                            fill
                            unoptimized
                            sizes="(max-width: 520px) 100vw, 360px"
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
                            {hasWebEnrichment && (
                              <span className={styles.autoModeFeatureBadge}>
                                <Icon
                                  src="/icons/vision.svg"
                                  size={16}
                                  className={styles.autoModeFeatureIcon}
                                />
                                {t('automaticWebBadge')}
                              </span>
                            )}
                            {!hasWebEnrichment && hasRestoredWebData && (
                              <span className={styles.autoModeFeatureBadge}>
                                <Icon
                                  src="/icons/share.svg"
                                  size={16}
                                  className={styles.autoModeFeatureIcon}
                                />
                                {t('automaticWebCatalogBadge')}
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
                                  src="/icons/redo.svg"
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
                            <div className={styles.autoBottleCardFacts}>
                              {[
                                country
                                  ? {
                                      value: country,
                                      withFlag: true,
                                    }
                                  : null,
                                region ? {value: region} : null,
                                appellation ? {value: appellation} : null,
                                wineType ? {value: wineType} : null,
                                primaryGrape ? {value: primaryGrape} : null,
                              ]
                                .filter(Boolean)
                                .map((item, index) => (
                                  <span
                                    key={`${image.id}-fact-${index}`}
                                    className={styles.autoBottleFactChip}>
                                    {item.withFlag && countryFlag ? (
                                      <span className={styles.autoBottleCountryBadge}>
                                        <span aria-hidden="true">{countryFlag}</span>
                                      </span>
                                    ) : null}
                                    <span>{item.value}</span>
                                  </span>
                                ))}
                            </div>
                          ) : null}

                          {hasCatalogDetails && (
                            <div className={styles.autoBottleCardDataBlock}>
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
                              <div className={styles.autoBottleSectionBlock}>
                                <p className={styles.autoBottleCardDataRow}>
                                  <span className={styles.autoBottleDataLabel}>
                                    <span className={styles.autoBottleDataLabelIconWrapper}>
                                      <Icon
                                        src="/icons/bolt.svg"
                                        size={20}
                                        className={styles.icon}
                                      />
                                    </span>
                                    <strong>{t('automaticQuizResolvedLabel')}:</strong>
                                  </span>
                                </p>
                                <div className={styles.autoBottleResolvedGrid}>
                                  {resolvedQuizDisplayValues.map((value, index) => (
                                    <span
                                      key={`${image.id}-resolved-${index}`}
                                      className={styles.autoBottleResolvedChip}>
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
                                </span>{' '}
                              </p>
                              <div className={styles.autoBottleQuickFacts}>
                                {[
                                  country,
                                  region,
                                  wineType,
                                  image.recognized_vintage,
                                  ...(Array.isArray(details.grapes) && details.grapes.length > 0
                                    ? details.grapes
                                    : []),
                                  details.price_min != null && details.price_max != null
                                    ? `${t('automaticPriceLabel')}: ${details.price_min}-${details.price_max}${details.currency ? ` ${details.currency}` : ' EUR'}`
                                    : details.average_price != null || details.price != null
                                      ? `${t('automaticPriceLabel')}: ${details.average_price ?? details.price}${details.currency ? ` ${details.currency}` : ' EUR'}`
                                      : null,
                                  details.average_price != null || details.price != null
                                    ? `${t('automaticMediumPriceLabel')}: ${normalizePriceAnswer(details.average_price ?? details.price)}`
                                    : null,
                                  priceBand ? `${t('automaticQuestionPrice')}: ${priceBand}` : null,
                                  details.body ||
                                  details.acidity ||
                                  details.harmony ||
                                  details.harmonize
                                    ? [
                                        normalizeBodyForQuiz(details.body, lang),
                                        normalizeAcidityForQuiz(details.acidity, lang),
                                        normalizeHarmonyForQuiz(
                                          details.harmony || details.harmonize,
                                          lang,
                                        ),
                                      ]
                                        .filter(Boolean)
                                        .join(' / ')
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .map((item, index) => (
                                    <span
                                      key={`${image.id}-quick-${index}`}
                                      className={styles.autoBottleQuickFactChip}>
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
                                  <p className={styles.autoBottleNarrativeText}>
                                    {localizedWhyNotable}
                                  </p>
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
                                  <p className={styles.autoBottleNarrativeText}>
                                    {localizedShortDescription}
                                  </p>
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
                              {(image.error_message || webSearchError) && (
                                <span
                                  className={`${styles.autoModeUploadedError} ${styles.autoBottleInlineStatus}`}>
                                  {webSearchError || image.error_message}
                                </span>
                              )}
                              {webStatusMessage && !webSearchError ? (
                                <span
                                  className={`${styles.autoModeUploadedError} ${styles.autoBottleInlineStatus}`}>
                                  {webStatusMessage}
                                </span>
                              ) : null}
                              {lastWebSearchReview?.imageId === image.id && !webSearchReview ? (
                                <button
                                  type="button"
                                  className={styles.autoBottleInlineLinkButton}
                                  onClick={() => setWebSearchReview(lastWebSearchReview)}>
                                  <Icon src="/icons/web.svg" size={16} />
                                  <span>{t('automaticWebDiffReopenAction')}</span>
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>

                    <div className={styles.autoBottleCardFooterActionBar}>
                      <button
                        type="button"
                        className="btn btn-ai btn-medium btn-with-icon-end"
                        disabled={
                          isAnalyzingAll ||
                          !!analyzingImageId ||
                          !!deletingImageId ||
                          !!verifyingImageId ||
                          !!webSearchingImageId ||
                          !canAnalyzeSingle
                        }
                        onClick={() => handleAnalyzeImage(image.id)}>
                        <Icon src="/icons/bolt.svg" size={36} className="btn-icon-big" />
                        {isAnalyzingThis
                          ? t('automaticAnalyzingSingle')
                          : hasRecognitionData
                            ? t('automaticAnalyzeAgainAction')
                            : t('automaticAnalyzeAction')}
                      </button>
                      <button
                        type="button"
                        className={styles.autoBottleInlineInfoButton}
                        onClick={() => setIsCreditsInfoOpen(true)}>
                        {t('automaticCreditsInfoAction')}
                      </button>
                      {hasRecognitionData ? (
                        <button
                          type="button"
                          className="btn quaternary btn-medium btn-with-icon-end"
                          disabled={
                            !!deletingImageId ||
                            !!analyzingImageId ||
                            isAnalyzingAll ||
                            !!verifyingImageId ||
                            !!webSearchingImageId ||
                            !canRunWebSearch ||
                            isProcessingThis
                          }
                          onClick={() => handleWebSearchImage(image.id)}>
                          <Icon src="/icons/web.svg" size={32} className="btn-icon-big" />
                          {isWebSearchingThis
                            ? t('automaticWebSearchingAction')
                            : t('automaticWebSearchAction')}
                        </button>
                      ) : null}
                    </div>

                    <div className={styles.autoBottleCardFooterActionBar}>
                      {hasRecognitionData ? (
                        <button
                          type="button"
                          className="btn success btn-medium btn-with-icon-end"
                          disabled={
                            !!deletingImageId ||
                            !!analyzingImageId ||
                            isAnalyzingAll ||
                            !!verifyingImageId ||
                            !!webSearchingImageId ||
                            isProcessingThis
                          }
                          onClick={() => handleVerifyImage(image.id)}>
                          <Icon
                            src={isVerified ? '/icons/redo.svg' : '/icons/save.svg'}
                            size={36}
                            className="btn-icon-big"
                          />
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

function CreateOnboardingModal({showOnboarding, onClose, onDisable, variant = 'modal'}) {
  if (!showOnboarding) return null
  return <OnboardingModal onClose={onClose} onDisable={onDisable} variant={variant} />
}

export default function GameCreateClient({
  initialShowOnboarding,
  userId,
  avatarOptions = [],
  initialAiScanCredits = null,
  mode = 'choose',
}) {
  const router = useRouter()
  const t = useT('gameCreate')
  const {lang} = useLanguage()
  const supabase = useMemo(() => createClient(), [])
  const [showOnboarding, setShowOnboarding] = useState(initialShowOnboarding)
  const quickTemplateQuestions = useMemo(() => getQuickTemplateQuestions(t, lang), [lang, t])

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
          variant="page"
        />
        {!showOnboarding ? (
          <ModePickerScreen onPick={handlePickMode} onOpenGuide={() => setShowOnboarding(true)} />
        ) : null}
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
        <AutomaticModePlaceholder
          onBack={handleBackToModePicker}
          userId={userId}
          initialAiScanCredits={initialAiScanCredits}
        />
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
              initialQuestions={quickTemplateQuestions}
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
