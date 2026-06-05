import {NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import {createServerSupabase} from '@/lib/supabaseServer'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function createWriteClient(fallbackClient) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return fallbackClient
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {persistSession: false, autoRefreshToken: false},
  })
}

function withTimeout(promise, ms, label) {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
}

function toNullableTrimmed(value) {
  const trimmed = String(value || '').trim()
  return trimmed || null
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

function normalizeCanonicalName(value) {
  const normalized = normalizeForCheck(value)
  return normalized || null
}

function capitalizeWords(value) {
  return String(value || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function mapWineType(value) {
  const normalized = normalizeForCheck(value)
  if (!normalized) return null
  if (normalized === 'red' || normalized === 'rosso') return 'red'
  if (normalized === 'white' || normalized === 'bianco') return 'white'
  if (normalized === 'rose' || normalized === 'rosato' || normalized === 'rose') return 'rose'
  if (normalized === 'sparkling' || normalized === 'spumante') return 'sparkling'
  if (normalized === 'orange') return 'orange'
  if (normalized === 'dessert' || normalized === 'dolce') return 'dessert'
  if (normalized === 'fortified' || normalized === 'liquoroso') return 'fortified'
  return null
}

function buildSearchText(image) {
  const payload = image?.recognized_payload || {}
  const details = payload.catalog_details || {}
  return [
    image?.recognized_name,
    image?.recognized_producer,
    details.country,
    details.quiz_region || details.region,
    details.quiz_appellation || details.appellation,
    Array.isArray(details.grapes) ? details.grapes.join(', ') : null,
    payload.text_preview,
  ]
    .filter(Boolean)
    .join(' · ')
}

function buildLabelNotes(image) {
  const details = image?.recognized_payload?.catalog_details || {}
  const notes = [
    details.why_notable ? `Why notable: ${details.why_notable}` : null,
    details.short_description ? `Web summary: ${details.short_description}` : null,
  ].filter(Boolean)
  return notes.length ? notes.join(' | ') : null
}

function isMissingColumnError(error) {
  const message = String(error?.message || '').toLowerCase()
  return (
    (message.includes('column') && message.includes('does not exist')) ||
    (message.includes('column') && message.includes('schema cache')) ||
    message.includes('could not find the')
  )
}

function chooseBestVintageValue(existingValue, incomingValue, {preferIncoming = false} = {}) {
  if (preferIncoming && incomingValue != null) return incomingValue
  return existingValue ?? incomingValue ?? null
}

function resolveMergedVintageFields(existing, payload) {
  const hasIncomingRange = payload.price_min != null || payload.price_max != null
  const hasExistingRange = existing.price_min != null || existing.price_max != null
  const preferIncomingPrice = hasIncomingRange && !hasExistingRange

  return {
    price: chooseBestVintageValue(existing.price, payload.price, {
      preferIncoming: preferIncomingPrice,
    }),
    price_min: chooseBestVintageValue(existing.price_min, payload.price_min, {
      preferIncoming: preferIncomingPrice,
    }),
    price_max: chooseBestVintageValue(existing.price_max, payload.price_max, {
      preferIncoming: preferIncomingPrice,
    }),
    currency: chooseBestVintageValue(existing.currency, payload.currency, {
      preferIncoming: preferIncomingPrice,
    }),
    confidence:
      existing.confidence != null && payload.confidence != null
        ? Math.max(existing.confidence, payload.confidence)
        : existing.confidence ?? payload.confidence ?? null,
    notes: existing.notes || payload.notes,
    external_id: existing.external_id || payload.external_id,
    price_band: existing.price_band || payload.price_band,
  }
}

async function ensureProducer(db, producerInput) {
  const normalizedName = normalizeCanonicalName(producerInput?.name)
  if (!normalizedName) return null

  const {data: existing, error: existingError} = await withTimeout(
    db
      .from('wine_producers')
      .select('id, name, country, region, notes')
      .eq('normalized_name', normalizedName)
      .maybeSingle(),
    10000,
    'find producer',
  )
  if (existingError) throw existingError

  const payload = {
    name: capitalizeWords(producerInput.name),
    normalized_name: normalizedName,
    country: toNullableTrimmed(producerInput.country),
    region: toNullableTrimmed(producerInput.region),
    notes: toNullableTrimmed(producerInput.notes),
  }

  if (existing?.id) {
    const {data: updated, error: updateError} = await withTimeout(
      db
        .from('wine_producers')
        .update({
          name: payload.name || existing.name,
          country: existing.country || payload.country,
          region: existing.region || payload.region,
          notes: existing.notes || payload.notes,
        })
        .eq('id', existing.id)
        .select('id, name')
        .single(),
      10000,
      'update producer',
    )
    if (updateError) throw updateError
    return updated
  }

  const {data: inserted, error: insertError} = await withTimeout(
    db
      .from('wine_producers')
      .insert(payload)
      .select('id, name')
      .single(),
    10000,
    'insert producer',
  )
  if (insertError) throw insertError
  return inserted
}

async function ensureLabel(db, labelInput) {
  const normalizedName = normalizeCanonicalName(labelInput?.name)
  if (!normalizedName) return null

  const buildLabelQuery = (selectClause) => {
    let query = db
      .from('wine_labels')
      .select(selectClause)
      .eq('normalized_name', normalizedName)
      .limit(5)

    if (labelInput.producer_id) {
      query = query.eq('producer_id', labelInput.producer_id)
    } else {
      query = query.is('producer_id', null)
    }

    if (labelInput.appellation) {
      query = query.eq('appellation', labelInput.appellation)
    } else {
      query = query.is('appellation', null)
    }

    return query
  }

  let {data: matches, error: matchesError} = await withTimeout(
    buildLabelQuery(
      'id, name, country, region, appellation, type, search_text, notes, quiz_region, quiz_appellation, quiz_price_band, body, acidity, elaborate, harmonize, search_tokens',
    ),
    10000,
    'find label',
  )
  if (matchesError && isMissingColumnError(matchesError)) {
    const fallback = await withTimeout(
      buildLabelQuery('id, name, country, region, appellation, type, search_text, notes'),
      10000,
      'find label fallback',
    )
    matches = fallback.data
    matchesError = fallback.error
  }
  if (matchesError) throw matchesError
  const existing = Array.isArray(matches) && matches.length > 0 ? matches[0] : null

  const payload = {
    producer_id: labelInput.producer_id || null,
    name: labelInput.name,
    normalized_name: normalizedName,
    appellation: toNullableTrimmed(labelInput.appellation),
    country: toNullableTrimmed(labelInput.country),
    region: toNullableTrimmed(labelInput.region),
    type: mapWineType(labelInput.type),
    search_text: toNullableTrimmed(labelInput.search_text),
    notes: toNullableTrimmed(labelInput.notes),
    quiz_region: toNullableTrimmed(labelInput.quiz_region),
    quiz_appellation: toNullableTrimmed(labelInput.quiz_appellation),
    quiz_price_band: toNullableTrimmed(labelInput.quiz_price_band),
    body: toNullableTrimmed(labelInput.body),
    acidity: toNullableTrimmed(labelInput.acidity),
    elaborate: toNullableTrimmed(labelInput.elaborate),
    harmonize: toNullableTrimmed(labelInput.harmonize),
    search_tokens: toNullableTrimmed(labelInput.search_tokens),
  }

  if (existing?.id) {
    let updated = null
    let updateError = null
    const extendedUpdatePayload = {
      name: payload.name || existing.name,
      country: existing.country || payload.country,
      region: existing.region || payload.region,
      type: existing.type || payload.type,
      search_text: existing.search_text || payload.search_text,
      notes: existing.notes || payload.notes,
      quiz_region: existing.quiz_region || payload.quiz_region,
      quiz_appellation: existing.quiz_appellation || payload.quiz_appellation,
      quiz_price_band: existing.quiz_price_band || payload.quiz_price_band,
      body: existing.body || payload.body,
      acidity: existing.acidity || payload.acidity,
      elaborate: existing.elaborate || payload.elaborate,
      harmonize: existing.harmonize || payload.harmonize,
      search_tokens: existing.search_tokens || payload.search_tokens,
    }
    ;({data: updated, error: updateError} = await withTimeout(
      db
        .from('wine_labels')
        .update(extendedUpdatePayload)
        .eq('id', existing.id)
        .select('id, name')
        .single(),
      10000,
      'update label',
    ))
    if (updateError && isMissingColumnError(updateError)) {
      ;({data: updated, error: updateError} = await withTimeout(
        db
          .from('wine_labels')
          .update({
            name: payload.name || existing.name,
            country: existing.country || payload.country,
            region: existing.region || payload.region,
            type: existing.type || payload.type,
            search_text: existing.search_text || payload.search_text,
            notes: existing.notes || payload.notes,
          })
          .eq('id', existing.id)
          .select('id, name')
          .single(),
        10000,
        'update label fallback',
      ))
    }
    if (updateError) throw updateError
    return updated
  }

  let inserted = null
  let insertError = null
  ;({data: inserted, error: insertError} = await withTimeout(
    db
      .from('wine_labels')
      .insert(payload)
      .select('id, name')
      .single(),
    10000,
    'insert label',
  ))
  if (insertError && isMissingColumnError(insertError)) {
    ;({data: inserted, error: insertError} = await withTimeout(
      db
        .from('wine_labels')
        .insert({
          producer_id: payload.producer_id,
          name: payload.name,
          normalized_name: payload.normalized_name,
          appellation: payload.appellation,
          country: payload.country,
          region: payload.region,
          type: payload.type,
          search_text: payload.search_text,
          notes: payload.notes,
        })
        .select('id, name')
        .single(),
      10000,
      'insert label fallback',
    ))
  }
  if (insertError) throw insertError
  return inserted
}

async function ensureGrapes(db, wineLabelId, grapes) {
  const normalizedGrapes = [...new Set((grapes || []).map((grape) => toNullableTrimmed(grape)).filter(Boolean))]
  if (!wineLabelId || normalizedGrapes.length === 0) return []

  const grapeIds = []
  for (const grapeName of normalizedGrapes) {
    const normalized = normalizeCanonicalName(grapeName)
    if (!normalized) continue

    const {data: existing, error: existingError} = await withTimeout(
      db
        .from('wine_grapes')
        .select('id')
        .eq('normalized_name', normalized)
        .maybeSingle(),
      8000,
      'find grape',
    )
    if (existingError) throw existingError

    let grapeId = existing?.id || null
    if (!grapeId) {
      const {data: inserted, error: insertError} = await withTimeout(
        db
          .from('wine_grapes')
          .insert({
            name: capitalizeWords(grapeName),
            normalized_name: normalized,
          })
          .select('id')
          .single(),
        8000,
        'insert grape',
      )
      if (insertError) throw insertError
      grapeId = inserted.id
    }

    grapeIds.push(grapeId)

    const {data: relation} = await withTimeout(
      db
        .from('wine_label_grapes')
        .select('wine_label_id')
        .eq('wine_label_id', wineLabelId)
        .eq('grape_id', grapeId)
        .maybeSingle(),
      8000,
      'find label grape',
    )

    if (!relation) {
      const {error: relationError} = await withTimeout(
        db.from('wine_label_grapes').insert({
          wine_label_id: wineLabelId,
          grape_id: grapeId,
        }),
        8000,
        'insert label grape',
      )
      if (relationError) throw relationError
    }
  }

  return grapeIds
}

async function ensureVintage(db, vintageInput) {
  if (!vintageInput?.wine_label_id) return null

  const buildVintageQuery = (selectClause) => {
    let query = db
      .from('wine_vintages')
      .select(selectClause)
      .eq('wine_label_id', vintageInput.wine_label_id)
      .limit(5)

    if (vintageInput.vintage != null) {
      query = query.eq('vintage', vintageInput.vintage)
    } else {
      query = query.is('vintage', null)
    }

    return query
  }

  let {data: matches, error: matchesError} = await withTimeout(
    buildVintageQuery(
      'id, price, price_min, price_max, currency, confidence, notes, external_id, price_band',
    ),
    10000,
    'find vintage',
  )
  if (matchesError && isMissingColumnError(matchesError)) {
    const fallback = await withTimeout(
      buildVintageQuery('id, price, currency, confidence, notes'),
      10000,
      'find vintage fallback',
    )
    matches = fallback.data
    matchesError = fallback.error
  }
  if (matchesError) throw matchesError
  const existing = Array.isArray(matches) && matches.length > 0 ? matches[0] : null

  const payload = {
    wine_label_id: vintageInput.wine_label_id,
    vintage: vintageInput.vintage ?? null,
    price: vintageInput.price ?? null,
    price_min: vintageInput.price_min ?? null,
    price_max: vintageInput.price_max ?? null,
    currency: toNullableTrimmed(vintageInput.currency),
    confidence: vintageInput.confidence ?? null,
    notes: toNullableTrimmed(vintageInput.notes),
    external_id: toNullableTrimmed(vintageInput.external_id),
    price_band: toNullableTrimmed(vintageInput.price_band),
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  }

  if (existing?.id) {
    let updated = null
    let updateError = null
    const merged = resolveMergedVintageFields(existing, payload)
    ;({data: updated, error: updateError} = await withTimeout(
      db
        .from('wine_vintages')
        .update({
          price: merged.price,
          price_min: merged.price_min,
          price_max: merged.price_max,
          currency: merged.currency,
          confidence: merged.confidence,
          notes: merged.notes,
          external_id: merged.external_id,
          price_band: merged.price_band,
          last_seen_at: payload.last_seen_at,
        })
        .eq('id', existing.id)
        .select('id, vintage')
        .single(),
      10000,
      'update vintage',
    ))
    if (updateError && isMissingColumnError(updateError)) {
      ;({data: updated, error: updateError} = await withTimeout(
        db
          .from('wine_vintages')
          .update({
            price: merged.price,
            currency: merged.currency,
            confidence: merged.confidence,
            notes: merged.notes,
            last_seen_at: payload.last_seen_at,
          })
          .eq('id', existing.id)
          .select('id, vintage')
          .single(),
        10000,
        'update vintage fallback',
      ))
    }
    if (updateError) throw updateError
    return updated
  }

  let inserted = null
  let insertError = null
  ;({data: inserted, error: insertError} = await withTimeout(
    db
      .from('wine_vintages')
      .insert(payload)
      .select('id, vintage')
      .single(),
    10000,
    'insert vintage',
  ))
  if (insertError && isMissingColumnError(insertError)) {
    ;({data: inserted, error: insertError} = await withTimeout(
      db
        .from('wine_vintages')
        .insert({
          wine_label_id: payload.wine_label_id,
          vintage: payload.vintage,
          price: payload.price,
          price_min: payload.price_min,
          price_max: payload.price_max,
          currency: payload.currency,
          confidence: payload.confidence,
          notes: payload.notes,
          first_seen_at: payload.first_seen_at,
          last_seen_at: payload.last_seen_at,
        })
        .select('id, vintage')
        .single(),
      10000,
      'insert vintage fallback',
    ))
  }
  if (insertError) throw insertError
  return inserted
}

async function ensureSource(db, sourceInput) {
  if (!sourceInput?.wine_vintage_id) return null

  let {data: existing, error: existingError} = await withTimeout(
    db
      .from('wine_sources')
      .select('id')
      .eq('wine_vintage_id', sourceInput.wine_vintage_id)
      .eq('source', sourceInput.source)
      .maybeSingle(),
    8000,
    'find source',
  )
  if (existingError) throw existingError

  const payload = {
    wine_vintage_id: sourceInput.wine_vintage_id,
    source: sourceInput.source,
    source_url: sourceInput.source_url || null,
    price: sourceInput.price ?? null,
    currency: sourceInput.currency || null,
    scraped_at: new Date().toISOString(),
    confidence: sourceInput.confidence ?? null,
    data_source: sourceInput.data_source || null,
    raw_payload: sourceInput.raw_payload || null,
  }

  if (existing?.id) {
    const {data: updated, error: updateError} = await withTimeout(
      db
        .from('wine_sources')
        .update({
          price: payload.price,
          currency: payload.currency,
          scraped_at: payload.scraped_at,
          confidence: payload.confidence,
          raw_payload: payload.raw_payload,
          data_source: payload.data_source,
        })
        .eq('id', existing.id)
        .select('id')
        .single(),
      8000,
      'update source',
    )
    if (updateError && isMissingColumnError(updateError)) {
      const fallback = await withTimeout(
        db
          .from('wine_sources')
          .update({
            price: payload.price,
            currency: payload.currency,
            scraped_at: payload.scraped_at,
            confidence: payload.confidence,
            raw_payload: payload.raw_payload,
          })
          .eq('id', existing.id)
          .select('id')
          .single(),
        8000,
        'update source fallback',
      )
      if (fallback.error) throw fallback.error
      return fallback.data
    }
    if (updateError) throw updateError
    return updated
  }

  let inserted = null
  let insertError = null
  ;({data: inserted, error: insertError} = await withTimeout(
    db
      .from('wine_sources')
      .insert(payload)
      .select('id')
      .single(),
    8000,
    'insert source',
  ))
  if (insertError && isMissingColumnError(insertError)) {
    ;({data: inserted, error: insertError} = await withTimeout(
      db
        .from('wine_sources')
        .insert({
          wine_vintage_id: payload.wine_vintage_id,
          source: payload.source,
          source_url: payload.source_url,
          price: payload.price,
          currency: payload.currency,
          scraped_at: payload.scraped_at,
          confidence: payload.confidence,
          raw_payload: payload.raw_payload,
        })
        .select('id')
        .single(),
      8000,
      'insert source fallback',
    ))
  }
  if (insertError) throw insertError
  return inserted
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const imageId = String(body?.imageId || '').trim()
    if (!imageId) {
      return NextResponse.json({error: 'Missing imageId'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await withTimeout(supabase.auth.getUser(), 8000, 'auth getUser')

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const {data: imageRow, error: imageError} = await withTimeout(
      supabase
        .from('tasting_bottle_images')
        .select(
          'id, uploaded_by, status, original_filename, recognized_name, recognized_producer, recognized_vintage, recognition_confidence, recognized_payload, error_message',
        )
        .eq('id', imageId)
        .eq('uploaded_by', user.id)
        .single(),
      12000,
      'load image',
    )

    if (imageError || !imageRow) {
      return NextResponse.json({error: 'Image not found'}, {status: 404})
    }

    if (!imageRow.recognized_name || !imageRow.recognized_producer) {
      return NextResponse.json({error: 'Bottle is not recognized enough to verify'}, {status: 400})
    }

    const details = imageRow.recognized_payload?.catalog_details || {}
    const writeDb = createWriteClient(supabase)
    const resolvedPrice =
      details.price ?? details.average_price ?? null
    const resolvedCurrency = details.currency || null
    const resolvedPriceBand = details.quiz_price_band || details.price_band || null

    const producer = await ensureProducer(writeDb, {
      name: imageRow.recognized_producer,
      country: details.country,
      region: details.quiz_region || details.region,
      notes: null,
    })

    const label = await ensureLabel(writeDb, {
      producer_id: producer?.id || null,
      name: imageRow.recognized_name,
      appellation: details.quiz_appellation || details.appellation,
      country: details.country,
      region: details.quiz_region || details.region,
      type: details.type,
      search_text: buildSearchText(imageRow),
      notes: buildLabelNotes(imageRow),
      quiz_region: details.quiz_region || details.region,
      quiz_appellation: details.quiz_appellation || details.appellation,
      quiz_price_band: resolvedPriceBand,
      body: details.body,
      acidity: details.acidity,
      elaborate: details.elaborate,
      harmonize: details.harmony || details.harmonize,
      search_tokens: Array.isArray(details.grapes) ? details.grapes.join(', ') : null,
    })

    await ensureGrapes(writeDb, label?.id, Array.isArray(details.grapes) ? details.grapes : [])

    const vintage = await ensureVintage(writeDb, {
      wine_label_id: label?.id,
      vintage: imageRow.recognized_vintage,
      price: resolvedPrice,
      price_min: details.price_min ?? resolvedPrice,
      price_max: details.price_max ?? resolvedPrice,
      currency: resolvedCurrency,
      confidence: imageRow.recognition_confidence ?? null,
      notes: buildLabelNotes(imageRow),
      external_id: imageRow.id,
      price_band: resolvedPriceBand,
    })

    await ensureSource(writeDb, {
      wine_vintage_id: vintage?.id,
      source: 'auto_tasting_verified',
      data_source: imageRow.recognized_payload?.web_enrichment?.applied ? 'openai_web_search' : 'openai_vision',
      price: resolvedPrice,
      currency: resolvedCurrency,
      confidence: imageRow.recognition_confidence ?? null,
      raw_payload: {
        image_id: imageRow.id,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        catalog_match: imageRow.recognized_payload?.catalog_match || null,
        web_enrichment: imageRow.recognized_payload?.web_enrichment || null,
        price_context: {
          price: resolvedPrice,
          average_price: details.average_price ?? null,
          price_min: details.price_min ?? null,
          price_max: details.price_max ?? null,
          currency: resolvedCurrency,
          price_band: resolvedPriceBand,
          price_source: details.price_source || null,
          price_confidence: details.price_confidence ?? null,
        },
        extracted_notes: {
          why_notable: details.why_notable || null,
          short_description: details.short_description || null,
          body: details.body || null,
          acidity: details.acidity || null,
          harmony: details.harmony || details.harmonize || null,
        },
      },
    })

    const verifiedAt = new Date().toISOString()
    const nextPayload = {
      ...(imageRow.recognized_payload || {}),
      review: {
        ...(imageRow.recognized_payload?.review || {}),
        required: false,
        reason: null,
      },
      verification: {
        verified: true,
        verified_at: verifiedAt,
        verified_by: user.id,
      },
      catalog_sync: {
        synced: true,
        synced_at: verifiedAt,
        producer_id: producer?.id || null,
        label_id: label?.id || null,
        vintage_id: vintage?.id || null,
      },
    }

    const {data: updatedRow, error: updateError} = await withTimeout(
      supabase
        .from('tasting_bottle_images')
        .update({
          recognized_payload: nextPayload,
          error_message: null,
        })
        .eq('id', imageRow.id)
        .eq('uploaded_by', user.id)
        .select(
          'id, original_filename, storage_bucket, storage_path, status, recognized_name, recognized_producer, recognized_vintage, recognition_confidence, recognized_payload, error_message, created_at',
        )
        .single(),
      12000,
      'update verified image',
    )

    if (updateError) {
      return NextResponse.json({error: updateError.message}, {status: 500})
    }

    return NextResponse.json({
      ok: true,
      image: updatedRow,
      synced: {
        producerId: producer?.id || null,
        labelId: label?.id || null,
        vintageId: vintage?.id || null,
      },
    })
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
