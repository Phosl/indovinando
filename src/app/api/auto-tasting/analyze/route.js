import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createClient} from '@supabase/supabase-js'

const GOOGLE_CLOUD_VISION_API_KEY = process.env.GOOGLE_CLOUD_VISION_API_KEY
const WINE_API_KEY = process.env.WINE_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
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

const COUNTRY_HINTS = [
  {canonical: 'Italy', aliases: ['italia', 'italy', 'italian', 'italiano', 'italiana']},
  {canonical: 'Spain', aliases: ['spagna', 'spain', 'spanish', 'espanol', 'español']},
  {canonical: 'France', aliases: ['francia', 'france', 'french', 'francese']},
]

const TASTING_IMAGE_LOAD_FIELDS =
  'id, uploaded_by, storage_bucket, storage_path, original_filename, mime_type, status, recognized_name, recognized_producer, recognized_vintage, recognition_confidence'

const TASTING_IMAGE_RETURN_FIELDS =
  'id, original_filename, storage_bucket, storage_path, status, recognized_name, recognized_producer, recognized_vintage, recognition_confidence, recognized_payload, error_message, created_at'

const ALLOWED_WINE_TYPES = new Set([
  'red',
  'white',
  'rose',
  'sparkling',
  'orange',
  'dessert',
  'fortified',
])

function createCatalogWriteClient(fallback) {
  if (SUPABASE_URL && SERVICE_ROLE_KEY) {
    return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {persistSession: false, autoRefreshToken: false},
    })
  }
  return fallback
}

function toNullableTrimmed(value) {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized : null
}

function mapWineType(value) {
  const normalized = normalizeForCheck(value)
  if (!normalized) return null
  if (normalized === 'rose' || normalized === 'rosee') return 'rose'
  if (ALLOWED_WINE_TYPES.has(normalized)) return normalized
  return null
}

function buildWineApiQuery(extracted) {
  const parts = [
    toNullableTrimmed(extracted?.recognized_name),
    toNullableTrimmed(extracted?.recognized_producer),
  ].filter(Boolean)
  return parts.join(' ').trim()
}

function toNumericOrNull(value) {
  if (value == null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const normalized = String(value).replace(',', '.').trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function extractWineApiGrapes(details) {
  const candidates = []
  const pushValue = (value) => {
    const normalized = toNullableTrimmed(value)
    if (normalized) candidates.push(normalized)
  }

  const fromList = (list) => {
    if (!Array.isArray(list)) return
    for (const item of list) {
      if (typeof item === 'string') {
        pushValue(item)
        continue
      }
      if (item && typeof item === 'object') {
        pushValue(item.name)
        pushValue(item.grape)
        pushValue(item.variety)
      }
    }
  }

  fromList(details?.grapes)
  fromList(details?.varieties)

  const unique = [...new Set(candidates.map((v) => v.toLowerCase()))]
  return unique
    .map((lower) => {
      const original = candidates.find((v) => v.toLowerCase() === lower)
      return original || null
    })
    .filter(Boolean)
}

function extractWineApiPrice(details, searchTop) {
  const price =
    toNumericOrNull(details?.averagePrice) ||
    toNumericOrNull(details?.avgPrice) ||
    toNumericOrNull(details?.price?.amount) ||
    toNumericOrNull(details?.price) ||
    toNumericOrNull(searchTop?.averagePrice) ||
    toNumericOrNull(searchTop?.avgPrice)

  const currency =
    toNullableTrimmed(details?.currency) ||
    toNullableTrimmed(details?.price?.currency) ||
    toNullableTrimmed(searchTop?.currency)

  return {price, currency}
}

async function fetchWineApiDetails(wineId) {
  if (!wineId || !WINE_API_KEY) return null
  const endpoint = `https://api.wineapi.io/wines/${encodeURIComponent(wineId)}`
  const response = await withTimeout(
    fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-API-Key': WINE_API_KEY,
      },
      cache: 'no-store',
    }),
    12000,
    'wineapi details',
  )

  const json = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(json?.message || `wineapi details http ${response.status}`)
  }
  return json || null
}

async function searchWineApi(extracted) {
  if (!WINE_API_KEY) {
    console.log('[auto-tasting] ricerca wine api: skip (missing WINE_API_KEY)')
    return null
  }

  const q = buildWineApiQuery(extracted)
  const searchContext = getWineApiSearchContext(extracted)
  const regionHint = detectRegionHint(searchContext)
  const countryHint = detectCountryHint(searchContext)
  console.log('[auto-tasting] ricerca wine api', {query: q || null, countryHint})
  if (!q) {
    console.log('[auto-tasting] risultato wine api', {matched: false, reason: 'empty query'})
    return null
  }

  const endpoint = `https://api.wineapi.io/wines/search?q=${encodeURIComponent(q)}&limit=5&offset=0`
  const response = await withTimeout(
    fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-API-Key': WINE_API_KEY,
      },
      cache: 'no-store',
    }),
    12000,
    'wineapi search',
  )

  const json = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(json?.message || `wineapi http ${response.status}`)
  }

  const results = Array.isArray(json?.results) ? json.results : []
  if (!results.length) {
    console.log('[auto-tasting] risultato wine api', {
      matched: false,
      reason: 'no results',
      query: q,
    })
    return null
  }

  const rankedResults = results
    .map((result, index) => ({
      result,
      index,
      score: scoreWineApiResult(result, extracted, countryHint, regionHint),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)

  const top = rankedResults[0]?.result || results[0]
  console.log('[auto-tasting] risultato wine api', {
    query: q,
    top,
    ranking: rankedResults.slice(0, 3).map(({result, score}) => ({
      id: result?.id || null,
      name: result?.name || null,
      winery: result?.winery || null,
      country: result?.country || null,
      region: result?.region || null,
      score: Number(score.toFixed(3)),
    })),
  })

  let details = null
  try {
    details = await fetchWineApiDetails(top?.id)
  } catch {
    details = null
  }

  const {price, currency} = extractWineApiPrice(details, top)
  const grapes = extractWineApiGrapes(details)
  const country = toNullableTrimmed(top?.country)
  const region = toNullableTrimmed(top?.region)
  return {
    id: toNullableTrimmed(top?.id),
    name: toNullableTrimmed(top?.name),
    winery: toNullableTrimmed(top?.winery),
    region,
    country,
    type: mapWineType(top?.type),
    vintage:
      Number.isInteger(top?.vintage) && top.vintage >= 1800 && top.vintage <= 2100
        ? top.vintage
        : null,
    grapes,
    price,
    currency,
    confidence: Number(top?.confidence || 0) > 0 ? Number(top.confidence) : null,
    recognized_country: country,
    recognized_region: region,
    raw: top,
    raw_details: details,
  }
}

async function upsertWineApiMatchIntoCatalog(db, wineApiMatch) {
  if (!wineApiMatch?.name) return null

  const producerName = wineApiMatch.winery || 'Unknown'
  const producerNormalized = toNormalizedKey(producerName)
  const labelName = wineApiMatch.name
  const labelNormalized = toNormalizedKey(labelName)
  const labelAppellation = null
  const labelAppellationKey = ''

  if (!producerNormalized || !labelNormalized) return null

  let producerId = null
  const {data: existingProducer} = await withTimeout(
    db.from('wine_producers').select('id').eq('normalized_name', producerNormalized).maybeSingle(),
    10000,
    'catalog producer lookup',
  )

  if (existingProducer?.id) {
    producerId = existingProducer.id
  } else {
    const {data: insertedProducer, error: producerInsertError} = await withTimeout(
      db
        .from('wine_producers')
        .insert({
          name: producerName,
          normalized_name: producerNormalized,
          country: wineApiMatch.country,
          region: wineApiMatch.region,
        })
        .select('id')
        .maybeSingle(),
      10000,
      'catalog producer insert',
    )
    if (producerInsertError) {
      throw new Error(`producer upsert failed: ${producerInsertError.message}`)
    }
    producerId = insertedProducer?.id || null
  }

  if (!producerId) return null

  const {data: labels} = await withTimeout(
    db
      .from('wine_labels')
      .select('id, appellation')
      .eq('normalized_name', labelNormalized)
      .eq('producer_id', producerId)
      .limit(20),
    10000,
    'catalog label lookup',
  )

  const matchedLabel = (labels || []).find(
    (row) => (row?.appellation || '') === labelAppellationKey,
  )

  let labelId = matchedLabel?.id || null
  if (!labelId) {
    const {data: insertedLabel, error: labelInsertError} = await withTimeout(
      db
        .from('wine_labels')
        .insert({
          producer_id: producerId,
          name: labelName,
          normalized_name: labelNormalized,
          appellation: labelAppellation,
          country: wineApiMatch.country,
          region: wineApiMatch.region,
          type: wineApiMatch.type,
          search_text: [labelName, producerName, wineApiMatch.region, wineApiMatch.country]
            .filter(Boolean)
            .join(' '),
        })
        .select('id')
        .maybeSingle(),
      10000,
      'catalog label insert',
    )
    if (labelInsertError) {
      throw new Error(`label upsert failed: ${labelInsertError.message}`)
    }
    labelId = insertedLabel?.id || null
  }

  if (!labelId) return null

  let vintageId = null
  if (wineApiMatch.vintage) {
    const {data: existingVintage} = await withTimeout(
      db
        .from('wine_vintages')
        .select('id')
        .eq('wine_label_id', labelId)
        .eq('vintage', wineApiMatch.vintage)
        .maybeSingle(),
      10000,
      'catalog vintage lookup',
    )

    if (existingVintage?.id) {
      vintageId = existingVintage.id
    } else {
      const {data: insertedVintage, error: vintageInsertError} = await withTimeout(
        db
          .from('wine_vintages')
          .insert({
            wine_label_id: labelId,
            vintage: wineApiMatch.vintage,
            price: wineApiMatch.price,
            currency: wineApiMatch.currency,
            confidence: wineApiMatch.confidence,
            last_seen_at: new Date().toISOString(),
          })
          .select('id')
          .maybeSingle(),
        10000,
        'catalog vintage insert',
      )
      if (vintageInsertError) {
        throw new Error(`vintage upsert failed: ${vintageInsertError.message}`)
      }
      vintageId = insertedVintage?.id || null
    }

    if (vintageId) {
      await withTimeout(
        db
          .from('wine_vintages')
          .update({
            price: wineApiMatch.price,
            currency: wineApiMatch.currency,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', vintageId),
        10000,
        'catalog vintage refresh',
      ).catch(() => null)
    }
  }

  if (labelId && Array.isArray(wineApiMatch.grapes) && wineApiMatch.grapes.length > 0) {
    const normalizedGrapes = [
      ...new Set(wineApiMatch.grapes.map((g) => toNormalizedKey(g)).filter(Boolean)),
    ]
    for (const normalizedName of normalizedGrapes) {
      let grapeId = null
      const {data: existingGrape} = await withTimeout(
        db.from('wine_grapes').select('id').eq('normalized_name', normalizedName).maybeSingle(),
        10000,
        'catalog grape lookup',
      )
      if (existingGrape?.id) {
        grapeId = existingGrape.id
      } else {
        const displayName =
          wineApiMatch.grapes.find((g) => toNormalizedKey(g) === normalizedName) || normalizedName
        const {data: insertedGrape} = await withTimeout(
          db
            .from('wine_grapes')
            .insert({
              name: capitalizeWords(displayName),
              normalized_name: normalizedName,
            })
            .select('id')
            .maybeSingle(),
          10000,
          'catalog grape insert',
        ).catch(() => ({data: null}))
        grapeId = insertedGrape?.id || null
      }

      if (grapeId) {
        await withTimeout(
          db.from('wine_label_grapes').insert({
            wine_label_id: labelId,
            grape_id: grapeId,
          }),
          10000,
          'catalog label-grape insert',
        ).catch(() => null)
      }
    }
  }

  if (vintageId) {
    await withTimeout(
      db.from('wine_sources').insert({
        wine_vintage_id: vintageId,
        source: 'wineapi.io',
        source_url: wineApiMatch.id ? `https://wineapi.io/wines/${wineApiMatch.id}` : null,
        price: wineApiMatch.price,
        currency: wineApiMatch.currency,
        scraped_at: new Date().toISOString(),
        confidence: wineApiMatch.confidence,
        raw_payload:
          wineApiMatch.raw_details || wineApiMatch.raw
            ? {
                search: wineApiMatch.raw || null,
                details: wineApiMatch.raw_details || null,
                grapes: wineApiMatch.grapes || [],
              }
            : null,
      }),
      10000,
      'catalog source insert',
    ).catch(() => null)
  }

  return {
    producerId,
    labelId,
    vintageId,
  }
}

async function enrichWithWineApiAndPersist({supabase, catalogDb, extracted}) {
  if (!extracted?.ok) return extracted

  console.log('[auto-tasting] ricerca wine api: start enrich', {
    recognized_name: extracted.recognized_name || null,
    recognized_producer: extracted.recognized_producer || null,
  })

  let match = null
  try {
    match = await searchWineApi(extracted)
  } catch (error) {
    return {
      ...extracted,
      warning_message: extracted.warning_message || `wineapi search failed: ${error.message}`,
      recognized_payload: {
        ...(extracted.recognized_payload || {}),
        wineapi: {
          ok: false,
          error: error.message,
        },
      },
    }
  }

  if (!match) {
    console.log('[auto-tasting] risultato wine api', {
      matched: false,
      reason: 'search returned null',
    })
    return {
      ...extracted,
      recognized_payload: {
        ...(extracted.recognized_payload || {}),
        wineapi: {
          ok: true,
          matched: false,
        },
      },
    }
  }

  let persisted = null
  try {
    persisted = await upsertWineApiMatchIntoCatalog(catalogDb || supabase, match)
  } catch (error) {
    persisted = {
      error: error.message,
    }
  }

  console.log('[auto-tasting] risultato wine api', {
    matched: true,
    id: match.id,
    name: match.name,
    winery: match.winery,
    region: match.region,
    country: match.country,
    vintage: match.vintage,
    grapes: match.grapes || [],
    price: match.price,
    currency: match.currency,
    persisted,
  })

  const wineApiResult = extracted.recognized_payload?.wineapi?.result || null

  return {
    ...extracted,
    recognized_name: extracted.recognized_name || match.name,
    recognized_producer: extracted.recognized_producer || match.winery,
    recognized_vintage: extracted.recognized_vintage || match.vintage,
    recognized_country: extracted.recognized_country || wineApiResult?.country || match.country || null,
    recognized_region: extracted.recognized_region || wineApiResult?.region || match.region || null,
    recognition_confidence: Math.max(
      Number(extracted.recognition_confidence || 0),
      Math.min(0.92, Math.max(Number(match.confidence || 0.55), 0.55)),
    ),
    recognized_payload: {
      ...(extracted.recognized_payload || {}),
      catalog_details: {
        ...(extracted.recognized_payload?.catalog_details || {}),
        grapes:
          Array.isArray(extracted.recognized_payload?.catalog_details?.grapes) &&
          extracted.recognized_payload.catalog_details.grapes.length
            ? extracted.recognized_payload.catalog_details.grapes
            : match.grapes || [],
        price:
          extracted.recognized_payload?.catalog_details?.price != null
            ? extracted.recognized_payload.catalog_details.price
            : match.price,
        currency: extracted.recognized_payload?.catalog_details?.currency || match.currency || null,
        country:
          extracted.recognized_payload?.catalog_details?.country || wineApiResult?.country || match.country || null,
        region:
          extracted.recognized_payload?.catalog_details?.region || wineApiResult?.region || match.region || null,
      },
      wineapi: {
        ok: true,
        matched: true,
        id: match.id,
        confidence: match.confidence,
        result: {
          name: match.name,
          winery: match.winery,
          region: wineApiResult?.region || match.region || null,
          country: wineApiResult?.country || match.country || null,
          type: match.type,
          vintage: match.vintage,
          grapes: match.grapes || [],
          price: match.price,
          currency: match.currency,
        },
        persisted,
      },
    },
  }
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

function detectCountryHint(value) {
  const normalized = normalizeForCheck(value)
  if (!normalized) return null
  for (const country of COUNTRY_HINTS) {
    for (const alias of country.aliases) {
      if (normalized.includes(alias)) return country.canonical
    }
  }
  return null
}

function getWineApiSearchContext(extracted) {
  return [
    extracted?.recognized_payload?.text_preview,
    ...(Array.isArray(extracted?.recognized_payload?.ranked_lines)
      ? extracted.recognized_payload.ranked_lines.slice(0, 8)
      : []),
    extracted?.recognized_name,
    extracted?.recognized_producer,
  ]
    .filter(Boolean)
    .join(' ')
}

function normalizeCountryName(value) {
  const normalized = normalizeForCheck(value)
  if (!normalized) return null
  if (
    normalized.includes('italy') ||
    normalized.includes('italia') ||
    normalized.includes('italian')
  ) {
    return 'Italy'
  }
  if (
    normalized.includes('spain') ||
    normalized.includes('spagna') ||
    normalized.includes('spanish')
  ) {
    return 'Spain'
  }
  if (
    normalized.includes('france') ||
    normalized.includes('francia') ||
    normalized.includes('french')
  ) {
    return 'France'
  }
  return capitalizeWords(value)
}

function scoreWineApiResult(result, extracted, countryHint, regionHint) {
  const guessedName = extracted?.recognized_name || ''
  const guessedProducer = extracted?.recognized_producer || ''
  const nameScore = Math.max(
    overlapScore(guessedName, result?.name),
    overlapScore(guessedName, result?.label),
    overlapScore(guessedName, result?.wine),
  )
  const producerScore = Math.max(
    overlapScore(guessedProducer, result?.winery),
    overlapScore(guessedProducer, result?.producer),
    overlapScore(guessedProducer, result?.maker),
  )
  const resultRegion = detectRegionHint(
    [result?.region, result?.appellation].filter(Boolean).join(' '),
  )
  const resultCountry = normalizeCountryName(result?.country)

  let countryScore = 0
  if (countryHint) {
    if (resultCountry === countryHint) countryScore += 0.22
    else if (resultCountry) countryScore -= 0.16
  }
  if (regionHint && resultRegion) {
    countryScore += resultRegion === regionHint ? 0.1 : -0.08
  }
  if (countryHint === 'Italy' && resultCountry === 'Italy') {
    countryScore += 0.08
  }

  const apiConfidence = Number(result?.confidence || 0)
  return nameScore * 0.56 + producerScore * 0.22 + countryScore + apiConfidence * 0.12
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

function extractFromOcrText(rawText, originalFilename, storagePath) {
  const sourceText = String(rawText || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!sourceText) {
    return {ok: false, error: 'OCR empty text'}
  }

  const lines = String(rawText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20)

  const rankedLines = lines.filter((line) => !looksLikeNoiseLine(line))
  const nonYearLines = rankedLines.filter((line) => !/\b(19|20)\d{2}\b/.test(line))
  const candidateProducer =
    nonYearLines.find((line) => {
      const words = normalizeForCheck(line).split(' ').filter(Boolean)
      return words.length >= 1 && words.length <= 5 && !/\d/.test(line)
    }) ||
    nonYearLines[0] ||
    ''
  const producer =
    candidateProducer.split(' ').length <= 6 && candidateProducer.length <= 60
      ? capitalizeWords(candidateProducer)
      : null

  const vintage = extractVintage(sourceText)

  let name = null
  const nameCandidates = nonYearLines.filter(
    (line) =>
      normalizeForCheck(line) !== normalizeForCheck(producer) &&
      !looksLikeRegionOnly(line) &&
      !looksLikeInstitutionalLine(line) &&
      !looksLikeInstitutionalFragment(line) &&
      line.length <= 80,
  )
  if (nameCandidates.length >= 1) {
    name = cleanWineName(nameCandidates[0])
  } else if (nonYearLines.length === 1) {
    const words = nonYearLines[0].split(' ').filter(Boolean)
    if (words.length > 1) {
      name = cleanWineName(words.slice(1).join(' '))
    }
  }

  if (name && (looksLikeInstitutionalLine(name) || looksLikeInstitutionalFragment(name))) {
    name = null
  }

  const payload = {
    provider: 'google_vision_api',
    extractor: 'google-vision-v1',
    text_preview: sourceText.slice(0, 400),
    lines,
    ranked_lines: rankedLines,
    guessed_producer: producer,
    guessed_name: name,
    guessed_vintage: vintage,
  }

  if (!name && !producer && !vintage) {
    const fallback = extractFromFilename(originalFilename, storagePath)
    if (fallback.ok) {
      return {
        ...fallback,
        recognized_payload: {
          ...fallback.recognized_payload,
          ocr_payload: payload,
          fallback_used: true,
        },
        recognition_confidence: 0.42,
      }
    }
    return {ok: false, error: 'No structured data found in OCR and filename', payload}
  }

  let confidence = name && producer && vintage ? 0.82 : name || producer ? 0.69 : 0.58
  if (name && looksLikeRegionOnly(name)) confidence = Math.min(confidence, 0.52)
  if (!vintage) confidence -= 0.06
  if (!name || !producer) confidence -= 0.05
  confidence = Math.max(0.35, Math.min(0.9, confidence))
  return {
    ok: true,
    recognized_name: name || fallbackNameFromFilename(originalFilename),
    recognized_producer: producer || null,
    recognized_vintage: vintage,
    recognition_confidence: confidence,
    recognized_payload: payload,
  }
}

function fallbackNameFromFilename(originalFilename) {
  const base = normalizeToken(originalFilename || '')
  if (!base) return null
  return cleanWineName(base.replace(/\b(19|20)\d{2}\b/g, '').trim()) || null
}

async function runGoogleVisionOcr(blob) {
  if (!GOOGLE_CLOUD_VISION_API_KEY) {
    throw new Error('GOOGLE_CLOUD_VISION_API_KEY not configured')
  }

  const bytes = new Uint8Array(await blob.arrayBuffer())
  const base64 = Buffer.from(bytes).toString('base64')
  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`
  const body = {
    requests: [
      {
        image: {content: base64},
        features: [{type: 'TEXT_DETECTION'}],
      },
    ],
  }

  const response = await withTimeout(
    fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    }),
    30000,
    'google vision request',
  )

  const json = await response.json().catch(() => null)
  if (!response.ok) {
    const msg = json?.error?.message || `Vision HTTP ${response.status}`
    throw new Error(msg)
  }

  const first = json?.responses?.[0]
  if (first?.error?.message) {
    throw new Error(first.error.message)
  }

  return first?.fullTextAnnotation?.text || ''
}

async function enrichWithWineCatalog(supabase, extracted) {
  const guessedName = extracted?.recognized_name || ''
  const guessedProducer = extracted?.recognized_producer || ''
  if (!guessedName && !guessedProducer) return extracted

  const keyName = toNormalizedKey(guessedName)
  const keyProducer = toNormalizedKey(guessedProducer)
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
      .select('id, name, normalized_name, producer_id, appellation, country, region, type')
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

  let best = null
  for (const label of labels) {
    const producer = producersMap.get(label.producer_id) || null
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
    const score = labelNameScore * 0.72 + producerScore * 0.28 + regionScore
    if (!best || score > best.score) {
      best = {label, producer, score, labelNameScore, producerScore}
    }
  }

  if (!best || best.score < 0.35) return extracted

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
      .select('vintage, price, currency, price_band, last_seen_at')
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
  const latestWithPrice = (vintages || []).find((v) => v?.price != null) || null

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
        price: latestWithPrice?.price ?? null,
        currency: latestWithPrice?.currency ?? null,
        price_band: latestWithPrice?.price_band || null,
        body: best.label?.body || null,
        acidity: best.label?.acidity || null,
        elaborate: best.label?.elaborate || null,
        harmonize: best.label?.harmonize || null,
      },
    },
  }
}

export async function POST(request) {
  try {
    const supabase = await createServerSupabase()
    const catalogDb = createCatalogWriteClient(supabase)
    const {
      data: {user},
    } = await withTimeout(supabase.auth.getUser(), 8000, 'auth getUser')

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const body = await request.json().catch(() => ({}))
    const imageId = String(body?.imageId ?? '').trim()
    const analyzeAll = Boolean(body?.analyzeAll)
    const imageIds = Array.isArray(body?.imageIds)
      ? [...new Set(body.imageIds.map((id) => String(id || '').trim()).filter((id) => isUuid(id)))]
      : []

    let query = supabase
      .from('tasting_bottle_images')
      .select(TASTING_IMAGE_LOAD_FIELDS)
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
      return NextResponse.json({ok: true, updated: []})
    }

    const updated = []
    for (const row of rows) {
      let extracted = null
      let ocrError = null

      try {
        const blob = await downloadStorageObjectWithFallback({
          supabase,
          bucket: row.storage_bucket || 'tasting-bottles',
          path: row.storage_path,
          request,
        })

        const ocrText = await runGoogleVisionOcr(blob)
        extracted = extractFromOcrText(ocrText, row.original_filename, row.storage_path)
        if (extracted?.ok) {
          extracted = await enrichWithWineCatalog(supabase, extracted)
          const hasCatalogMatch = Boolean(extracted?.recognized_payload?.catalog_match?.matched)
          console.log('[auto-tasting] wine api gate', {
            hasCatalogMatch,
            hasWineApiKey: Boolean(WINE_API_KEY),
          })
          if (!hasCatalogMatch && WINE_API_KEY) {
            extracted = await enrichWithWineApiAndPersist({
              supabase,
              catalogDb,
              extracted,
            })
          } else {
            console.log('[auto-tasting] ricerca wine api: skip', {
              reason: hasCatalogMatch ? 'catalog_match_found' : 'missing_wine_api_key',
            })
          }
        }
      } catch (error) {
        ocrError = error?.message || 'ocr failed'
        extracted = extractFromFilename(row.original_filename, row.storage_path)
        if (extracted.ok) {
          extracted.recognized_payload = {
            ...(extracted.recognized_payload || {}),
            fallback_after_ocr_error: ocrError,
          }
          extracted.recognition_confidence = 0.41
          extracted.warning_message = ocrError
        }
      }

      if (!extracted?.ok) {
        const {data: failedRow, error: updateError} = await withTimeout(
          supabase
            .from('tasting_bottle_images')
            .update({
              status: 'failed',
              error_message: extracted?.error || ocrError || 'extraction failed',
              recognized_payload: extracted?.recognized_payload || extracted?.payload || null,
            })
            .eq('id', row.id)
            .eq('uploaded_by', user.id)
            .select(TASTING_IMAGE_RETURN_FIELDS)
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

      const {data: recognizedRow, error: updateError} = await withTimeout(
        supabase
          .from('tasting_bottle_images')
          .update({
            status: 'recognized',
            recognized_name: extracted.recognized_name,
            recognized_producer: extracted.recognized_producer,
            recognized_vintage: extracted.recognized_vintage,
            recognition_confidence: extracted.recognition_confidence,
            recognized_payload: extracted.recognized_payload,
            error_message: extracted.warning_message || null,
          })
          .eq('id', row.id)
          .eq('uploaded_by', user.id)
          .select(TASTING_IMAGE_RETURN_FIELDS)
          .single(),
        12000,
        'update recognized row',
      )
      if (updateError) {
        return NextResponse.json({error: updateError.message}, {status: 500})
      }
      updated.push(recognizedRow)
    }

    return NextResponse.json({ok: true, updated})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
