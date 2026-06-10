'use client'

import Image from 'next/image'
import {Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClient} from '@/lib/supabaseClient'
import GameEditor from '@/components/game/GameEditor'
import Loader from '@/components/Loader'
import OnboardingModal from '@/components/game/OnboardingModal'
import {AutoTastingGamePreview} from '@/components/game'
import {GameStepsBreadcrumbs} from '@/components/game'
import PageLayout from '@/components/PageLayout'
import Icon from '@/components/Icon'
import InfoModal from '@/components/InfoModal'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {useT} from '@/lib/i18n/useT'
import {normalizeAiScanCredits} from '@/lib/aiScanCredits'
import {scrollPageTop} from '@/lib/scrollPageTop'
import styles from './gameCreate.module.scss'

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

async function loadRenderableImageFromFile(file) {
  if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
    try {
      const bitmap = await window.createImageBitmap(file)
      if (bitmap?.width && bitmap?.height) return bitmap
    } catch {
      // Fallback to HTMLImageElement below.
    }
  }

  return loadImageElementFromFile(file)
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
  const isHeicFamily =
    mimeType === 'image/heic' ||
    mimeType === 'image/heif' ||
    mimeType === 'image/heic-sequence' ||
    mimeType === 'image/heif-sequence'

  if (!isRasterConvertible && !isHeicFamily) {
    return file
  }

  if (isHeicFamily) {
    return file
  }

  if (file.size <= 8 * 1024 * 1024) {
    return file
  }

  try {
    const policy = {
      maxDimension: 2400,
      qualitySteps: [0.9, 0.86],
      targetBytes: 7.5 * 1024 * 1024,
    }
    const image = await loadRenderableImageFromFile(file)
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
    if (optimizedBlob.size >= file.size * 0.98) return file

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'bottle'
    return new File([optimizedBlob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified || Date.now(),
    })
  } catch {
    return file
  }
}

function uniqueIds(values) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  ]
}

function isGenericBottleFilename(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  if (!normalized) return true
  return (
    /^image\.(jpe?g|png|webp|heic|heif)$/i.test(normalized) ||
    /^photo\.(jpe?g|png|webp|heic|heif)$/i.test(normalized) ||
    /^blob$/i.test(normalized)
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

function readStoredObject(storage, key) {
  if (!storage || !key) return null
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function writeStoredObject(storage, key, value) {
  if (!storage || !key) return
  storage.setItem(key, JSON.stringify(value || {}))
}

async function withClientTimeout(promise, timeoutMs, label = 'request') {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} timeout after ${timeoutMs}ms`)),
      timeoutMs,
    )
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timeoutId)
  }
}

function isTransientLoadError(error) {
  const message = String(error?.message || '').toLowerCase()
  return (
    message.includes('abort') ||
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('failed to fetch')
  )
}

function valuesEqualForDiff(left, right) {
  if (left == null && right == null) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    const leftArray = Array.isArray(left) ? left : [left]
    const rightArray = Array.isArray(right) ? right : [right]
    return JSON.stringify(leftArray) === JSON.stringify(rightArray)
  }
  if (typeof left === 'object' || typeof right === 'object') {
    return JSON.stringify(left || null) === JSON.stringify(right || null)
  }
  return String(left ?? '').trim() === String(right ?? '').trim()
}

async function postJsonWithRetry(url, body, {timeoutMs = 15000, retries = 0} = {}) {
  let lastError = null
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      const result = await response.json().catch(() => null)
      clearTimeout(timeoutId)
      return {response, result}
    } catch (error) {
      clearTimeout(timeoutId)
      lastError = error
      if (attempt === retries) throw error
    }
  }
  throw lastError || new Error('request failed')
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
  const previewUrlByImageIdRef = useRef(new Map())
  const originalPreviewFileByImageIdRef = useRef(new Map())
  const previewRecoveryAttemptedIdsRef = useRef(new Set())
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
  const [currentAnalyzeBatchCount, setCurrentAnalyzeBatchCount] = useState(0)
  const [currentAnalyzeBatchIndex, setCurrentAnalyzeBatchIndex] = useState(0)
  const [currentAnalyzeBatchTotal, setCurrentAnalyzeBatchTotal] = useState(0)
  const [isAutoAnalyzingAfterUpload, setIsAutoAnalyzingAfterUpload] = useState(false)
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
  const [uploadError, setUploadError] = useState('')
  const [toast, setToast] = useState(null)
  const [uploadedImages, setUploadedImages] = useState([])
  const [previewLoadProgress, setPreviewLoadProgress] = useState({loaded: 0, total: 0})
  const [sessionImageIds, setSessionImageIds] = useState([])
  const [failedPreviewIds, setFailedPreviewIds] = useState([])
  const [aiScanCredits, setAiScanCredits] = useState(() =>
    normalizeAiScanCredits(initialAiScanCredits || {}),
  )
  const [displayedAiCredits, setDisplayedAiCredits] = useState(() =>
    normalizeAiScanCredits(initialAiScanCredits || {}).remaining,
  )
  const [isCreditsSpendAnimating, setIsCreditsSpendAnimating] = useState(false)
  const [isCreditsInfoOpen, setIsCreditsInfoOpen] = useState(false)
  const creditsAnimationTimeoutRef = useRef(null)
  const creditsAnimationIntervalRef = useRef(null)

  const sessionIdsStorageKey = useMemo(
    () => (userId ? `auto_tasting_draft_image_ids:${userId}` : ''),
    [userId],
  )
  const draftStateStorageKey = useMemo(
    () => (userId ? `auto_tasting_draft_state:${userId}` : ''),
    [userId],
  )

  const persistSessionIds = useCallback(
    (ids) => {
      if (typeof window === 'undefined') return
      writeStoredIds(window.sessionStorage, sessionIdsStorageKey, ids)
      writeStoredIds(window.localStorage, sessionIdsStorageKey, ids)
    },
    [sessionIdsStorageKey],
  )

  const clearSessionIds = useCallback(() => {
    if (typeof window === 'undefined') return
    if (sessionIdsStorageKey) window.sessionStorage.removeItem(sessionIdsStorageKey)
    if (sessionIdsStorageKey) window.localStorage.removeItem(sessionIdsStorageKey)
    if (draftStateStorageKey) window.localStorage.removeItem(draftStateStorageKey)
  }, [draftStateStorageKey, sessionIdsStorageKey])

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

  const mergeImageRowWithPreview = useCallback((row, fallbackRow = null) => {
    const previewUrl =
      previewUrlByImageIdRef.current.get(row?.id) ||
      fallbackRow?.clientPreviewUrl ||
      row?.clientPreviewUrl ||
      null
    return previewUrl
      ? {...fallbackRow, ...row, clientPreviewUrl: previewUrl}
      : {...fallbackRow, ...row}
  }, [])

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
  }, [mergeImageRowWithPreview, supabase, t, userId])

  useEffect(() => {
    sessionImageIdsRef.current = sessionImageIds
  }, [sessionImageIds])

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

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return

    const storedSessionIds = readStoredIds(window.sessionStorage, sessionIdsStorageKey)
    const sessionIds =
      storedSessionIds.length > 0
        ? storedSessionIds
        : readStoredIds(window.localStorage, sessionIdsStorageKey)
    setSessionImageIds(sessionIds)
    if (storedSessionIds.length === 0 && sessionIds.length > 0) {
      writeStoredIds(window.sessionStorage, sessionIdsStorageKey, sessionIds)
    }

    const storedDraftState = readStoredObject(window.localStorage, draftStateStorageKey)
    if (storedDraftState) {
      const restoredStep = Number(storedDraftState.autoStep || 1)
      setAutoStep(restoredStep >= 2 && sessionIds.length > 0 ? Math.min(restoredStep, 3) : 1)
      setQuizTemplateMode(
        storedDraftState.quizTemplateMode === 'standard' ? 'standard' : 'openai',
      )
      setGeneratedQuizSignature(
        typeof storedDraftState.generatedQuizSignature === 'string'
          ? storedDraftState.generatedQuizSignature
          : '',
      )
    }
  }, [draftStateStorageKey, sessionIdsStorageKey, userId])

  useEffect(() => {
    if (!userId || typeof window === 'undefined' || !draftStateStorageKey) return
    writeStoredObject(window.localStorage, draftStateStorageKey, {
      autoStep,
      quizTemplateMode,
      generatedQuizSignature,
    })
  }, [autoStep, draftStateStorageKey, generatedQuizSignature, quizTemplateMode, userId])

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
      t('automaticAnalyzeLoadingStepDetails'),
      t('automaticAnalyzeLoadingStepTaste'),
    ],
    [t],
  )
  const [webSearchLoadingStep, setWebSearchLoadingStep] = useState(0)
  const [analyzeLoadingStep, setAnalyzeLoadingStep] = useState(0)
  const isAnalyzeOverlayVisible = isAnalyzingAll || !!analyzingImageId

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
                style={
                  {
                    '--credit-confetti-x': piece.x,
                    '--credit-confetti-delay': piece.delay,
                    '--credit-confetti-rotation': piece.rotation,
                  }
                }
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
      const averagePrice = details.average_price ?? details.price ?? ''
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
  const canReanalyzeAll =
    reanalyzableCount > 0 && aiScanCredits.remaining >= reanalyzableCount

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

  async function handleFilesUpload(fileList) {
    if (!userId || !fileList?.length) return

    let autoAnalyzeIds = []
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
          previewUrlByImageIdRef.current.set(metadataResult.image.id, previewUrl)
          originalPreviewFileByImageIdRef.current.set(metadataResult.image.id, file)
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
        if (createdIds.length > 1) {
          autoAnalyzeIds = createdIds
        }
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

    if (autoAnalyzeIds.length > 0) {
      if (aiScanCredits.remaining >= autoAnalyzeIds.length) {
        setIsAutoAnalyzingAfterUpload(true)
        await handleAnalyzeAll(autoAnalyzeIds, {autoTriggered: true})
      } else {
        setToast({
          message: t('automaticAutoAnalyzeInsufficientCredits'),
          tone: 'error',
          duration: 3600,
        })
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
      setFailedPreviewIds((prev) => prev.filter((id) => id !== imageId))
      revokePreviewUrl(imageId)
      originalPreviewFileByImageIdRef.current.delete(imageId)
      previewRecoveryAttemptedIdsRef.current.delete(imageId)
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
        {
          imageId,
          useWebEnrichment: true,
        },
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
      if (result?.credits) {
        const normalizedCredits = normalizeAiScanCredits(result.credits)
        setAiScanCredits(normalizedCredits)
        animateCreditsSpend(previousCreditsRemaining, normalizedCredits.remaining)
      }

      const updatedRows = Array.isArray(result?.updated) ? result.updated : []
      if (updatedRows.length > 0) {
        const map = Object.fromEntries(updatedRows.map((row) => [row.id, row]))
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
  }

  function handleDetailDraftChange(field, value) {
    setDetailDraft((prev) => ({
      ...(prev || {}),
      [field]: value,
    }))
  }

  async function handleSaveBottleDetail() {
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
  }

  async function handleAnalyzeAll(overrideIds = null, options = {}) {
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
    setUploadError('')
    const previousCreditsRemaining = aiScanCredits.remaining
    let finalCreditsRemaining = previousCreditsRemaining
    try {
      for (let index = 0; index < ids.length; index += 1) {
        const imageId = ids[index]
        setCurrentAnalyzeBatchIndex(index + 1)
        const {response, result} = await postJsonWithRetry(
          '/api/auto-tasting/analyze',
          {
            imageId,
            useWebEnrichment: true,
          },
          {timeoutMs: 35000, retries: 3},
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
      if (options.autoTriggered) {
        setIsAutoAnalyzingAfterUpload(false)
      }
    }
  }


  async function handleVerifyImage(imageId, options = {}) {
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
          handleCloseBottleDetail()
        }
      }
      loadUploadedImages().catch(() => null)
    } catch (error) {
      setUploadError(`${t('automaticVerifyError')} (${error?.message || 'unknown'})`)
    } finally {
      setVerifyingImageId('')
    }
  }

  async function handleAttemptExit() {
    const ids = sessionImageIdsRef.current
    if (!ids.length) {
      onBack?.()
      return
    }
    onBack?.()
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
        wineVintageId:
          image.recognized_payload?.catalog_sync?.vintage_id ||
          image.recognized_payload?.web_enrichment?.wine_vintage_id ||
          null,
        priceValue: averagePrice,
        priceMin: details.price_min ?? null,
        priceMax: details.price_max ?? null,
        priceCurrency: details.currency || null,
        priceBand: details.quiz_price_band || details.price_band || null,
        regionLabel: details.quiz_region || inferredRegion || details.region || null,
        appellationLabel: details.quiz_appellation || details.appellation || null,
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
      {key: 'country', text: t('automaticQuestionCountry'), forceInclude: true},
      {key: 'region', text: t('automaticQuestionRegion')},
      {key: 'grape', text: t('automaticQuestionGrape')},
      {key: 'vintage', text: t('automaticQuestionVintage')},
      {key: 'price', text: t('automaticQuestionPrice')},
    ]
    const openAiQuestionDefs = [
      {key: 'country', text: t('automaticQuestionCountry')},
      {key: 'region', text: t('automaticQuestionRegion')},
      {key: 'grape', text: t('automaticQuestionGrape')},
      {key: 'vintage', text: t('automaticQuestionVintage')},
      {key: 'body', text: t('automaticQuestionBody')},
      {key: 'acidity', text: t('automaticQuestionAcidity')},
      {key: 'harmony', text: t('automaticQuestionHarmony')},
      {key: 'notable', text: t('automaticQuestionNotable')},
      {key: 'price', text: t('automaticQuestionPrice')},
      {
        key: 'rating',
        text: t('automaticQuestionRating'),
        kind: 'rating',
        isNeutral: true,
        forceInclude: true,
      },
    ]

    const isSingleBottleQuiz = bottles.length === 1
    const questionDefs = (mode === 'openai' ? openAiQuestionDefs : standardQuestionDefs).filter(
      (question) => {
        if (question.forceInclude) return true
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
      rating: TEMPLATE_QUESTION_OPTIONS.rating,
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
      return {
        _key: def.key,
        text: def.text,
        options,
        kind: def.kind || null,
        isNeutral: def.isNeutral === true,
      }
    })

    const readyBottles = bottles.map((bottle) => {
      const answers = effectiveQuestions.map((question) => {
        if (!question._key || question.kind === 'rating' || question.isNeutral === true) return null
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
        wineVintageId: bottle.wineVintageId || null,
        priceValue: bottle.priceValue ?? null,
        priceMin: bottle.priceMin ?? null,
        priceMax: bottle.priceMax ?? null,
        priceCurrency: bottle.priceCurrency || null,
        priceBand: bottle.priceBand || null,
        regionLabel: bottle.regionLabel || null,
        appellationLabel: bottle.appellationLabel || null,
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
      questions: effectiveQuestions.map(({_key, text, options, kind, isNeutral}) => ({
        _key,
        text,
        options,
        kind,
        isNeutral,
      })),
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
    quizPreview = buildAutoQuizPayload(uploadedImages, quizTemplateMode)
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

  function handleTopBack() {
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
  }

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
    <PageLayout title={automaticPageTitle} onBack={handleTopBack} topBarActions={topBarCredits}>
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
        <div className={styles.autoPageAnalyzeOverlay}>
          <div className={styles.autoPageAnalyzePanel}>
            <div className={styles.autoBottleWebSearchSpinner} aria-hidden="true" />
            <strong>
              {analyzingImageId
                ? t('automaticAnalyzingSingle')
                : t('automaticAnalyzeBottleProgress', {
                    current: String(currentAnalyzeBatchIndex || 1),
                    total: String(currentAnalyzeBatchTotal || currentAnalyzeBatchCount || pendingAnalyzeCount),
                  })}
            </strong>
            <span>{analyzeLoadingMessages[analyzeLoadingStep]}</span>
            {isAnalyzingAll && currentAnalyzeBatchTotal > 1 ? (
              <small>
                {t('automaticAnalyzeBatchProgress', {
                  current: String(currentAnalyzeBatchIndex || 1),
                  total: String(currentAnalyzeBatchTotal),
                })}
              </small>
            ) : null}
            <div className={styles.autoPageAnalyzeProgressBar} aria-hidden="true">
              <span />
            </div>
            <small>{t('automaticAnalyzeOverlayHint')}</small>
            {isAutoAnalyzingAfterUpload ? (
              <small className={styles.autoPageAnalyzeAutoHint}>
                {t('automaticAnalyzeOverlayAutoHint')}
              </small>
            ) : null}
            <small className={styles.autoPageAnalyzePatience}>
              {t('automaticAnalyzeOverlayPatience')}
            </small>
          </div>
        </div>
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
          onChange={(event) => handleFilesUpload(event.target.files)}
        />

        {autoStep === 1 ? (
          <>
            <h1 className={styles.autoModeTitleCentered}>
              {uploadedImages.length > 0
                ? t('automaticStep1TitleWithPhotos')
                : t('automaticStep1Title')}
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
                {uploadedImages.length > 0
                  ? t('automaticNextPhotoTitle')
                  : t('automaticFirstPhotoTitle')}
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
                  <div key={image.id} className={styles.autoUploadTileFilled}>
                    <button
                      type="button"
                      className={`btn danger-negative btn-circle ${styles.autoUploadTileDelete}`}
                      onClick={() => handleDeleteImage(image.id)}
                      disabled={!!deletingImageId || !!analyzingImageId || isAnalyzingAll}
                      aria-label={t('automaticDeleteAction')}>
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
        ) : null}

        {autoStep === 2 && !selectedBottle ? (
          <>
            <h1 className={styles.autoModeTitleCentered}>{t('automaticReviewTitle')}</h1>
            <p className={styles.autoModeDescriptionCentered}>{t('automaticReviewDescription')}</p>

            <section className={styles.autoBottleSummaryList}>
              {uploadedImages.map((image, index) => {
                const completion = getBottleCompletionMeta(image)
                const {details, grapes, region, appellation, wineType} = getBottleCoreData(image)
                const previewFailed = failedPreviewIds.includes(image.id)
                const hasCatalogPresence =
                  !!image.recognized_payload?.catalog_match?.matched ||
                  !!image.recognized_payload?.catalog_sync?.synced
                const statusLabel = completion.isComplete
                  ? t('automaticBottleCompleteBadge')
                  : t('automaticBottleIncompleteBadge')

                return (
                  <button
                    key={image.id}
                    type="button"
                    className={styles.autoBottleSummaryCard}
                    onClick={() => handleOpenBottleDetail(image)}>
                    <div className={styles.autoBottleSummaryMedia}>
                      <Image
                        src={image.clientPreviewUrl || `/api/auto-tasting/image?id=${image.id}`}
                        alt={image.original_filename || image.storage_path}
                        fill
                        unoptimized
                        className={styles.autoBottleSummaryImage}
                        sizes="120px"
                        onError={() => {
                          handlePreviewImageError(image.id).catch(() => markPreviewError(image.id))
                        }}
                      />
                      {previewFailed ? (
                        <div className={styles.autoBottleSummaryFallback}>
                          <span>{t('automaticPreviewUnavailable')}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className={styles.autoBottleSummaryBody}>
                      <div className={styles.autoBottleSummaryHeader}>
                        <strong>{getBottleDisplayName(image, index)}</strong>
                        <div className={styles.autoBottleSummaryHeaderBadges}>
                          <span
                            className={`${styles.autoBottleStatusBadge} ${
                              completion.isComplete
                                ? styles.autoBottleStatusBadgeComplete
                                : styles.autoBottleStatusBadgeIncomplete
                            }`}>
                            <span
                              className={styles.autoBottleStatusBadgeChart}
                              style={{
                                background: `conic-gradient(var(--success) ${completion.percent * 3.6}deg, rgba(77, 49, 155, 0) 0deg)`,
                              }}>
                              <span className={styles.autoBottleStatusBadgeChartInner} />
                            </span>
                            <span>{completion.percent}%</span>
                          </span>
                          {hasCatalogPresence ? (
                            <span
                              className={`${styles.autoModeFeatureBadge} ${styles.autoModeFeatureBadgeIconOnly}`}
                              title={t('automaticCatalogBadge')}
                              aria-label={t('automaticCatalogBadge')}>
                              <Icon
                                src="/icons/match.svg"
                                size={16}
                                className={styles.autoModeFeatureIcon}
                              />
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className={styles.autoBottleSummaryMeta}>
                        {image.status === 'recognized'
                          ? [image.recognized_producer, image.recognized_vintage]
                              .filter(Boolean)
                              .join(' · ') || t('automaticBottlePendingLabel')
                          : t('automaticBottleAnalyzingLabel')}
                      </p>
                      <div className={styles.autoBottleSummaryFacts}>
                        {[details.country, region, appellation, wineType, grapes[0]]
                          .filter(Boolean)
                          .slice(0, 4)
                          .map((item) => (
                            <span
                              key={`${image.id}-${item}`}
                              className={styles.autoBottleSummaryFact}>
                              {item}
                            </span>
                          ))}
                      </div>
                    </div>
                  </button>
                )
              })}
            </section>

            <button
              type="button"
              className={styles.autoAddMoreBottlesCard}
              onClick={() => setAutoStep(1)}>
              <span className={styles.autoAddMoreBottlesIcon}>
                <Icon name="photo" size={22} />
              </span>
              <div className={styles.autoAddMoreBottlesCopy}>
                <strong>{t('automaticAddMoreBottlesTitle')}</strong>
                <span>{t('automaticAddMoreBottlesDescription')}</span>
              </div>
            </button>
          </>
        ) : null}

        {autoStep === 2 && selectedBottle ? (
          <>
            {(() => {
              const details = detailCore?.details || {}
              const region = detailCore?.region || ''
              const appellation = detailCore?.appellation || ''
              const wineType = detailCore?.wineType || ''
              const primaryGrape = detailCore?.grapes?.[0] || ''
              const hasCatalogDetails = !!(
                details.country ||
                region ||
                appellation ||
                primaryGrape ||
                wineType
              )
              const hasMatch = !!selectedBottle?.recognized_payload?.catalog_match?.matched
              const hasCatalogSync = !!selectedBottle?.recognized_payload?.catalog_sync?.synced
              const hasCatalogPresence = hasMatch || hasCatalogSync
              const shouldAllowReanalyze =
                selectedBottle.status !== 'recognized' ||
                (detailCompletion ? !detailCompletion.isComplete : true)
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
              const webSearchError =
                selectedBottle?.recognized_payload?.web_enrichment?.error || null
              const webSearchSkippedReason =
                selectedBottle?.recognized_payload?.web_enrichment?.skipped &&
                selectedBottle?.recognized_payload?.web_enrichment?.reason
                  ? selectedBottle.recognized_payload.web_enrichment.reason
                  : null
              const hasVision =
                selectedBottle?.recognized_payload?.provider === 'openai_vision' ||
                String(selectedBottle?.recognized_payload?.extractor || '').startsWith(
                  'openai-vision',
                )
              const localizedWhyNotable = localizeNarrativeText(details?.why_notable, lang)
              const localizedShortDescription = localizeNarrativeText(
                details?.short_description,
                lang,
              )
              const webSources = hasWebSources ? webEnrichmentMeta.sources.filter(Boolean) : []
              const priceBand = details.quiz_price_band || details.price_band || null
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
              const resolvedQuizDisplayValues = [
                details.country,
                region,
                appellation,
                wineType,
                primaryGrape,
              ].filter(Boolean)

              return (
                <section className={styles.autoBottleCard}>
                  <div className={styles.autoBottleCardBody}>
                    <div className={styles.autoBottleCardMediaCol}>
                      <div className={styles.autoBottleCardPreviewWrap}>
                        <Image
                          src={
                            selectedBottle.clientPreviewUrl ||
                            `/api/auto-tasting/image?id=${selectedBottle.id}`
                          }
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
                      </div>

                      <p className={styles.autoBottleFoundName}>
                        {getBottleDisplayName(
                          selectedBottle,
                          selectedBottleIndex >= 0 ? selectedBottleIndex : 0,
                        )}
                      </p>

                      {[
                        selectedBottle.recognized_producer,
                        selectedBottle.recognized_vintage,
                      ].filter(Boolean).length > 0 ? (
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
                              <span
                                key={`${selectedBottle.id}-detail-fact-${index}`}
                                className={styles.autoBottleFactChip}>
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
                                  <p className={styles.autoBottleSectionTitle}>
                                    {t('automaticBottleSpecsLabel')}
                                  </p>
                                  <div className={styles.autoBottleSpecGrid}>
                                    {bottleSpecItems.map((item) => (
                                      <div
                                        key={`${selectedBottle.id}-${item.label}`}
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
                                      key={`${selectedBottle.id}-resolved-${index}`}
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
                                </span>
                              </p>
                              <div className={styles.autoBottleQuickFacts}>
                                {[
                                  details.country,
                                  region,
                                  wineType,
                                  selectedBottle.recognized_vintage,
                                  ...(Array.isArray(details.grapes) && details.grapes.length > 0
                                    ? details.grapes
                                    : []),
                                  details.average_price != null || details.price != null
                                    ? `${t('automaticPriceLabel')}: ${details.average_price ?? details.price}${details.currency ? ` ${details.currency}` : ' EUR'}`
                                    : null,
                                  priceBand ? `${t('automaticQuestionPrice')}: ${priceBand}` : null,
                                ]
                                  .filter(Boolean)
                                  .map((item, index) => (
                                    <span
                                      key={`${selectedBottle.id}-quick-${index}`}
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
                                  <span className={styles.autoBottleBackLabelBadge}>
                                    {t('automaticBackLabelSoon')}
                                  </span>
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
                                <span
                                  className={`${styles.autoModeUploadedError} ${styles.autoBottleInlineStatus}`}>
                                  {webSearchError || selectedBottle.error_message}
                                </span>
                              )}
                              {webStatusMessage && !webSearchError ? (
                                <span
                                  className={`${styles.autoModeUploadedError} ${styles.autoBottleInlineStatus}`}>
                                  {webStatusMessage}
                                </span>
                              ) : null}
                              {lastWebSearchReview?.imageId === selectedBottle.id &&
                              !webSearchReview ? (
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
                        <>
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
                                    onChange={(event) =>
                                      handleDetailDraftChange(field, event.target.value)
                                    }
                                  />
                                </label>
                              ))}
                              <label className={styles.autoBottleEditFieldFull}>
                                <span>{t('automaticQuestionNotable')}</span>
                                <textarea
                                  rows={3}
                                  value={detailDraft?.why_notable || ''}
                                  onChange={(event) =>
                                    handleDetailDraftChange('why_notable', event.target.value)
                                  }
                                />
                              </label>
                              <label className={styles.autoBottleEditFieldFull}>
                                <span>{t('automaticWebSummaryLabel')}</span>
                                <textarea
                                  rows={4}
                                  value={detailDraft?.short_description || ''}
                                  onChange={(event) =>
                                    handleDetailDraftChange('short_description', event.target.value)
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {!detailEditMode ? (
                    <div className={styles.autoBottleCardFooterActionBar}>
                      <button
                        type="button"
                        className="btn neutral"
                        onClick={handleCloseBottleDetail}>
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
                        onClick={() =>
                          handleVerifyImage(selectedBottle.id, {closeAfterSave: true})
                        }>
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
                        className="btn neutral"
                        onClick={() => {
                          setDetailEditMode(false)
                          syncDetailDraftFromImage(selectedBottle)
                        }}>
                        {t('automaticCancelAction')}
                      </button>
                      <button
                        type="button"
                        className="btn success"
                        disabled={isSavingDetail}
                        onClick={handleSaveBottleDetail}>
                        {isSavingDetail ? t('automaticSavingAction') : t('automaticSaveAction')}
                      </button>
                    </div>
                  )}
                </section>
              )
            })()}
          </>
        ) : null}
        {autoStep === 3 ? (
          <>
            <h1 className={styles.autoModeTitleCentered}>{t('automaticPreviewTitle')}</h1>
            <section className={styles.autoPreviewPageCard}>
              <div className={styles.autoPreviewPageHeader}>
                <div className={styles.autoPreviewModalTemplateRow}>
                  <span className={styles.autoModeQuizTemplateLabel}>
                    {t('automaticQuizTemplateLabel')}
                  </span>
                  <div className={styles.autoModeQuizTemplateSegmented}>
                    <button
                      type="button"
                      className={`${styles.autoModeQuizTemplateButton} ${
                        quizTemplateMode === 'openai' ? styles.autoModeQuizTemplateButtonActive : ''
                      }`}
                      onClick={() => setQuizTemplateMode('openai')}>
                      {t('automaticQuizTemplateOpenAi')}
                    </button>
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
                  </div>
                </div>
              </div>

              {quizPreview ? (
                <div className={styles.autoPreviewPageBody}>
                  <AutoTastingGamePreview
                    preview={quizPreview}
                    labels={{
                      sliderAria: t('automaticPreviewBottles'),
                      bottles: t('automaticPreviewBottles'),
                      bottle: t('automaticPreviewBottleLabel'),
                      of: t('automaticPreviewOf'),
                      question: t('automaticPreviewQuestionLabel'),
                      questionLabel: t('automaticPreviewQuestionLabel'),
                      producerMissing: t('automaticPreviewProducerMissing'),
                      yearMissing: t('automaticPreviewYearMissing'),
                      unnamedBottle: t('automaticPreviewUnnamedBottle'),
                      loadingBottle: t('automaticPreviewLoadingBottle'),
                    }}
                  />
                </div>
              ) : null}
            </section>
          </>
        ) : null}

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
                <button
                  type="button"
                  className="btn neutral"
                  onClick={() => setWebSearchReview(null)}>
                  {t('close')}
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

function CreateOnboardingModal({
  showOnboarding,
  onClose,
  onDisable,
  variant = 'modal',
  translationKey = 'onboarding',
}) {
  if (!showOnboarding) return null
  return (
    <OnboardingModal
      onClose={onClose}
      onDisable={onDisable}
      variant={variant}
      translationKey={translationKey}
    />
  )
}

const CREATE_ONBOARDING_STORAGE_KEY = 'hideCreateOnboarding'

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
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        initialShowOnboarding &&
        window.localStorage.getItem(CREATE_ONBOARDING_STORAGE_KEY) !== '1'
      )
    }
    return initialShowOnboarding
  })
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
    setShowOnboarding(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CREATE_ONBOARDING_STORAGE_KEY, '1')
    }

    if (!userId) {
      return
    }
    try {
      await supabase.from('profiles').update({onboarding: false}).eq('id', userId)
    } catch {}
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
          translationKey="automaticOnboarding"
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
