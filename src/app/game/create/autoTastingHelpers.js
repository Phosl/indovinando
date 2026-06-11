export const TEMPLATE_QUESTION_OPTIONS = {
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

const OPENAI_TEMPLATE_OPTION_KEYS = {
  body: ['light', 'medium-light', 'medium', 'medium-full', 'full'],
  acidity: ['soft', 'fresh', 'medium', 'lively', 'high'],
  harmony: ['direct', 'balanced', 'elegant', 'structured', 'complex'],
}

const WINE_TYPE_ALIASES = {
  Bianco: ['white', 'bianco', 'blanc', 'blanco', 'weiss'],
  Rosso: ['red', 'rosso', 'rouge', 'tinto'],
  Rose: ['rose', 'rosee', 'rose wine', 'rosato', 'rosé'],
  Champagne: ['champagne', 'sparkling', 'spumante', 'prosecco', 'cava', 'franciacorta'],
}

export const MIN_AUTO_QUIZ_OPTIONS = 5
export const AUTO_TASTING_LIST_TIMEOUT_MS = 12000
export const AUTO_UPLOAD_COMPRESS_THRESHOLD_BYTES = 3.5 * 1024 * 1024
export {OPENAI_TEMPLATE_OPTION_KEYS}

export function getQuickTemplateQuestions(t, lang = 'it') {
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

export function normalizePriceAnswer(price, min = 5) {
  const numeric = Number(price)
  if (!Number.isFinite(numeric)) return null
  return `${Math.max(min, Math.round(numeric / 5) * 5)}€`
}

export function resolveRepresentativePrice(price, min, max) {
  const numericPrice = Number(price)
  const safePrice = Number.isFinite(numericPrice) ? numericPrice : null
  const numericMin = Number(min)
  const safeMin = Number.isFinite(numericMin) ? numericMin : null
  const numericMax = Number(max)
  const safeMax = Number.isFinite(numericMax) ? numericMax : null
  const hasRange = safeMin != null || safeMax != null

  if (!hasRange) return safePrice
  if (safePrice != null && safeMin != null && safeMax != null) {
    if (safePrice >= safeMin && safePrice <= safeMax) return safePrice
  }
  if (safeMin != null && safeMax != null) {
    return Number(((safeMin + safeMax) / 2).toFixed(2))
  }
  return safeMin ?? safeMax ?? safePrice
}

export function getVintageBandLabel(year, lang = 'it') {
  const numeric = Number(year)
  if (!Number.isFinite(numeric)) return null
  if (numeric >= 2022) return '2022-2024'
  if (numeric >= 2019) return '2019-2021'
  if (numeric >= 2016) return '2016-2018'
  if (numeric >= 2012) return '2012-2015'
  return lang === 'en' ? '2011 or earlier' : '2011 o prima'
}

export function inferVintageQuizValue(recognizedVintage, knownVintages = [], lang = 'it') {
  if (recognizedVintage) return String(recognizedVintage)
  const normalizedKnownVintages = (Array.isArray(knownVintages) ? knownVintages : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)
  if (!normalizedKnownVintages.length) return null
  return getVintageBandLabel(normalizedKnownVintages[0], lang)
}

export function createPriceOptionsFromPrices(prices, min = 5) {
  const normalizedPrices = prices.map((price) => Number(price)).filter(Number.isFinite)
  if (!normalizedPrices.length) return ['5€', '10€', '20€', '30€', '40€']
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

export function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function mapWineTypeLabel(value, lang = 'it') {
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

export function localizeBodyLabel(canonical, lang = 'it') {
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

export function localizeAcidityLabel(canonical, lang = 'it') {
  const labels = {
    it: {soft: 'Morbida', fresh: 'Fresca', medium: 'Media', lively: 'Vivace', high: 'Alta'},
    en: {soft: 'Soft', fresh: 'Fresh', medium: 'Medium', lively: 'Lively', high: 'High'},
  }
  return labels[lang]?.[canonical] || labels.it[canonical] || null
}

export function localizeHarmonyLabel(canonical, lang = 'it') {
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

export function normalizeBodyForQuiz(value, lang = 'it') {
  const normalized = normalizeToken(value)
  if (!normalized) return null
  if (normalized === 'light' || normalized === 'light-bodied') return localizeBodyLabel('light', lang)
  if (normalized === 'medium-light') return localizeBodyLabel('medium-light', lang)
  if (normalized === 'medium' || normalized === 'medium-bodied') return localizeBodyLabel('medium', lang)
  if (normalized === 'medium-full') return localizeBodyLabel('medium-full', lang)
  if (normalized === 'full' || normalized === 'full-bodied') return localizeBodyLabel('full', lang)
  return String(value).trim()
}

export function normalizeAcidityForQuiz(value, lang = 'it') {
  const normalized = normalizeToken(value)
  if (!normalized) return null
  if (normalized === 'soft' || normalized === 'morbida') return localizeAcidityLabel('soft', lang)
  if (normalized === 'fresh' || normalized === 'low') return localizeAcidityLabel('fresh', lang)
  if (normalized === 'medium') return localizeAcidityLabel('medium', lang)
  if (normalized === 'lively' || normalized === 'vivace') return localizeAcidityLabel('lively', lang)
  if (normalized === 'high') return localizeAcidityLabel('high', lang)
  return String(value).trim()
}

export function normalizeHarmonyForQuiz(value, lang = 'it') {
  const normalized = normalizeToken(value)
  if (!normalized) return null
  if (normalized === 'direct' || normalized === 'diretto') return localizeHarmonyLabel('direct', lang)
  if (normalized === 'balanced') return localizeHarmonyLabel('balanced', lang)
  if (normalized === 'elegant') return localizeHarmonyLabel('elegant', lang)
  if (normalized === 'structured') return localizeHarmonyLabel('structured', lang)
  if (normalized === 'complex' || normalized === 'complesso') return localizeHarmonyLabel('complex', lang)
  return String(value).trim()
}

export function localizeCountryLabel(value, lang = 'it') {
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

export function localizeRegionLabel(value, lang = 'it') {
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

export function localizeAppellationLabel(value, lang = 'it') {
  const normalized = normalizeToken(value)
  if (!normalized) return null
  if (normalized === 'denominazione di origine protetta') {
    return lang === 'en' ? 'Protected Designation of Origin' : 'Denominazione di Origine Protetta'
  }
  return String(value).trim()
}

export function localizeNarrativeText(value, lang = 'it') {
  const text = String(value || '').trim()
  if (!text) return null
  const replacements =
    lang === 'it'
      ? [
          [/A collaboration between renowned (producers|winemakers)/gi, 'Una collaborazione tra produttori rinomati'],
          [/highlighting Etna'?s unique terroir/gi, "che valorizza l'unicità del terroir dell'Etna"],
          [/highlighting Sicily'?s volcanic terroir/gi, 'che valorizza il terroir vulcanico della Sicilia'],
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
          [/Una collaborazione tra produttori rinomati/gi, 'A collaboration between renowned producers'],
          [/Un raffinato vino bianco/gi, 'A refined white wine'],
          [/Un vino bianco siciliano/gi, 'A Sicilian white wine'],
          [/Un vino bianco teso e minerale/gi, 'A crisp, mineral-driven white wine'],
          [/che esprime il vitigno Carricante/gi, 'showcasing the Carricante grape'],
          [/ottenuto interamente da uve Carricante/gi, 'made entirely from Carricante grapes'],
          [/terroir vulcanico/gi, 'volcanic terroir'],
          [/con note floreali e agrumate/gi, 'with floral and citrus notes'],
          [/con note minerali/gi, 'with mineral notes'],
        ]
  return replacements.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text)
}

export function inferRegion(details, image) {
  const quizRegion = String(details?.quiz_region || '').trim()
  if (quizRegion) return quizRegion
  const direct = String(details?.region || '').trim()
  if (direct) return direct
  const source = [details?.appellation, image?.recognized_name, image?.recognized_payload?.text_preview]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  if (!source) return null
  const regionHints = ['sicilia', 'toscana', 'piemonte', 'veneto', 'umbria', 'marche', 'campania', 'puglia', 'lazio', 'abruzzo', 'sardegna', 'friuli', 'trentino', 'liguria', 'calabria', 'molise', 'basilicata', 'vallée d aoste', 'valle d aosta', 'lombardia', 'emilia romagna']
  return regionHints.find((region) => source.includes(region)) || null
}

export function getLocalizedNotableOptions(lang = 'it') {
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

export function normalizeNotableForQuiz(value, notableOptions) {
  const normalized = normalizeToken(value)
  if (!normalized) return null
  if (normalized.includes('collaboration') || normalized.includes('collaborazione') || normalized.includes('renowned producers') || normalized.includes('renowned winemakers') || normalized.includes('gaja') || normalized.includes('graci')) return notableOptions.collaboration
  if (normalized.includes('etna') || normalized.includes('territory') || normalized.includes('terroir') || normalized.includes('volcanic') || normalized.includes('territorio') || normalized.includes('vulcan')) return notableOptions.territory
  if (normalized.includes('grape') || normalized.includes('grapes') || normalized.includes('vitigno') || normalized.includes('uvaggio') || normalized.includes('carricante') || normalized.includes('nebbiolo') || normalized.includes('sangiovese')) return notableOptions.grape
  if (normalized.includes('producer') || normalized.includes('cantina') || normalized.includes('winemaking') || normalized.includes('style') || normalized.includes('stile')) return notableOptions.producer
  if (normalized.includes('appellation') || normalized.includes('denominazione') || normalized.includes('dop') || normalized.includes('doc') || normalized.includes('docg')) return notableOptions.appellation
  return notableOptions.profile
}

export function formatBytes(value) {
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const scaled = bytes / 1024 ** index
  const digits = index === 0 ? 0 : scaled < 10 ? 1 : 0
  return `${scaled.toFixed(digits)} ${units[index]}`
}

export function getAutoUploadCompressionPolicy(fileSize) {
  if (fileSize >= 12 * 1024 * 1024) return {maxDimension: 1500, qualitySteps: [0.72, 0.64], targetBytes: 1.6 * 1024 * 1024}
  if (fileSize >= 8 * 1024 * 1024) return {maxDimension: 1700, qualitySteps: [0.78, 0.7], targetBytes: 2.1 * 1024 * 1024}
  if (fileSize >= 5 * 1024 * 1024) return {maxDimension: 1900, qualitySteps: [0.82, 0.74], targetBytes: 2.5 * 1024 * 1024}
  return {maxDimension: 2200, qualitySteps: [0.84, 0.78], targetBytes: 3 * 1024 * 1024}
}

export async function loadImageElementFromFile(file) {
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

export async function loadRenderableImageFromFile(file) {
  if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
    try {
      const bitmap = await window.createImageBitmap(file)
      if (bitmap?.width && bitmap?.height) return bitmap
    } catch {}
  }
  return loadImageElementFromFile(file)
}

export async function renderCompressedImageBlob(image, {maxDimension, quality}) {
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

export async function optimizeAutoTastingUploadFile(file) {
  if (!(file instanceof File)) return file
  const mimeType = String(file.type || '').toLowerCase()
  const isRasterConvertible = mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/webp'
  const isHeicFamily = mimeType === 'image/heic' || mimeType === 'image/heif' || mimeType === 'image/heic-sequence' || mimeType === 'image/heif-sequence'
  if (!isRasterConvertible && !isHeicFamily) return file
  if (isHeicFamily || file.size <= 8 * 1024 * 1024) return file
  try {
    const policy = {maxDimension: 2400, qualitySteps: [0.9, 0.86], targetBytes: 7.5 * 1024 * 1024}
    const image = await loadRenderableImageFromFile(file)
    let optimizedBlob = null
    for (const quality of policy.qualitySteps) {
      const candidate = await renderCompressedImageBlob(image, {maxDimension: policy.maxDimension, quality})
      if (!candidate) continue
      optimizedBlob = candidate
      if (candidate.size <= policy.targetBytes) break
    }
    if (!optimizedBlob || optimizedBlob.size >= file.size * 0.98) return file
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'bottle'
    return new File([optimizedBlob], `${baseName}.jpg`, {type: 'image/jpeg', lastModified: file.lastModified || Date.now()})
  } catch {
    return file
  }
}

export function uniqueIds(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))]
}

export function isGenericBottleFilename(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return true
  return /^image\.(jpe?g|png|webp|heic|heif)$/i.test(normalized) || /^photo\.(jpe?g|png|webp|heic|heif)$/i.test(normalized) || /^blob$/i.test(normalized)
}

export function readStoredIds(storage, key) {
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

export function writeStoredIds(storage, key, ids) {
  if (!storage || !key) return
  storage.setItem(key, JSON.stringify(uniqueIds(ids)))
}

export function readStoredObject(storage, key) {
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

export function writeStoredObject(storage, key, value) {
  if (!storage || !key) return
  storage.setItem(key, JSON.stringify(value || {}))
}

export async function withClientTimeout(promise, timeoutMs, label = 'request') {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timeoutId)
  }
}

export function isTransientLoadError(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('abort') || message.includes('timeout') || message.includes('network') || message.includes('failed to fetch')
}

export function valuesEqualForDiff(left, right) {
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

export async function postJsonWithRetry(url, body, {timeoutMs = 15000, retries = 0} = {}) {
  let attempt = 0
  let lastError = null
  while (attempt <= retries) {
    attempt += 1
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
      return {response, result}
    } catch (error) {
      lastError = error
      if (attempt > retries) break
    } finally {
      clearTimeout(timeoutId)
    }
  }
  throw lastError || new Error(`${url} failed`)
}
