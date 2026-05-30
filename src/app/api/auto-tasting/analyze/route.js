import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'

const GOOGLE_CLOUD_VISION_API_KEY = process.env.GOOGLE_CLOUD_VISION_API_KEY
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

function withTimeout(promise, ms, label) {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
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
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function cleanWineName(value) {
  const tokens = String(value || '')
    .split(/\s+/)
    .map(part => part.trim())
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

  const filtered = tokens.filter(token => {
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
  const noiseHits = words.filter(word => WINE_NOISE_TERMS.has(word)).length
  return noiseHits >= Math.max(2, Math.floor(words.length * 0.6))
}

function looksLikeRegionOnly(value) {
  const normalized = normalizeForCheck(value)
  if (!normalized) return false
  const words = normalized.split(' ').filter(Boolean)
  if (!words.length || words.length > 3) return false
  return words.every(word => WINE_NOISE_TERMS.has(word))
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

function parseFilenameParts(originalFilename, storagePath) {
  const raw = String(originalFilename || storagePath || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .trim()
  if (!raw) return []

  // Keep separators meaningful before full normalization.
  const parts = raw
    .split(/[_|,-]+/)
    .map(part => normalizeToken(part))
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
    .map(part => normalizeToken(part))
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
  const sourceText = String(rawText || '').replace(/\s+/g, ' ').trim()
  if (!sourceText) {
    return {ok: false, error: 'OCR empty text'}
  }

  const lines = String(rawText || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 20)

  const rankedLines = lines.filter(line => !looksLikeNoiseLine(line))
  const nonYearLines = rankedLines.filter(line => !/\b(19|20)\d{2}\b/.test(line))
  const candidateProducer =
    nonYearLines.find(line => {
      const words = normalizeForCheck(line).split(' ').filter(Boolean)
      return words.length >= 1 && words.length <= 5 && !/\d/.test(line)
    }) || nonYearLines[0] || ''
  const producer =
    candidateProducer.split(' ').length <= 6 && candidateProducer.length <= 60
      ? capitalizeWords(candidateProducer)
      : null

  const vintage = extractVintage(sourceText)

  let name = null
  const nameCandidates = nonYearLines.filter(
    line =>
      normalizeForCheck(line) !== normalizeForCheck(producer) &&
      !looksLikeRegionOnly(line) &&
      !looksLikeInstitutionalLine(line) &&
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

  let labelsQuery = supabase
    .from('wine_labels')
    .select('id, name, normalized_name, producer_id, appellation, country, region, type')
    .limit(120)

  if (firstNameToken) {
    labelsQuery = labelsQuery.or(
      `normalized_name.ilike.%${firstNameToken}%,name.ilike.%${firstNameToken}%`,
    )
  }

  const {data: labels, error: labelsError} = await withTimeout(labelsQuery, 10000, 'catalog labels')
  if (labelsError || !labels?.length) return extracted

  const producerIds = [...new Set(labels.map(l => l.producer_id).filter(Boolean))]
  let producersMap = new Map()
  if (producerIds.length) {
    const {data: producers} = await withTimeout(
      supabase
        .from('wine_producers')
        .select('id, name, normalized_name')
        .in('id', producerIds),
      10000,
      'catalog producers',
    )
    producersMap = new Map((producers || []).map(p => [p.id, p]))
  }

  let best = null
  for (const label of labels) {
    const producer = producersMap.get(label.producer_id) || null
    const labelNameScore = Math.max(
      overlapScore(guessedName, label.name),
      overlapScore(guessedName, label.normalized_name),
    )
    const producerScore = producer
      ? Math.max(overlapScore(guessedProducer, producer.name), overlapScore(guessedProducer, producer.normalized_name))
      : 0
    const score = labelNameScore * 0.72 + producerScore * 0.28
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

  const grapes = (labelGrapes || [])
    .map(row => row?.wine_grapes?.name)
    .filter(Boolean)

  const {data: vintages} = await withTimeout(
    supabase
      .from('wine_vintages')
      .select('vintage, price, currency, last_seen_at')
      .eq('wine_label_id', best.label.id)
      .order('last_seen_at', {ascending: false})
      .limit(8),
    10000,
    'catalog vintages',
  ).catch(() => ({data: []}))

  const knownVintages = [...new Set((vintages || []).map(v => v?.vintage).filter(Boolean))]
  const latestWithPrice = (vintages || []).find(v => v?.price != null) || null

  const resolvedVintage =
    extracted?.recognized_vintage && knownVintages.includes(extracted.recognized_vintage)
      ? extracted.recognized_vintage
      : extracted?.recognized_vintage || knownVintages[0] || null

  const boostedConfidence = Math.min(
    0.94,
    Math.max(Number(extracted.recognition_confidence || 0), 0.68 + best.score * 0.2),
  )

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
        appellation: best.label?.appellation || null,
        country: best.label?.country || null,
        region: best.label?.region || null,
        type: best.label?.type || null,
        grapes,
        known_vintages: knownVintages,
        price: latestWithPrice?.price ?? null,
        currency: latestWithPrice?.currency ?? null,
      },
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

    let query = supabase
      .from('tasting_bottle_images')
      .select(
        'id, uploaded_by, storage_bucket, storage_path, original_filename, mime_type, status, recognized_name, recognized_producer, recognized_vintage, recognition_confidence',
      )
      .eq('uploaded_by', user.id)
      .order('created_at', {ascending: false})
      .limit(50)

    if (imageId) {
      query = query.eq('id', imageId)
    } else if (analyzeAll) {
      query = query.in('status', ['processing', 'uploaded', 'failed'])
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
        const {data: blob, error: blobError} = await withTimeout(
          supabase.storage.from(row.storage_bucket || 'tasting-bottles').download(row.storage_path),
          30000,
          'storage download',
        )
        if (blobError || !blob) {
          throw new Error(blobError?.message || 'storage download failed')
        }

        const ocrText = await runGoogleVisionOcr(blob)
        extracted = extractFromOcrText(ocrText, row.original_filename, row.storage_path)
        if (extracted?.ok) {
          extracted = await enrichWithWineCatalog(supabase, extracted)
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

    return NextResponse.json({ok: true, updated})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
