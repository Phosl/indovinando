import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {normalizeAiScanCredits} from '@/lib/aiScanCredits'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini'
const OPENAI_WEB_ENRICHMENT_MODEL = process.env.OPENAI_WEB_ENRICHMENT_MODEL || OPENAI_VISION_MODEL
const OPENAI_WEB_ENRICHMENT_ENABLED = process.env.OPENAI_WEB_ENRICHMENT_ENABLED === 'true'
const OPENAI_RECOGNITION_PROMPT =
  'Analizza questa foto di una bottiglia di vino o della sua etichetta. Estrai solo le informazioni visibili o altamente probabili. Non inventare dati. Se un dato non e leggibile, usa null. Presta particolare attenzione a vitigno, uvaggio, grape variety, varietal e blend: se i vitigni sono leggibili, inseriscili tutti in grapes nell ordine in cui compaiono. Se non sono leggibili, usa un array vuoto. Rispondi esclusivamente in JSON valido secondo lo schema richiesto.'
const OPENAI_REVIEW_CONFIDENCE_THRESHOLD = 0.72
const WINE_NOISE_TERMS = new Set([
  'doc',
  'docg',
  'igt',
  'd.o.c.',
  'd.o.c.g.',
  'denominazione',
  'denominatione',
  'indicazione',
  'geografica',
  'origine',
  'origin',
  'protetta',
  'protected',
  'controllata',
  'garantita',
  'imbottigliato',
  'bottled',
  'product',
  'prodotto',
  'prodotto',
  'of',
  'italia',
  'italy',
  'sicilia',
  'sicily',
  'toscana',
  'piemonte',
  'veneto',
  'france',
  'spain',
  'ml',
  'cl',
  'vol',
  'contains',
  'solfiti',
  'sulfites',
])

const REGION_HINTS = [
  {canonical: 'Sicilia', aliases: ['sicilia', 'sicily', 'etna']},
  {canonical: 'Piemonte', aliases: ['piemonte', 'piedmont']},
  {canonical: 'Toscana', aliases: ['toscana', 'tuscany']},
  {canonical: 'Veneto', aliases: ['veneto']},
  {canonical: 'Lombardia', aliases: ['lombardia', 'lombardy']},
  {canonical: 'Trentino-Alto Adige', aliases: ['trentino', 'alto adige', 'sudtirol']},
  {canonical: 'Friuli-Venezia Giulia', aliases: ['friuli']},
  {canonical: 'Abruzzo', aliases: ['abruzzo']},
  {canonical: 'Puglia', aliases: ['puglia', 'apulia']},
  {canonical: 'Campania', aliases: ['campania']},
  {canonical: 'Marche', aliases: ['marche']},
  {canonical: 'Umbria', aliases: ['umbria']},
  {canonical: 'Sardegna', aliases: ['sardegna', 'sardinia']},
  {canonical: 'Lazio', aliases: ['lazio']},
  {canonical: 'Borgogna', aliases: ['borgogna', 'bourgogne', 'burgundy']},
  {canonical: 'Champagne', aliases: ['champagne']},
]

const GRAPE_ALIASES = [
  ['Nebbiolo', ['nebbiolo']],
  ['Sangiovese', ['sangiovese']],
  ['Montepulciano', ['montepulciano']],
  ['Aglianico', ['aglianico']],
  ['Barbera', ['barbera']],
  ['Dolcetto', ['dolcetto']],
  ['Primitivo', ['primitivo']],
  ['Negroamaro', ['negroamaro']],
  ["Nero d'Avola", ['nero d avola', "nero d'avola"]],
  ['Frappato', ['frappato']],
  ['Fiano', ['fiano']],
  ['Greco', ['greco']],
  ['Falanghina', ['falanghina']],
  ['Trebbiano', ['trebbiano']],
  ['Garganega', ['garganega']],
  ['Corvina', ['corvina']],
  ['Rondinella', ['rondinella']],
  ['Molinara', ['molinara']],
  ['Glera', ['glera', 'prosecco']],
  ['Vermentino', ['vermentino']],
  ['Verdicchio', ['verdicchio']],
  ['Cannonau', ['cannonau', 'grenache']],
  ['Carricante', ['carricante']],
  ['Catarratto', ['catarratto']],
  ['Inzolia', ['inzolia', 'insolia']],
  ['Grillo', ['grillo']],
  ['Chardonnay', ['chardonnay']],
  ['Sauvignon Blanc', ['sauvignon blanc', 'sauvignon']],
  ['Pinot Noir', ['pinot noir', 'pinot nero']],
  ['Pinot Grigio', ['pinot grigio', 'pinot gris']],
  ['Riesling', ['riesling']],
  ['Syrah', ['syrah', 'shiraz']],
  ['Merlot', ['merlot']],
  ['Cabernet Sauvignon', ['cabernet sauvignon']],
  ['Cabernet Franc', ['cabernet franc']],
  ['Petit Verdot', ['petit verdot']],
  ['Tempranillo', ['tempranillo']],
  ['Garnacha', ['garnacha']],
  ['Carignano', ['carignano', 'carignan']],
  ['Malvasia', ['malvasia']],
  ['Moscato', ['moscato', 'muscat']],
  ['Gewurztraminer', ['gewurztraminer', 'traminer aromatico']],
  ['Viognier', ['viognier']],
  ['Semillon', ['semillon']],
]

const OPENAI_WINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'name',
    'producer',
    'vintage',
    'country',
    'region',
    'appellation',
    'type',
    'grapes',
    'confidence',
    'notes',
    'visible_text',
  ],
  properties: {
    name: {type: ['string', 'null']},
    producer: {type: ['string', 'null']},
    vintage: {type: ['integer', 'null'], minimum: 1800, maximum: 2100},
    country: {type: ['string', 'null']},
    region: {type: ['string', 'null']},
    appellation: {type: ['string', 'null']},
    type: {type: ['string', 'null']},
    grapes: {
      type: 'array',
      items: {type: 'string'},
    },
    confidence: {type: 'number', minimum: 0, maximum: 1},
    notes: {type: ['string', 'null']},
    visible_text: {
      type: 'array',
      items: {type: 'string'},
    },
  },
}

const OPENAI_WEB_ENRICHMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'name',
    'producer',
    'country',
    'region',
    'appellation',
    'type',
    'grapes',
    'price_min',
    'price_max',
    'average_price',
    'currency',
    'price_source',
    'price_confidence',
    'body',
    'acidity',
    'harmony',
    'short_description',
    'why_notable',
    'confidence',
  ],
  properties: {
    name: {type: ['string', 'null']},
    producer: {type: ['string', 'null']},
    country: {type: ['string', 'null']},
    region: {type: ['string', 'null']},
    appellation: {type: ['string', 'null']},
    type: {type: ['string', 'null']},
    grapes: {
      type: 'array',
      items: {type: 'string'},
    },
    price_min: {type: ['number', 'null']},
    price_max: {type: ['number', 'null']},
    average_price: {type: ['number', 'null']},
    currency: {type: ['string', 'null']},
    price_source: {type: ['string', 'null']},
    price_confidence: {type: 'number', minimum: 0, maximum: 1},
    body: {type: ['string', 'null']},
    acidity: {type: ['string', 'null']},
    harmony: {type: ['string', 'null']},
    short_description: {type: ['string', 'null']},
    why_notable: {type: ['string', 'null']},
    confidence: {type: 'number', minimum: 0, maximum: 1},
  },
}

function withTimeout(promise, ms, label) {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
}

function isRefererBlockedError(message) {
  return /referer\s*<empty>.*blocked|requests from referer/i.test(String(message || ''))
}

function resolveRefererHeader(request) {
  const origin = request.headers.get('origin') || request.nextUrl?.origin || ''
  return origin ? `${origin.replace(/\/$/, '')}/` : null
}

async function blobToDataUrl(blob, fallbackMimeType = 'image/jpeg') {
  const mimeType = String(blob?.type || fallbackMimeType || 'image/jpeg').trim() || 'image/jpeg'
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`
}

function collectOpenAIText(json) {
  if (typeof json?.output_text === 'string' && json.output_text.trim()) {
    return json.output_text.trim()
  }

  const fragments = []
  for (const item of json?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string' && content.text.trim()) {
        fragments.push(content.text.trim())
      }
      if (typeof content?.output_text === 'string' && content.output_text.trim()) {
        fragments.push(content.output_text.trim())
      }
    }
  }
  return fragments.join('\n').trim()
}

function parseOpenAIJson(text) {
  const raw = String(text || '').trim()
  if (!raw) return null
  const stripped = raw
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()
  try {
    return JSON.parse(stripped)
  } catch {
    return null
  }
}

function toNonEmptyString(value) {
  const normalized = String(value || '').trim()
  return normalized || ''
}

function getBottleCompletionMetaFromExtracted(extracted) {
  const details = extracted?.recognized_payload?.catalog_details || {}
  const grapes = Array.isArray(details?.grapes)
    ? details.grapes.map((value) => toNonEmptyString(value)).filter(Boolean)
    : []
  const region = toNonEmptyString(details?.quiz_region || details?.region)
  const wineType = toNonEmptyString(details?.type)
  const requiredChecks = [
    toNonEmptyString(extracted?.recognized_name),
    toNonEmptyString(extracted?.recognized_producer),
    toNonEmptyString(extracted?.recognized_vintage),
    toNonEmptyString(details?.country),
    region,
    wineType,
    grapes[0] || '',
  ]
  const totalFields = requiredChecks.length
  const missingCount = requiredChecks.filter((value) => !value).length
  const completedCount = totalFields - missingCount
  const percent = Math.max(0, Math.min(100, Math.round((completedCount / totalFields) * 100)))
  return {
    isComplete: missingCount === 0,
    missingCount,
    completedCount,
    totalFields,
    percent,
  }
}

function getAutoWebEnrichmentMetaFromExtracted(extracted) {
  const details = extracted?.recognized_payload?.catalog_details || {}
  const grapes = Array.isArray(details?.grapes)
    ? details.grapes.map((value) => toNonEmptyString(value)).filter(Boolean)
    : []
  const region = toNonEmptyString(details?.quiz_region || details?.region)
  const criticalMissingFields = [
    !toNonEmptyString(extracted?.recognized_vintage) ? 'vintage' : null,
    !toNonEmptyString(details?.country) ? 'country' : null,
    !region ? 'region' : null,
    !toNonEmptyString(details?.type) ? 'type' : null,
    !grapes[0] ? 'grape' : null,
  ].filter(Boolean)

  return {
    shouldAutoEnrich: criticalMissingFields.length > 0,
    criticalMissingFields,
  }
}

function summarizeOpenAIUsage(responseJson) {
  const usage = responseJson?.usage
  if (!usage || typeof usage !== 'object') return null

  const inputTokens = Number(
    usage.input_tokens ?? usage.prompt_tokens ?? usage.inputTokenCount ?? 0,
  )
  const outputTokens = Number(
    usage.output_tokens ?? usage.completion_tokens ?? usage.outputTokenCount ?? 0,
  )
  const totalTokens = Number(usage.total_tokens ?? inputTokens + outputTokens)

  if (
    ![inputTokens, outputTokens, totalTokens].some((value) => Number.isFinite(value) && value > 0)
  ) {
    return null
  }

  return {
    input_tokens: Number.isFinite(inputTokens) ? inputTokens : 0,
    output_tokens: Number.isFinite(outputTokens) ? outputTokens : 0,
    total_tokens: Number.isFinite(totalTokens) ? totalTokens : 0,
  }
}

async function loadAiScanCredits(supabase, userId) {
  const {data: profile} = await supabase
    .from('profiles')
    .select('ai_scan_credits_total, ai_scan_credits_bonus, ai_scan_credits_used')
    .eq('id', userId)
    .single()

  return normalizeAiScanCredits(profile || {})
}

function normalizeOpenAIGrapes(value) {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,;/|]+/)
      : []

  return [...new Set(rawItems.map((item) => canonicalizeGrapeName(item)).filter(Boolean))]
}

function toNullableTrimmed(value) {
  const trimmed = String(value || '').trim()
  return trimmed || null
}

function normalizeCountryName(value) {
  const normalized = normalizeForCheck(value)
  if (!normalized) return null
  if (normalized === 'italia' || normalized === 'italy') return 'Italy'
  if (normalized === 'francia' || normalized === 'france') return 'France'
  if (normalized === 'spagna' || normalized === 'spain') return 'Spain'
  if (normalized === 'germania' || normalized === 'germany') return 'Germany'
  if (normalized === 'portogallo' || normalized === 'portugal') return 'Portugal'
  if (
    normalized === 'stati uniti' ||
    normalized === 'united states' ||
    normalized === 'usa' ||
    normalized === 'us'
  ) {
    return 'United States'
  }
  return capitalizeWords(toNullableTrimmed(value))
}

function mapWineType(value) {
  const normalized = normalizeForCheck(value)
  if (!normalized) return null
  if (normalized === 'red' || normalized === 'rosso') return 'red'
  if (normalized === 'white' || normalized === 'bianco') return 'white'
  if (normalized === 'rose' || normalized === 'roseo' || normalized === 'rosato') return 'rose'
  if (normalized === 'sparkling' || normalized === 'spumante' || normalized === 'bollicine')
    return 'sparkling'
  if (normalized === 'orange') return 'orange'
  if (normalized === 'dessert' || normalized === 'dolce') return 'dessert'
  if (normalized === 'fortified' || normalized === 'liquoroso') return 'fortified'
  return null
}

function sanitizeShortText(value, maxLength = 240) {
  const trimmed = toNullableTrimmed(value)
  if (!trimmed) return null
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1).trim()}...` : trimmed
}

function mergePersistentRecognitionPayload(existingPayload, nextPayload) {
  return {
    ...(existingPayload || {}),
    ...(nextPayload || {}),
    verification: {
      ...(existingPayload?.verification || {}),
      ...(nextPayload?.verification || {}),
    },
    catalog_sync: {
      ...(existingPayload?.catalog_sync || {}),
      ...(nextPayload?.catalog_sync || {}),
    },
  }
}

function buildImagePreviewRow(row, override = {}) {
  return {
    id: row?.id || null,
    original_filename: row?.original_filename || null,
    storage_bucket: row?.storage_bucket || null,
    storage_path: row?.storage_path || null,
    status: override.status || row?.status || null,
    recognized_name:
      override.recognized_name !== undefined ? override.recognized_name : row?.recognized_name || null,
    recognized_producer:
      override.recognized_producer !== undefined
        ? override.recognized_producer
        : row?.recognized_producer || null,
    recognized_vintage:
      override.recognized_vintage !== undefined
        ? override.recognized_vintage
        : row?.recognized_vintage || null,
    recognition_confidence:
      override.recognition_confidence !== undefined
        ? override.recognition_confidence
        : row?.recognition_confidence ?? null,
    recognized_payload:
      override.recognized_payload !== undefined
        ? override.recognized_payload
        : row?.recognized_payload || null,
    error_message:
      override.error_message !== undefined ? override.error_message : row?.error_message || null,
    created_at: row?.created_at || null,
  }
}

function buildCatalogRestoredWebEnrichment(sourceWebEnrichment, fallbackWebEnrichment = null) {
  const base =
    (sourceWebEnrichment && typeof sourceWebEnrichment === 'object' && sourceWebEnrichment) ||
    (fallbackWebEnrichment && typeof fallbackWebEnrichment === 'object' && fallbackWebEnrichment) ||
    null

  if (!base) return null

  return {
    ...base,
    applied: false,
    restored_from_catalog: true,
    usage: null,
    sources: Array.isArray(base.sources) ? base.sources.filter(Boolean) : [],
  }
}

function parseCatalogNarrativeFromNotes(notes) {
  const text = String(notes || '').trim()
  if (!text) return {whyNotable: null, shortDescription: null}

  const parts = text.split('|').map((part) => part.trim()).filter(Boolean)
  let whyNotable = null
  let shortDescription = null

  for (const part of parts) {
    if (!whyNotable && /^why notable:/i.test(part)) {
      whyNotable = sanitizeShortText(part.replace(/^why notable:\s*/i, ''), 160)
      continue
    }
    if (!shortDescription && /^web summary:/i.test(part)) {
      shortDescription = sanitizeShortText(part.replace(/^web summary:\s*/i, ''), 240)
    }
  }

  return {whyNotable, shortDescription}
}

function chooseMoreSpecificText(currentValue, candidateValue) {
  const current = toNullableTrimmed(currentValue)
  const candidate = toNullableTrimmed(candidateValue)
  if (!candidate) return current
  if (!current) return candidate

  const currentNorm = normalizeForCheck(current)
  const candidateNorm = normalizeForCheck(candidate)

  if (candidateNorm === currentNorm) return current
  if (candidateNorm.includes(currentNorm) && candidate.length > current.length) return candidate
  if (currentNorm.includes(candidateNorm) && current.length >= candidate.length) return current
  if (candidate.length > current.length + 4) return candidate
  return current
}

function parseNumericOrNull(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function resolveRepresentativePrice(price, min, max) {
  const numericPrice = parseNumericOrNull(price)
  const numericMin = parseNumericOrNull(min)
  const numericMax = parseNumericOrNull(max)
  const hasRange = numericMin != null || numericMax != null

  if (!hasRange) return numericPrice

  const safeMin = numericMin ?? numericMax
  const safeMax = numericMax ?? numericMin

  if (numericPrice != null && safeMin != null && safeMax != null) {
    if (numericPrice >= safeMin && numericPrice <= safeMax) return numericPrice
  }

  if (safeMin != null && safeMax != null) {
    return Number(((safeMin + safeMax) / 2).toFixed(2))
  }

  return safeMin ?? safeMax ?? numericPrice
}

function resolveEffectivePriceContext(catalogVintage = null, sourcePriceContext = null) {
  const catalogPrice = parseNumericOrNull(catalogVintage?.price)
  const catalogMin = parseNumericOrNull(catalogVintage?.price_min)
  const catalogMax = parseNumericOrNull(catalogVintage?.price_max)
  const sourcePrice = parseNumericOrNull(sourcePriceContext?.price ?? sourcePriceContext?.average_price)
  const sourceMin = parseNumericOrNull(sourcePriceContext?.price_min)
  const sourceMax = parseNumericOrNull(sourcePriceContext?.price_max)
  const effectiveCatalogPrice = resolveRepresentativePrice(catalogPrice, catalogMin, catalogMax)
  const effectiveSourcePrice = resolveRepresentativePrice(sourcePrice, sourceMin, sourceMax)

  const hasCatalogRange = catalogMin != null || catalogMax != null
  const hasSourceRange = sourceMin != null || sourceMax != null
  const preferSource = hasSourceRange && !hasCatalogRange

  const chosenMin = preferSource
    ? sourceMin ?? effectiveSourcePrice
    : catalogMin ?? sourceMin ?? effectiveCatalogPrice ?? effectiveSourcePrice
  const chosenMax = preferSource
    ? sourceMax ?? effectiveSourcePrice
    : catalogMax ?? sourceMax ?? effectiveCatalogPrice ?? effectiveSourcePrice
  const chosenPrice = preferSource
    ? effectiveSourcePrice ?? chosenMin ?? chosenMax
    : effectiveCatalogPrice ?? effectiveSourcePrice ?? chosenMin ?? chosenMax

  return {
    price: chosenPrice,
    price_min: chosenMin,
    price_max: chosenMax,
    average_price: effectiveSourcePrice ?? chosenPrice,
    currency:
      (preferSource ? sourcePriceContext?.currency : catalogVintage?.currency || sourcePriceContext?.currency) ||
      null,
    price_band:
      (preferSource ? sourcePriceContext?.price_band : catalogVintage?.price_band || sourcePriceContext?.price_band) ||
      null,
    price_source:
      (preferSource ? sourcePriceContext?.price_source : catalogPrice != null ? 'catalog' : sourcePriceContext?.price_source) ||
      null,
    price_confidence:
      preferSource && sourcePriceContext?.price_confidence != null
        ? sourcePriceContext.price_confidence
        : catalogPrice != null
          ? 0.95
          : sourcePriceContext?.price_confidence ?? null,
  }
}

function extractWebSearchSources(responseJson) {
  const allSources = []
  for (const item of responseJson?.output || []) {
    const sources = item?.action?.sources
    if (Array.isArray(sources)) {
      allSources.push(...sources)
    }
  }

  return [
    ...new Set(
      allSources.map((source) => source?.url || source?.source?.url || null).filter(Boolean),
    ),
  ].slice(0, 6)
}

function canonicalizeGrapeName(value) {
  const trimmed = toNullableTrimmed(value)
  if (!trimmed) return null
  const normalized = normalizeForCheck(trimmed)
  if (!normalized) return null

  for (const [canonical, aliases] of GRAPE_ALIASES) {
    if (aliases.some((alias) => normalized === normalizeForCheck(alias))) {
      return canonical
    }
  }

  return capitalizeWords(trimmed)
}

function extractGrapesFromFreeText(...parts) {
  const source = parts
    .flatMap((part) => (Array.isArray(part) ? part : [part]))
    .map((part) => String(part || ''))
    .join(' ')
  const normalized = normalizeForCheck(source)
  if (!normalized) return []

  const found = []
  for (const [canonical, aliases] of GRAPE_ALIASES) {
    if (aliases.some((alias) => normalized.includes(normalizeForCheck(alias)))) {
      found.push(canonical)
    }
  }
  return [...new Set(found)]
}

async function runOpenAIWebEnrichment(extracted) {
  if (!OPENAI_API_KEY || !OPENAI_WEB_ENRICHMENT_ENABLED) {
    return {
      skipped: true,
      reason: !OPENAI_API_KEY
        ? 'OPENAI_API_KEY not configured'
        : 'OPENAI_WEB_ENRICHMENT_ENABLED is not true in the running server process',
    }
  }

  const catalogDetails = extracted?.recognized_payload?.catalog_details || {}
  const visibleTextLines = Array.isArray(extracted?.recognized_payload?.ranked_lines)
    ? extracted.recognized_payload.ranked_lines
        .map((line) => toNullableTrimmed(line))
        .filter(Boolean)
        .slice(0, 12)
    : []
  const recognitionNotes = toNullableTrimmed(
    extracted?.recognized_payload?.openai_payload?.result?.notes,
  )
  const body = {
    model: OPENAI_WEB_ENRICHMENT_MODEL,
    tools: [
      {
        type: 'web_search',
        search_context_size: 'medium',
      },
    ],
    include: ['web_search_call.action.sources'],
    text: {
      format: {
        type: 'json_schema',
        name: 'wine_web_enrichment',
        strict: true,
        schema: OPENAI_WEB_ENRICHMENT_SCHEMA,
      },
    },
    input: [
      'Enrich this wine with concise, source-grounded web research.',
      'Use only reputable wine, producer, appellation, or editorial sources.',
      'Do not invent facts. If a field remains unclear, return null or an empty array.',
      'If the label seems to show only a project, estate, or brand, infer the most likely full commercial wine name only when strongly supported by multiple reputable sources.',
      'Use the wine color/type as a strong disambiguation signal when a producer has multiple variants with the same core name, for example Bianco vs Rosso.',
      'Treat the visible label text below as a primary hint. Words like Bianco, Rosso, Sicilia, Etna, DOP, DOC or DOCG can be decisive for disambiguation.',
      'If the wine is produced by a collaboration or joint project, put all producer names in producer separated by " / ".',
      'If reputable sources clearly describe style, estimate body, acidity, and harmony using short descriptors like light / medium / full, fresh / medium / high, balanced / elegant / structured.',
      'Keep short_description to a maximum of 2 short sentences.',
      'Keep why_notable to a maximum of 1 short sentence focused on why the wine, producer, or appellation is notable.',
      '',
      'Estimate the average retail bottle price when reliable sources are available.',
      'Return average_price as a number only, without currency symbols.',
      'Prefer EUR prices when available.',
      'If prices vary between retailers, return a realistic average market price.',
      'Ignore auction prices, rare collector prices, and restaurant markups.',
      'Set currency to EUR, USD, GBP, etc.',
      'Set price_source to one of: catalog, retailer, producer, wine-search, editorial.',
      'Set price_confidence from 0 to 1.',
      'If no reliable price is found, return average_price as null.',
      'When estimating price, collect multiple current retail prices if available.',
      'Ignore outliers, auction prices, restaurant prices, sold-out collector listings, and suspicious discounts.',
      'Return price_min and price_max as the realistic retail range.',
      'Return average_price as the midpoint of the realistic range, not a single random source price.',
      `Wine name: ${extracted?.recognized_name || 'unknown'}`,
      `Producer: ${extracted?.recognized_producer || 'unknown'}`,
      extracted?.recognized_vintage ? `Vintage: ${extracted.recognized_vintage}` : null,
      catalogDetails.type ? `Known type/color: ${catalogDetails.type}` : null,
      catalogDetails.country ? `Known country: ${catalogDetails.country}` : null,
      catalogDetails.region ? `Known region: ${catalogDetails.region}` : null,
      catalogDetails.appellation ? `Known appellation: ${catalogDetails.appellation}` : null,
      Array.isArray(catalogDetails.grapes) && catalogDetails.grapes.length > 0
        ? `Known grapes: ${catalogDetails.grapes.join(', ')}`
        : null,
      recognitionNotes ? `Recognition notes: ${recognitionNotes}` : null,
      visibleTextLines.length > 0
        ? `Visible label text:\n- ${visibleTextLines.join('\n- ')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n'),
    max_output_tokens: 500,
  }

  const response = await withTimeout(
    fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    }),
    30000,
    'openai web enrichment request',
  )

  const json = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(json?.error?.message || `OpenAI web enrichment HTTP ${response.status}`)
  }

  const outputText = collectOpenAIText(json)
  const parsed = parseOpenAIJson(outputText)
  if (!parsed) {
    throw new Error(
      `OpenAI web enrichment returned an unparsable payload: ${String(outputText || '').slice(0, 240) || 'empty output'}`,
    )
  }

  return {
    parsed,
    response: json,
    sources: extractWebSearchSources(json),
    usage: summarizeOpenAIUsage(json),
  }
}

function mergeWebEnrichment(extracted, webEnrichment) {
  if (!webEnrichment?.parsed) return extracted

  const parsed = webEnrichment.parsed
  const existingDetails = extracted?.recognized_payload?.catalog_details || {}
  const mergedGrapes = [
    ...new Set([
      ...(Array.isArray(existingDetails.grapes) ? existingDetails.grapes : []),
      ...normalizeOpenAIGrapes(parsed.grapes),
    ]),
  ]
  const country = existingDetails.country || normalizeCountryName(parsed.country)
  const region = existingDetails.region || toNullableTrimmed(parsed.region)
  const appellation = existingDetails.appellation || toNullableTrimmed(parsed.appellation)
  const type = existingDetails.type || mapWineType(parsed.type)
  const enrichedName = chooseMoreSpecificText(
    extracted?.recognized_name,
    canonicalizeRecognizedWineName(parsed.name || '', {
      country,
      region,
      appellation,
      quiz_region: existingDetails.quiz_region,
      quiz_appellation: existingDetails.quiz_appellation,
    }),
  )
  const enrichedProducer = chooseMoreSpecificText(
    extracted?.recognized_producer,
    parsed.producer ? capitalizeWords(parsed.producer) : null,
  )
  const incomingPriceMin = parseNumericOrNull(parsed.price_min)
  const incomingPriceMax = parseNumericOrNull(parsed.price_max)
  const incomingAveragePrice = parseNumericOrNull(parsed.average_price)
  const hasExistingRange = existingDetails.price_min != null || existingDetails.price_max != null
  const hasIncomingRange = incomingPriceMin != null || incomingPriceMax != null
  const preferIncomingPrice = hasIncomingRange && !hasExistingRange

  return {
    ...extracted,
    recognized_name: enrichedName || extracted?.recognized_name || null,
    recognized_producer: enrichedProducer || extracted?.recognized_producer || null,
    recognized_payload: {
      ...(extracted.recognized_payload || {}),
      catalog_details: {
        ...existingDetails,
        country: country || null,
        region: region || null,
        quiz_region: existingDetails.quiz_region || region || null,
        appellation: appellation || null,
        quiz_appellation: existingDetails.quiz_appellation || appellation || null,
        type: type || null,
        grapes: mergedGrapes,
        price_min:
          preferIncomingPrice
            ? incomingPriceMin
            : existingDetails.price_min ?? incomingPriceMin,
        price_max:
          preferIncomingPrice
            ? incomingPriceMax
            : existingDetails.price_max ?? incomingPriceMax,
        price:
          preferIncomingPrice
            ? incomingAveragePrice ?? existingDetails.average_price ?? existingDetails.price
            : existingDetails.price ?? existingDetails.average_price ?? incomingAveragePrice,
        average_price:
          preferIncomingPrice
            ? incomingAveragePrice ?? existingDetails.average_price ?? existingDetails.price
            : existingDetails.average_price ?? existingDetails.price ?? incomingAveragePrice,

        currency:
          (preferIncomingPrice ? toNullableTrimmed(parsed.currency) : existingDetails.currency) ||
          toNullableTrimmed(parsed.currency),
        price_source:
          (preferIncomingPrice ? toNullableTrimmed(parsed.price_source) : existingDetails.price_source) ||
          toNullableTrimmed(parsed.price_source),
        price_confidence:
          preferIncomingPrice
            ? Number.isFinite(Number(parsed.price_confidence))
              ? Math.max(0, Math.min(1, Number(parsed.price_confidence)))
              : existingDetails.price_confidence ?? null
            : existingDetails.price_confidence ??
              (Number.isFinite(Number(parsed.price_confidence))
                ? Math.max(0, Math.min(1, Number(parsed.price_confidence)))
                : null),
        body: existingDetails.body || toNullableTrimmed(parsed.body),
        acidity: existingDetails.acidity || toNullableTrimmed(parsed.acidity),
        harmonize: existingDetails.harmonize || toNullableTrimmed(parsed.harmony),
        short_description: sanitizeShortText(parsed.short_description, 240),
        why_notable: sanitizeShortText(parsed.why_notable, 160),
      },
      web_enrichment: {
        applied: true,
        model: OPENAI_WEB_ENRICHMENT_MODEL,
        confidence: Number.isFinite(Number(parsed.confidence))
          ? Math.max(0, Math.min(1, Number(parsed.confidence)))
          : null,
        sources: webEnrichment.sources || [],
        usage: webEnrichment.usage || null,
      },
    },
  }
}

async function runOpenAIVisionRecognition(blob, {mimeType, originalFilename, storagePath} = {}) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const dataUrl = await blobToDataUrl(blob, mimeType || blob?.type || 'image/jpeg')
  const endpoint = 'https://api.openai.com/v1/responses'
  const body = {
    model: OPENAI_VISION_MODEL,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'You are a careful wine recognition assistant. Return only JSON that follows the schema. Never invent unreadable details.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: [
              OPENAI_RECOGNITION_PROMPT,
              originalFilename ? `Filename: ${originalFilename}` : null,
              storagePath ? `Storage path: ${storagePath}` : null,
            ]
              .filter(Boolean)
              .join('\n'),
          },
          {
            type: 'input_image',
            image_url: dataUrl,
            detail: 'high',
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'wine_bottle_recognition',
        strict: true,
        schema: OPENAI_WINE_SCHEMA,
      },
    },
    temperature: 0,
    max_output_tokens: 900,
  }

  const response = await withTimeout(
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    }),
    45000,
    'openai vision request',
  )

  const json = await response.json().catch(() => null)
  if (!response.ok) {
    const msg = json?.error?.message || `OpenAI HTTP ${response.status}`
    throw new Error(msg)
  }

  const parsed = parseOpenAIJson(collectOpenAIText(json))
  if (!parsed) {
    throw new Error('OpenAI returned an empty recognition payload')
  }

  return {
    response: json,
    parsed,
  }
}

async function downloadStorageObjectWithFallback({supabase, bucket, path, request}) {
  const {data: blob, error: blobError} = await withTimeout(
    supabase.storage.from(bucket).download(path),
    30000,
    'storage download',
  )
  if (!blobError && blob) return blob

  const firstError = blobError?.message || 'storage download failed'
  if (!isRefererBlockedError(firstError)) {
    throw new Error(firstError)
  }

  const {data: signed, error: signedError} = await withTimeout(
    supabase.storage.from(bucket).createSignedUrl(path, 60),
    12000,
    'create signed url',
  )
  if (signedError || !signed?.signedUrl) {
    throw new Error(signedError?.message || 'create signed url failed')
  }

  const referer = resolveRefererHeader(request)
  const response = await withTimeout(
    fetch(signed.signedUrl, {
      cache: 'no-store',
      headers: referer ? {Referer: referer} : undefined,
    }),
    30000,
    'signed url download',
  )

  if (!response.ok) {
    const responseText = await response.text().catch(() => '')
    throw new Error(
      `Signed download failed: ${response.status}${responseText ? ` ${responseText.slice(0, 140)}` : ''}`,
    )
  }

  return response.blob()
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ''),
  )
}

function isMissingColumnError(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('column') && message.includes('does not exist')
}

function normalizeToken(token) {
  return String(token || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function capitalizeWords(value) {
  return String(value || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function cleanWineName(value) {
  const tokens = String(value || '')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  const blocked = new Set([
    'nv',
    'n.v',
    'definitivo',
    'definitiva',
    'final',
    'finale',
    'test',
    'copia',
    'copy',
  ])

  const filtered = tokens.filter((token) => {
    const norm = normalizeForCheck(token)
    if (!norm) return false
    if (blocked.has(norm)) return false
    if (/^\d{1,3}$/.test(norm)) return false
    return true
  })

  return capitalizeWords(filtered.join(' ').trim())
}

function canonicalizeRecognizedWineName(value, context = {}) {
  const cleaned = cleanWineName(value)
  if (!cleaned) return null

  const removableTerms = new Set([
    'doc',
    'docg',
    'dop',
    'igt',
    'igp',
    'denominazione',
    'origine',
    'protetta',
    'protected',
    'indicazione',
    'geografica',
    'tipica',
  ])

  const contextualTerms = [
    context.country,
    context.region,
    context.appellation,
    context.quiz_region,
    context.quiz_appellation,
  ]
    .filter(Boolean)
    .flatMap((part) => toNormalizedKey(part).split(' ').filter(Boolean))

  for (const term of contextualTerms) {
    removableTerms.add(term)
  }

  const originalTokens = cleaned.split(/\s+/).filter(Boolean)
  const normalizedTokens = originalTokens.map((token) => normalizeForCheck(token))

  while (
    originalTokens.length > 1 &&
    normalizedTokens.length > 1 &&
    removableTerms.has(normalizedTokens[normalizedTokens.length - 1])
  ) {
    originalTokens.pop()
    normalizedTokens.pop()
  }

  return capitalizeWords(originalTokens.join(' ').trim())
}

function toNormalizedKey(value) {
  return normalizeForCheck(value)
    .replace(/\b(nv|n v|doc|docg|igt)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenSet(value) {
  return new Set(toNormalizedKey(value).split(' ').filter(Boolean))
}

function overlapScore(a, b) {
  const sa = tokenSet(a)
  const sb = tokenSet(b)
  if (!sa.size || !sb.size) return 0
  let common = 0
  for (const t of sa) {
    if (sb.has(t)) common += 1
  }
  return common / Math.max(sa.size, sb.size)
}

function normalizeForCheck(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksLikeNoiseLine(value) {
  const normalized = normalizeForCheck(value)
  if (!normalized) return true
  if (normalized.length < 2) return true
  if (/\b\d{1,4}\s?(ml|cl|vol)\b/.test(normalized)) return true
  const words = normalized.split(' ').filter(Boolean)
  if (words.length === 0) return true
  const noiseHits = words.filter((word) => WINE_NOISE_TERMS.has(word)).length
  return noiseHits >= Math.max(2, Math.floor(words.length * 0.6))
}

function looksLikeRegionOnly(value) {
  const normalized = normalizeForCheck(value)
  if (!normalized) return false
  const words = normalized.split(' ').filter(Boolean)
  if (!words.length || words.length > 3) return false
  return words.every((word) => WINE_NOISE_TERMS.has(word))
}

function looksLikeInstitutionalLine(value) {
  const normalized = normalizeForCheck(value)
  if (!normalized) return false
  return (
    normalized.includes('denominazione') ||
    normalized.includes('denominatione') ||
    normalized.includes('indicazione geografica') ||
    normalized.includes('origine protetta') ||
    normalized.includes('denominazione di origine') ||
    normalized.includes('contains sulfites') ||
    normalized.includes('contiene solfiti')
  )
}

function looksLikeInstitutionalFragment(value) {
  const normalized = normalizeForCheck(value)
  if (!normalized) return false
  return (
    normalized.includes('denomin') ||
    normalized.includes('nominaz') ||
    normalized.includes('indicaz') ||
    normalized.includes('geografic') ||
    normalized.includes('origine') ||
    normalized.includes('protett') ||
    normalized.includes('controllat') ||
    normalized.includes('garantit') ||
    normalized.includes('solfit')
  )
}

function parseFilenameParts(originalFilename, storagePath) {
  const raw = String(originalFilename || storagePath || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .trim()
  if (!raw) return []

  // Keep separators meaningful before full normalization.
  const parts = raw
    .split(/[_|,-]+/)
    .map((part) => normalizeToken(part))
    .filter(Boolean)

  // Remove trailing numeric sequence-like token (e.g. _7, -12) when not a vintage.
  while (parts.length > 0) {
    const last = parts[parts.length - 1]
    if (/^\d{1,3}$/.test(last) && !/^(19|20)\d{2}$/.test(last)) {
      parts.pop()
      continue
    }
    break
  }

  return parts
}

function detectRegionHint(value) {
  const normalized = normalizeForCheck(value)
  if (!normalized) return null
  for (const region of REGION_HINTS) {
    for (const alias of region.aliases) {
      if (normalized.includes(alias)) return region.canonical
    }
  }
  return null
}

function extractVintage(text) {
  const match = String(text || '').match(/\b(19|20)\d{2}\b/)
  return match ? Number(match[0]) : null
}

function extractFromFilename(originalFilename, storagePath) {
  const source = normalizeToken(originalFilename || storagePath || '')
  if (!source) {
    return {ok: false, error: 'Empty filename'}
  }

  const vintage = extractVintage(source)
  const parsedParts = parseFilenameParts(originalFilename, storagePath)
  const fallbackTokens = source
    .replace(/\b(19|20)\d{2}\b/g, '')
    .split(/\s+/)
    .map((part) => normalizeToken(part))
    .filter(Boolean)

  const producer = parsedParts[0] || fallbackTokens[0] || null
  const nameRaw =
    parsedParts.slice(1).join(' ').trim() ||
    fallbackTokens.slice(1).join(' ').trim() ||
    source.replace(/\b(19|20)\d{2}\b/g, '').trim()
  const name = nameRaw ? capitalizeWords(nameRaw) : null
  const cleanedName = cleanWineName(name)

  const payload = {
    provider: 'filename_fallback',
    extractor: 'filename-v1',
    source,
    tokens: parsedParts.length > 0 ? parsedParts : fallbackTokens,
    guessed_producer: producer ? capitalizeWords(producer) : null,
    guessed_name: cleanedName || name,
    guessed_vintage: vintage,
  }

  if (!name && !producer && !vintage) {
    return {ok: false, error: 'No structured data found', payload}
  }

  return {
    ok: true,
    recognized_name: cleanedName || name || null,
    recognized_producer: producer ? capitalizeWords(producer) : null,
    recognized_vintage: vintage,
    recognition_confidence: vintage ? 0.62 : 0.48,
    recognized_payload: payload,
  }
}

function extractFromOpenAIRecognition(openAIResult, originalFilename, storagePath) {
  const parsed = openAIResult?.parsed || null
  if (!parsed || typeof parsed !== 'object') {
    return {ok: false, error: 'OpenAI empty recognition payload'}
  }

  const country = normalizeCountryName(parsed.country)
  const region = toNullableTrimmed(parsed.region || parsed.subregion || null)
  const appellation = toNullableTrimmed(parsed.appellation || parsed.doc || parsed.docg || null)
  const type = mapWineType(parsed.type)
  const name = canonicalizeRecognizedWineName(
    parsed.name || parsed.label || parsed.wine_name || parsed.wine || '',
    {country, region, appellation},
  )
  const producer =
    parsed.producer || parsed.winery ? capitalizeWords(parsed.producer || parsed.winery) : null
  const grapes = normalizeOpenAIGrapes(parsed.grapes || parsed.varieties || [])
  const fallbackGrapes =
    grapes.length > 0
      ? grapes
      : extractGrapesFromFreeText(
          parsed.notes,
          parsed.visible_text,
          parsed.name,
          parsed.appellation,
        )
  const vintage =
    Number.isInteger(parsed.vintage) && parsed.vintage >= 1800 && parsed.vintage <= 2100
      ? parsed.vintage
      : null
  const rawConfidence = Number(parsed.confidence)
  const confidence = Number.isFinite(rawConfidence)
    ? Math.max(0.25, Math.min(0.99, rawConfidence))
    : Math.max(0.35, Math.min(0.86, name && producer ? 0.72 : 0.54))
  const isMeaningful =
    name || producer || country || region || appellation || vintage || fallbackGrapes.length

  if (!isMeaningful) {
    const fallback = extractFromFilename(originalFilename, storagePath)
    if (fallback.ok) {
      return {
        ...fallback,
        recognized_payload: {
          ...(fallback.recognized_payload || {}),
          openai_payload: {
            provider: 'openai_vision',
            extractor: 'openai-vision-v1',
            model: OPENAI_VISION_MODEL,
            result: parsed,
          },
          fallback_used: true,
        },
        recognition_confidence: 0.42,
      }
    }
    return {ok: false, error: 'No structured data found in OpenAI response', payload: parsed}
  }

  const reviewRequired =
    confidence < OPENAI_REVIEW_CONFIDENCE_THRESHOLD || !name || !producer || !country
  const catalogDetails = {
    appellation,
    quiz_appellation: appellation,
    country: country || null,
    region: region || null,
    quiz_region: region || null,
    type: type || null,
    grapes: fallbackGrapes,
    known_vintages: vintage ? [vintage] : [],
    price: null,
    price_min: null,
    price_max: null,
    average_price: null,
    currency: null,
    price_band: null,
    quiz_price_band: null,
    body: null,
    acidity: null,
    elaborate: null,
    harmonize: null,
  }

  const payload = {
    provider: 'openai_vision',
    extractor: 'openai-vision-v1',
    model: OPENAI_VISION_MODEL,
    prompt_version: 'wine-bottle-json-v1',
    text_preview: [name, producer, country, region, appellation, ...fallbackGrapes.slice(0, 3)]
      .filter(Boolean)
      .join(' '),
    ranked_lines: Array.isArray(parsed.visible_text) ? parsed.visible_text.slice(0, 20) : [],
    guessed_name: name,
    guessed_producer: producer,
    guessed_vintage: vintage,
    review: {
      required: reviewRequired,
      reason: reviewRequired ? 'low_confidence_or_missing_fields' : null,
    },
    catalog_match: {
      matched: false,
      score: null,
      label_name_score: null,
      producer_score: null,
      label_id: null,
    },
    catalog_details: catalogDetails,
    openai_payload: {
      response: openAIResult?.response || null,
      result: parsed,
      usage: summarizeOpenAIUsage(openAIResult?.response),
    },
  }

  return {
    ok: true,
    recognized_name: name || fallbackNameFromFilename(originalFilename),
    recognized_producer: producer || null,
    recognized_country: country || null,
    recognized_region: region || null,
    recognized_vintage: vintage,
    recognition_confidence: confidence,
    recognized_payload: payload,
    warning_message: reviewRequired ? 'Revisione manuale consigliata' : null,
  }
}

function fallbackNameFromFilename(originalFilename) {
  const base = normalizeToken(originalFilename || '')
  if (!base) return null
  return cleanWineName(base.replace(/\b(19|20)\d{2}\b/g, '').trim()) || null
}

async function loadCatalogLabelBundle(supabase, labelId) {
  if (!labelId) return null

  let {data: label, error: labelError} = await withTimeout(
    supabase
      .from('wine_labels')
      .select(
        'id, name, normalized_name, producer_id, appellation, country, region, quiz_region, quiz_appellation, type, quiz_price_band, body, acidity, elaborate, harmonize, notes',
      )
      .eq('id', labelId)
      .maybeSingle(),
    10000,
    'catalog label by id',
  )

  if (labelError && isMissingColumnError(labelError)) {
    const fallback = await withTimeout(
      supabase
        .from('wine_labels')
        .select('id, name, normalized_name, producer_id, appellation, country, region, type, notes')
        .eq('id', labelId)
        .maybeSingle(),
      10000,
      'catalog label by id fallback',
    )
    label = fallback.data
    labelError = fallback.error
  }

  if (labelError || !label) return null

  let producer = null
  if (label.producer_id) {
    const producerResult = await withTimeout(
      supabase
        .from('wine_producers')
        .select('id, name, normalized_name')
        .eq('id', label.producer_id)
        .maybeSingle(),
      10000,
      'catalog producer by id',
    ).catch(() => ({data: null}))
    producer = producerResult.data || null
  }

  const grapesResult = await withTimeout(
    supabase
      .from('wine_label_grapes')
      .select('grape_id, wine_grapes(name)')
      .eq('wine_label_id', label.id),
    10000,
    'catalog grapes by label id',
  ).catch(() => ({data: []}))

  let {data: vintages, error: vintagesError} = await withTimeout(
    supabase
      .from('wine_vintages')
      .select('id, vintage, price, price_min, price_max, currency, price_band, last_seen_at')
      .eq('wine_label_id', label.id)
      .order('last_seen_at', {ascending: false})
      .limit(8),
    10000,
    'catalog vintages by label id',
  ).catch(() => ({data: [], error: null}))

  if (vintagesError && isMissingColumnError(vintagesError)) {
    const fallbackVintagesResult = await withTimeout(
      supabase
        .from('wine_vintages')
        .select('vintage, price, currency, last_seen_at')
        .eq('wine_label_id', label.id)
        .order('last_seen_at', {ascending: false})
        .limit(8),
      10000,
      'catalog vintages by label id fallback',
    ).catch(() => ({data: []}))
    vintages = fallbackVintagesResult.data
  }

  const latestVintageId = vintages?.[0]?.id || null
  let latestSourcePayload = null
  if (latestVintageId) {
    const sourceResult = await withTimeout(
      supabase
        .from('wine_sources')
        .select('raw_payload, data_source, source_url, updated_at')
        .eq('wine_vintage_id', latestVintageId)
        .order('updated_at', {ascending: false})
        .limit(1)
        .maybeSingle(),
      10000,
      'catalog source by vintage id',
    ).catch(() => ({data: null}))
    latestSourcePayload = sourceResult.data || null
  }

  return {
    label,
    producer,
    grapes: (grapesResult.data || []).map((row) => row?.wine_grapes?.name).filter(Boolean),
    vintages: vintages || [],
    latestSourcePayload,
  }
}

async function enrichWithWineCatalog(supabase, extracted, existingPayload = null) {
  const guessedName = extracted?.recognized_name || ''
  const guessedProducer = extracted?.recognized_producer || ''
  if (!guessedName && !guessedProducer) return extracted

  const syncedLabelId = existingPayload?.catalog_sync?.label_id || null
  if (syncedLabelId) {
    const bundle = await loadCatalogLabelBundle(supabase, syncedLabelId)
    if (bundle?.label) {
      const narrative = parseCatalogNarrativeFromNotes(bundle.label?.notes)
      const sourceNarrative = bundle.latestSourcePayload?.raw_payload?.extracted_notes || {}
      const sourceWebEnrichment = bundle.latestSourcePayload?.raw_payload?.web_enrichment || null
      const sourcePriceContext = bundle.latestSourcePayload?.raw_payload?.price_context || null
      const restoredWebEnrichment = buildCatalogRestoredWebEnrichment(
        sourceWebEnrichment,
        existingPayload?.web_enrichment || extracted?.recognized_payload?.web_enrichment || null,
      )
      const knownVintages = [...new Set((bundle.vintages || []).map((v) => v?.vintage).filter(Boolean))]
      const latestWithPrice =
        (bundle.vintages || []).find(
          (v) => v?.price != null || v?.price_min != null || v?.price_max != null,
        ) || null
      const effectivePrice = resolveEffectivePriceContext(latestWithPrice, sourcePriceContext)
      const resolvedVintage =
        extracted?.recognized_vintage && knownVintages.includes(extracted.recognized_vintage)
          ? extracted.recognized_vintage
          : extracted?.recognized_vintage || knownVintages[0] || null

      return {
        ...extracted,
        recognized_name: bundle.label?.name || extracted.recognized_name,
        recognized_producer: bundle.producer?.name || extracted.recognized_producer,
        recognized_vintage: resolvedVintage,
        recognition_confidence: Math.min(
          0.96,
          Math.max(Number(extracted.recognition_confidence || 0), 0.9),
        ),
        recognized_payload: {
          ...(extracted.recognized_payload || {}),
          catalog_match: {
            matched: true,
            score: 1,
            label_name_score: 1,
            producer_score: 1,
            label_id: bundle.label?.id || null,
          },
          catalog_details: {
            appellation: bundle.label?.quiz_appellation || bundle.label?.appellation || null,
            quiz_appellation: bundle.label?.quiz_appellation || null,
            country: bundle.label?.country || null,
            region: bundle.label?.quiz_region || bundle.label?.region || null,
            quiz_region: bundle.label?.quiz_region || null,
            type: bundle.label?.type || null,
            quiz_price_band: bundle.label?.quiz_price_band || null,
            grapes: bundle.grapes,
            known_vintages: knownVintages,
            price: effectivePrice.price,
            price_min: effectivePrice.price_min,
            price_max: effectivePrice.price_max,
            average_price: effectivePrice.average_price,
            currency: effectivePrice.currency,
            price_source: effectivePrice.price_source,
            price_confidence: effectivePrice.price_confidence,
            price_band: effectivePrice.price_band,
            body: bundle.label?.body || null,
            acidity: bundle.label?.acidity || null,
            elaborate: bundle.label?.elaborate || null,
            harmonize: bundle.label?.harmonize || null,
            why_notable: narrative.whyNotable || sourceNarrative?.why_notable || null,
            short_description:
              narrative.shortDescription || sourceNarrative?.short_description || null,
          },
          review: {
            ...(extracted.recognized_payload?.review || {}),
            required: false,
            reason: null,
          },
          web_enrichment: restoredWebEnrichment || null,
        },
      }
    }
  }

  const keyName = toNormalizedKey(guessedName)
  const keyProducer = toNormalizedKey(guessedProducer)
  const keyNameTokens = keyName.split(' ').filter(Boolean)
  const firstNameToken = keyName.split(' ').filter(Boolean)[0] || ''
  const ocrContext = [
    extracted?.recognized_payload?.text_preview,
    ...(Array.isArray(extracted?.recognized_payload?.ranked_lines)
      ? extracted.recognized_payload.ranked_lines.slice(0, 6)
      : []),
    guessedName,
  ]
    .filter(Boolean)
    .join(' ')
  const regionHint = detectRegionHint(ocrContext)
  const typeHint = mapWineType(
    extracted?.recognized_payload?.catalog_details?.type ||
      extracted?.recognized_payload?.openai_payload?.result?.type ||
      ocrContext,
  )

  let labelsQuery = supabase
    .from('wine_labels')
    .select(
      'id, name, normalized_name, producer_id, appellation, country, region, quiz_region, quiz_appellation, type, quiz_price_band, body, acidity, elaborate, harmonize',
    )
    .limit(120)

  if (firstNameToken) {
    labelsQuery = labelsQuery.or(
      `normalized_name.ilike.%${firstNameToken}%,name.ilike.%${firstNameToken}%`,
    )
  }

  let {data: labels, error: labelsError} = await withTimeout(labelsQuery, 10000, 'catalog labels')
  if (labelsError && isMissingColumnError(labelsError)) {
    let fallbackQuery = supabase
      .from('wine_labels')
      .select('id, name, normalized_name, producer_id, appellation, country, region, type, notes')
      .limit(120)
    if (firstNameToken) {
      fallbackQuery = fallbackQuery.or(
        `normalized_name.ilike.%${firstNameToken}%,name.ilike.%${firstNameToken}%`,
      )
    }
    const fallbackResult = await withTimeout(fallbackQuery, 10000, 'catalog labels fallback')
    labels = fallbackResult.data
    labelsError = fallbackResult.error
  }
  if (labelsError || !labels?.length) return extracted

  const producerIds = [...new Set(labels.map((l) => l.producer_id).filter(Boolean))]
  let producersMap = new Map()
  if (producerIds.length) {
    const {data: producers} = await withTimeout(
      supabase.from('wine_producers').select('id, name, normalized_name').in('id', producerIds),
      10000,
      'catalog producers',
    )
    producersMap = new Map((producers || []).map((p) => [p.id, p]))
  }

  const exactLabelMatches = labels.filter((label) => {
    const normalizedLabelName = toNormalizedKey(label.normalized_name || label.name || '')
    return !!keyName && normalizedLabelName === keyName
  })

  if (exactLabelMatches.length > 0) {
    const exactLabel =
      exactLabelMatches
        .map((label) => ({
          label,
          producer: producersMap.get(label.producer_id) || null,
          producerScore: label.producer_id
            ? Math.max(
                overlapScore(guessedProducer, producersMap.get(label.producer_id)?.name || ''),
                overlapScore(
                  guessedProducer,
                  producersMap.get(label.producer_id)?.normalized_name || '',
                ),
              )
            : 0,
        }))
        .sort((a, b) => b.producerScore - a.producerScore)[0] || null

    if (exactLabel?.label) {
      const bundle = await loadCatalogLabelBundle(supabase, exactLabel.label.id)
      if (bundle?.label) {
        const narrative = parseCatalogNarrativeFromNotes(bundle.label?.notes)
        const sourceNarrative = bundle.latestSourcePayload?.raw_payload?.extracted_notes || {}
        const sourceWebEnrichment = bundle.latestSourcePayload?.raw_payload?.web_enrichment || null
        const sourcePriceContext = bundle.latestSourcePayload?.raw_payload?.price_context || null
        const restoredWebEnrichment = buildCatalogRestoredWebEnrichment(
          sourceWebEnrichment,
          existingPayload?.web_enrichment || extracted?.recognized_payload?.web_enrichment || null,
        )
        const knownVintages = [...new Set((bundle.vintages || []).map((v) => v?.vintage).filter(Boolean))]
        const latestWithPrice =
          (bundle.vintages || []).find(
            (v) => v?.price != null || v?.price_min != null || v?.price_max != null,
          ) || null
        const effectivePrice = resolveEffectivePriceContext(latestWithPrice, sourcePriceContext)
        const resolvedVintage =
          extracted?.recognized_vintage && knownVintages.includes(extracted.recognized_vintage)
            ? extracted.recognized_vintage
            : extracted?.recognized_vintage || knownVintages[0] || null

        return {
          ...extracted,
          recognized_name: bundle.label?.name || extracted.recognized_name,
          recognized_producer: bundle.producer?.name || extracted.recognized_producer,
          recognized_vintage: resolvedVintage,
          recognition_confidence: Math.min(
            0.96,
            Math.max(Number(extracted.recognition_confidence || 0), 0.9),
          ),
          recognized_payload: {
            ...(extracted.recognized_payload || {}),
            catalog_match: {
              matched: true,
              score: 0.99,
              label_name_score: 1,
              producer_score: Number((exactLabel.producerScore || 0).toFixed(3)),
              label_id: bundle.label?.id || null,
            },
            catalog_details: {
              appellation: bundle.label?.quiz_appellation || bundle.label?.appellation || null,
              quiz_appellation: bundle.label?.quiz_appellation || null,
              country: bundle.label?.country || null,
              region: bundle.label?.quiz_region || bundle.label?.region || null,
              quiz_region: bundle.label?.quiz_region || null,
              type: bundle.label?.type || null,
              quiz_price_band: bundle.label?.quiz_price_band || null,
              grapes: bundle.grapes,
              known_vintages: knownVintages,
              price: effectivePrice.price,
              price_min: effectivePrice.price_min,
              price_max: effectivePrice.price_max,
              average_price: effectivePrice.average_price,
              currency: effectivePrice.currency,
              price_source: effectivePrice.price_source,
              price_confidence: effectivePrice.price_confidence,
              price_band: effectivePrice.price_band,
              body: bundle.label?.body || null,
              acidity: bundle.label?.acidity || null,
              elaborate: bundle.label?.elaborate || null,
              harmonize: bundle.label?.harmonize || null,
              why_notable: narrative.whyNotable || sourceNarrative?.why_notable || null,
              short_description:
                narrative.shortDescription || sourceNarrative?.short_description || null,
            },
            review: {
              ...(extracted.recognized_payload?.review || {}),
              required: false,
              reason: null,
            },
            web_enrichment: restoredWebEnrichment || null,
          },
        }
      }
    }
  }

  let best = null
  for (const label of labels) {
    const producer = producersMap.get(label.producer_id) || null
    const normalizedLabelName = toNormalizedKey(label.normalized_name || label.name || '')
    const labelNameScore = Math.max(
      overlapScore(guessedName, label.name),
      overlapScore(guessedName, label.normalized_name),
    )
    const producerScore = producer
      ? Math.max(
          overlapScore(guessedProducer, producer.name),
          overlapScore(guessedProducer, producer.normalized_name),
        )
      : 0
    const labelRegionContext = [label.region, label.appellation, label.name]
      .filter(Boolean)
      .join(' ')
    const labelRegionHint = detectRegionHint(labelRegionContext)
    const regionScore =
      regionHint && labelRegionHint ? (labelRegionHint === regionHint ? 0.1 : -0.1) : 0
    const typeScore = typeHint && label.type ? (label.type === typeHint ? 0.08 : -0.08) : 0
    const prefixScore =
      keyNameTokens.length > 0 &&
      normalizedLabelName &&
      keyNameTokens.every((token) => normalizedLabelName.includes(token))
        ? 0.12
        : 0
    const score = labelNameScore * 0.72 + producerScore * 0.28 + regionScore + typeScore + prefixScore
    if (!best || score > best.score) {
      best = {label, producer, score, labelNameScore, producerScore}
    }
  }

  if (!best || best.score < 0.28) return extracted

  const {data: labelGrapes} = await withTimeout(
    supabase
      .from('wine_label_grapes')
      .select('grape_id, wine_grapes(name)')
      .eq('wine_label_id', best.label.id),
    10000,
    'catalog grapes',
  ).catch(() => ({data: []}))

  const grapes = (labelGrapes || []).map((row) => row?.wine_grapes?.name).filter(Boolean)

  let {data: vintages, error: vintagesError} = await withTimeout(
    supabase
      .from('wine_vintages')
      .select('vintage, price, price_min, price_max, currency, price_band, last_seen_at')
      .eq('wine_label_id', best.label.id)
      .order('last_seen_at', {ascending: false})
      .limit(8),
    10000,
    'catalog vintages',
  ).catch(() => ({data: [], error: null}))

  if (vintagesError && isMissingColumnError(vintagesError)) {
    const fallbackVintagesResult = await withTimeout(
      supabase
        .from('wine_vintages')
        .select('vintage, price, currency, last_seen_at')
        .eq('wine_label_id', best.label.id)
        .order('last_seen_at', {ascending: false})
        .limit(8),
      10000,
      'catalog vintages fallback',
    ).catch(() => ({data: []}))
    vintages = fallbackVintagesResult.data
  }

  const knownVintages = [...new Set((vintages || []).map((v) => v?.vintage).filter(Boolean))]
  const latestWithPrice =
    (vintages || []).find((v) => v?.price != null || v?.price_min != null || v?.price_max != null) ||
    null
  const narrative = parseCatalogNarrativeFromNotes(best.label?.notes)
  const bundle = await loadCatalogLabelBundle(supabase, best.label.id)
  const sourceNarrative = bundle?.latestSourcePayload?.raw_payload?.extracted_notes || {}
  const sourceWebEnrichment = bundle?.latestSourcePayload?.raw_payload?.web_enrichment || null
  const sourcePriceContext = bundle?.latestSourcePayload?.raw_payload?.price_context || null
  const restoredWebEnrichment = buildCatalogRestoredWebEnrichment(
    sourceWebEnrichment,
    existingPayload?.web_enrichment || extracted?.recognized_payload?.web_enrichment || null,
  )
  const effectivePrice = resolveEffectivePriceContext(latestWithPrice, sourcePriceContext)

  const resolvedVintage =
    extracted?.recognized_vintage && knownVintages.includes(extracted.recognized_vintage)
      ? extracted.recognized_vintage
      : extracted?.recognized_vintage || knownVintages[0] || null

  const boostedConfidence = Math.min(
    0.94,
    Math.max(Number(extracted.recognition_confidence || 0), 0.68 + best.score * 0.2),
  )

  const resolvedRegion = regionHint || best.label?.quiz_region || best.label?.region || null

  return {
    ...extracted,
    recognized_name: best.label?.name || extracted.recognized_name,
    recognized_producer: best.producer?.name || extracted.recognized_producer,
    recognized_vintage: resolvedVintage,
    recognition_confidence: boostedConfidence,
    recognized_payload: {
      ...(extracted.recognized_payload || {}),
      catalog_match: {
        matched: true,
        score: Number(best.score.toFixed(3)),
        label_name_score: Number(best.labelNameScore.toFixed(3)),
        producer_score: Number(best.producerScore.toFixed(3)),
        label_id: best.label?.id || null,
      },
      catalog_details: {
        appellation: best.label?.quiz_appellation || best.label?.appellation || null,
        quiz_appellation: best.label?.quiz_appellation || null,
        country: best.label?.country || null,
        region: resolvedRegion,
        quiz_region: best.label?.quiz_region || null,
        type: best.label?.type || null,
        quiz_price_band: best.label?.quiz_price_band || null,
        grapes,
        known_vintages: knownVintages,
        price: effectivePrice.price,
        price_min: effectivePrice.price_min,
        price_max: effectivePrice.price_max,
        average_price: effectivePrice.average_price,
        currency: effectivePrice.currency,
        price_source: effectivePrice.price_source,
        price_confidence: effectivePrice.price_confidence,
        price_band: effectivePrice.price_band,
        body: best.label?.body || null,
        acidity: best.label?.acidity || null,
        elaborate: best.label?.elaborate || null,
        harmonize: best.label?.harmonize || null,
        why_notable: narrative.whyNotable || sourceNarrative?.why_notable || null,
        short_description: narrative.shortDescription || sourceNarrative?.short_description || null,
      },
      review: {
        ...(extracted.recognized_payload?.review || {}),
        required: false,
        reason: null,
      },
      web_enrichment: restoredWebEnrichment || null,
    },
  }
}

export async function POST(request) {
  try {
    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await withTimeout(supabase.auth.getUser(), 8000, 'auth getUser')

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const body = await request.json().catch(() => ({}))
    const imageId = String(body?.imageId ?? '').trim()
    const analyzeAll = Boolean(body?.analyzeAll)
    const useWebEnrichment = body?.useWebEnrichment === true
    const forceWebEnrichment = Boolean(body?.forceWebEnrichment)
    const webEnrichmentOnly = Boolean(body?.webEnrichmentOnly)
    const previewWebEnrichment = body?.previewWebEnrichment === true
    const imageIds = Array.isArray(body?.imageIds)
      ? [...new Set(body.imageIds.map((id) => String(id || '').trim()).filter((id) => isUuid(id)))]
      : []

    let query = supabase
      .from('tasting_bottle_images')
      .select(
        'id, uploaded_by, storage_bucket, storage_path, original_filename, mime_type, status, recognized_name, recognized_producer, recognized_vintage, recognition_confidence, recognized_payload, error_message, created_at',
      )
      .eq('uploaded_by', user.id)
      .order('created_at', {ascending: false})
      .limit(50)

    if (imageId) {
      query = query.eq('id', imageId)
    } else if (analyzeAll) {
      query = query.in('status', ['processing', 'uploaded', 'failed'])
      if (imageIds.length > 0) {
        query = query.in('id', imageIds)
      }
    } else {
      return NextResponse.json({error: 'Missing imageId or analyzeAll'}, {status: 400})
    }

    const {data: rows, error: rowsError} = await withTimeout(query, 12000, 'load rows')
    if (rowsError) {
      return NextResponse.json({error: rowsError.message}, {status: 500})
    }
    if (!rows?.length) {
      return NextResponse.json({ok: true, updated: [], credits: await loadAiScanCredits(supabase, user.id)})
    }

    const requestedCredits = rows.length
    const {data: creditData, error: creditError} = await supabase.rpc('consume_ai_scan_credits', {
      p_user_id: user.id,
      p_amount: requestedCredits,
    })

    if (creditError) {
      const credits = await loadAiScanCredits(supabase, user.id)
      return NextResponse.json(
        {
          error:
            credits.remaining < requestedCredits
              ? `Insufficient scan credits (${credits.remaining}/${requestedCredits})`
              : creditError.message,
          credits,
        },
        {status: credits.remaining < requestedCredits ? 402 : 500},
      )
    }

    const creditsSnapshot = normalizeAiScanCredits(
      Array.isArray(creditData) ? creditData[0] || {} : creditData || {},
    )
    if (creditsSnapshot.remaining < 0) {
      return NextResponse.json(
        {error: 'Insufficient scan credits', credits: creditsSnapshot},
        {status: 402},
      )
    }

    const updated = []
    const preview = []
    for (const row of rows) {
      let extracted = null
      let recognitionError = null

      try {
        if (webEnrichmentOnly) {
          const guessedName =
            row.recognized_name ||
            row.recognized_payload?.guessed_name ||
            row.recognized_payload?.openai_payload?.result?.name ||
            null
          const guessedProducer =
            row.recognized_producer ||
            row.recognized_payload?.guessed_producer ||
            row.recognized_payload?.openai_payload?.result?.producer ||
            null
          extracted = {
            ok: !!(
              guessedName ||
              guessedProducer ||
              row.recognized_payload?.text_preview ||
              (Array.isArray(row.recognized_payload?.ranked_lines) &&
                row.recognized_payload.ranked_lines.length > 0)
            ),
            recognized_name: guessedName,
            recognized_producer: guessedProducer,
            recognized_vintage: row.recognized_vintage || null,
            recognition_confidence: row.recognition_confidence || null,
            recognized_payload: row.recognized_payload || {},
            warning_message: row.error_message || null,
            error:
              guessedName ||
              guessedProducer ||
              row.recognized_payload?.text_preview ||
              (Array.isArray(row.recognized_payload?.ranked_lines) &&
                row.recognized_payload.ranked_lines.length > 0)
                ? null
                : 'Bottle must be recognized before web search',
          }
        } else {
          const blob = await downloadStorageObjectWithFallback({
            supabase,
            bucket: row.storage_bucket || 'tasting-bottles',
            path: row.storage_path,
            request,
          })

          const openAIResult = await runOpenAIVisionRecognition(blob, {
            mimeType: row.mime_type,
            originalFilename: row.original_filename,
            storagePath: row.storage_path,
          })
          extracted = extractFromOpenAIRecognition(
            openAIResult,
            row.original_filename,
            row.storage_path,
          )
        }
        if (extracted?.ok) {
          extracted = await enrichWithWineCatalog(supabase, extracted, row.recognized_payload || {})
          const hasUsefulIdentity = !!(
            extracted?.recognized_name ||
            extracted?.recognized_producer ||
            extracted?.recognized_payload?.text_preview ||
            (Array.isArray(extracted?.recognized_payload?.ranked_lines) &&
              extracted.recognized_payload.ranked_lines.length > 0)
          )
          const hasCatalogMatch = !!extracted?.recognized_payload?.catalog_match?.matched
          const completionMeta = getBottleCompletionMetaFromExtracted(extracted)
          const autoWebEnrichmentMeta = getAutoWebEnrichmentMetaFromExtracted(extracted)
          const shouldAutoEnrichIncompleteBottle =
            completionMeta.percent < 80 || autoWebEnrichmentMeta.shouldAutoEnrich
          const hasCatalogSync =
            !!row?.recognized_payload?.catalog_sync?.synced ||
            !!extracted?.recognized_payload?.catalog_sync?.synced
          const existingWebEnrichment = row?.recognized_payload?.web_enrichment || null
          const existingCatalogDetails = row?.recognized_payload?.catalog_details || {}
          const alreadyEnriched = !!existingWebEnrichment?.applied
          const hasExistingGrapes =
            Array.isArray(existingCatalogDetails?.grapes) &&
            existingCatalogDetails.grapes.length > 0
          const hasExistingNarrative =
            !!existingCatalogDetails?.why_notable || !!existingCatalogDetails?.short_description
          const hasExistingSources =
            Array.isArray(existingWebEnrichment?.sources) &&
            existingWebEnrichment.sources.length > 0
          const hasExistingAveragePrice =
            existingCatalogDetails?.average_price != null || existingCatalogDetails?.price != null
          const hasExistingRegion =
            !!toNonEmptyString(
              existingCatalogDetails?.quiz_region || existingCatalogDetails?.region,
            )
          const hasExistingType = !!toNonEmptyString(existingCatalogDetails?.type)
          const hasExistingCountry = !!toNonEmptyString(existingCatalogDetails?.country)
          const needsCoreFieldEnrichment =
            !hasExistingCountry ||
            !hasExistingRegion ||
            !hasExistingType ||
            !hasExistingGrapes ||
            !hasExistingAveragePrice
          const needsNarrativeEnrichment = !hasExistingNarrative || !hasExistingSources
          const shouldPreferFreshWebEnrichment =
            shouldAutoEnrichIncompleteBottle ||
            needsCoreFieldEnrichment ||
            needsNarrativeEnrichment
          const hasSufficientCatalogData =
            hasCatalogMatch &&
            hasExistingCountry &&
            hasExistingRegion &&
            hasExistingType &&
            hasExistingGrapes &&
            hasExistingNarrative &&
            hasExistingSources &&
            hasExistingAveragePrice
          const shouldForceSkipWebEnrichment =
            !forceWebEnrichment &&
            !webEnrichmentOnly &&
            !shouldPreferFreshWebEnrichment &&
            (hasCatalogSync || alreadyEnriched)
          const shouldSkipWebEnrichmentOnly =
            webEnrichmentOnly &&
            !forceWebEnrichment &&
            !shouldPreferFreshWebEnrichment &&
            (hasCatalogSync || alreadyEnriched || hasSufficientCatalogData)
          const shouldRunWebEnrichment =
            useWebEnrichment &&
            hasUsefulIdentity &&
            !shouldForceSkipWebEnrichment &&
            !shouldSkipWebEnrichmentOnly &&
            (forceWebEnrichment ||
              (shouldAutoEnrichIncompleteBottle &&
                !(hasCatalogSync && !forceWebEnrichment) &&
                (!alreadyEnriched ||
                  !hasExistingGrapes ||
                  !hasExistingNarrative ||
                  !hasExistingSources ||
                  !hasExistingAveragePrice)))

          if (shouldRunWebEnrichment) {
            try {
              const webEnrichment = await runOpenAIWebEnrichment(extracted)
              if (webEnrichment?.skipped) {
                console.log('[auto-tasting] web enrichment skipped', {
                  imageId: row.id,
                  wine: extracted?.recognized_name || null,
                  producer: extracted?.recognized_producer || null,
                  reason: webEnrichment.reason,
                  forceWebEnrichment,
                  completionPercent: completionMeta.percent,
                  criticalMissingFields: autoWebEnrichmentMeta.criticalMissingFields,
                })
              } else {
                console.log('[auto-tasting] web enrichment result', {
                  imageId: row.id,
                  wine: extracted?.recognized_name || null,
                  producer: extracted?.recognized_producer || null,
                  forceWebEnrichment,
                  completionPercent: completionMeta.percent,
                  criticalMissingFields: autoWebEnrichmentMeta.criticalMissingFields,
                  parsed: webEnrichment?.parsed || null,
                  sources: webEnrichment?.sources || [],
                })
              }
              extracted = mergeWebEnrichment(extracted, webEnrichment)
            } catch (error) {
              console.log('[auto-tasting] web enrichment skipped', {
                imageId: row.id,
                wine: extracted?.recognized_name || null,
                producer: extracted?.recognized_producer || null,
                error: error?.message || 'web enrichment failed',
              })
              extracted.recognized_payload = {
                ...(extracted.recognized_payload || {}),
                web_enrichment: {
                  applied: false,
                  error: error?.message || 'web enrichment failed',
                },
              }
            }
          } else if (shouldForceSkipWebEnrichment) {
            extracted.recognized_payload = {
              ...(extracted.recognized_payload || {}),
              web_enrichment: {
                ...(row?.recognized_payload?.web_enrichment || {}),
                skipped: true,
                reason: hasCatalogSync ? 'catalog_sync_found' : 'already_enriched',
              },
            }
          } else if (shouldSkipWebEnrichmentOnly) {
            extracted.recognized_payload = {
              ...(extracted.recognized_payload || {}),
              web_enrichment: {
                ...(row?.recognized_payload?.web_enrichment || {}),
                applied: false,
                skipped: true,
                reason: hasCatalogSync
                  ? 'catalog_sync_found'
                  : alreadyEnriched
                    ? 'already_enriched'
                    : 'catalog_match_found',
              },
            }
          } else if (
            useWebEnrichment &&
            hasCatalogMatch &&
            hasExistingAveragePrice &&
            !shouldAutoEnrichIncompleteBottle
          ) {
            extracted.recognized_payload = {
              ...(extracted.recognized_payload || {}),
              web_enrichment: {
                ...(extracted.recognized_payload?.web_enrichment || {}),
                applied: false,
                skipped: true,
                reason: 'catalog_match_found',
              },
            }
          }
        }
      } catch (error) {
        recognitionError = error?.message || 'vision analysis failed'
        extracted = extractFromFilename(row.original_filename, row.storage_path)
        if (extracted.ok) {
          extracted.recognized_payload = {
            ...(extracted.recognized_payload || {}),
            fallback_after_vision_error: recognitionError,
          }
          extracted.recognition_confidence = 0.41
          extracted.warning_message = recognitionError
        }
      }

      if (!extracted?.ok) {
        const mergedFailedPayload = mergePersistentRecognitionPayload(
          row.recognized_payload,
          extracted?.recognized_payload || extracted?.payload || null,
        )
        const {data: failedRow, error: updateError} = await withTimeout(
          supabase
            .from('tasting_bottle_images')
            .update({
              status: 'failed',
              error_message: extracted?.error || recognitionError || 'extraction failed',
              recognized_payload: mergedFailedPayload,
            })
            .eq('id', row.id)
            .eq('uploaded_by', user.id)
            .select(
              'id, original_filename, storage_bucket, storage_path, status, recognized_name, recognized_producer, recognized_vintage, recognition_confidence, recognized_payload, error_message, created_at',
            )
            .single(),
          12000,
          'update failed row',
        )
        if (updateError) {
          return NextResponse.json({error: updateError.message}, {status: 500})
        }
        updated.push(failedRow)
        continue
      }

      const mergedRecognizedPayload = mergePersistentRecognitionPayload(
        row.recognized_payload,
        extracted.recognized_payload,
      )

      if (previewWebEnrichment && webEnrichmentOnly) {
        preview.push({
          id: row.id,
          current: buildImagePreviewRow(row),
          proposed: buildImagePreviewRow(row, {
            status: 'recognized',
            recognized_name: extracted.recognized_name,
            recognized_producer: extracted.recognized_producer,
            recognized_vintage: extracted.recognized_vintage,
            recognition_confidence: extracted.recognition_confidence,
            recognized_payload: mergedRecognizedPayload,
            error_message: extracted.warning_message || null,
          }),
          usage:
            extracted?.recognized_payload?.web_enrichment?.usage ||
            mergedRecognizedPayload?.web_enrichment?.usage ||
            null,
        })
        continue
      }

      const {data: recognizedRow, error: updateError} = await withTimeout(
        supabase
          .from('tasting_bottle_images')
          .update({
            status: 'recognized',
            recognized_name: extracted.recognized_name,
            recognized_producer: extracted.recognized_producer,
            recognized_vintage: extracted.recognized_vintage,
            recognition_confidence: extracted.recognition_confidence,
            recognized_payload: mergedRecognizedPayload,
            error_message: extracted.warning_message || null,
          })
          .eq('id', row.id)
          .eq('uploaded_by', user.id)
          .select(
            'id, original_filename, storage_bucket, storage_path, status, recognized_name, recognized_producer, recognized_vintage, recognition_confidence, recognized_payload, error_message, created_at',
          )
          .single(),
        12000,
        'update recognized row',
      )
      if (updateError) {
        return NextResponse.json({error: updateError.message}, {status: 500})
      }
      updated.push(recognizedRow)
    }

    return NextResponse.json({
      ok: true,
      updated,
      preview,
      credits: await loadAiScanCredits(supabase, user.id),
    })
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
