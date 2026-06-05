import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'

function withTimeout(promise, ms, label) {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
}

const DETAIL_FIELD_KEYS = [
  'country',
  'region',
  'quiz_region',
  'appellation',
  'quiz_appellation',
  'type',
  'grapes',
  'price',
  'price_min',
  'price_max',
  'average_price',
  'currency',
  'price_source',
  'price_confidence',
  'price_band',
  'quiz_price_band',
  'body',
  'acidity',
  'harmony',
  'harmonize',
  'why_notable',
  'short_description',
]

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
    const imageId = String(body?.imageId || '').trim()
    const selectedFields = Array.isArray(body?.selectedFields)
      ? [...new Set(body.selectedFields.map((value) => String(value || '').trim()).filter(Boolean))]
      : []
    const proposed = body?.proposed && typeof body.proposed === 'object' ? body.proposed : null

    if (!imageId || !proposed || selectedFields.length === 0) {
      return NextResponse.json({error: 'Missing imageId, proposed data, or selected fields'}, {status: 400})
    }

    const {data: row, error: rowError} = await withTimeout(
      supabase
        .from('tasting_bottle_images')
        .select(
          'id, original_filename, storage_bucket, storage_path, status, recognized_name, recognized_producer, recognized_vintage, recognition_confidence, recognized_payload, error_message, created_at',
        )
        .eq('id', imageId)
        .eq('uploaded_by', user.id)
        .single(),
      12000,
      'load image row',
    )

    if (rowError || !row) {
      return NextResponse.json({error: rowError?.message || 'Image not found'}, {status: 404})
    }

    const currentPayload = row.recognized_payload || {}
    const currentDetails = currentPayload.catalog_details || {}
    const proposedPayload = proposed?.recognized_payload || {}
    const proposedDetails = proposedPayload.catalog_details || {}

    const nextDetails = {...currentDetails}
    const nextPayload = {...currentPayload}

    let nextRecognizedName = row.recognized_name
    let nextRecognizedProducer = row.recognized_producer
    let nextRecognizedVintage = row.recognized_vintage
    let nextRecognitionConfidence = row.recognition_confidence

    for (const field of selectedFields) {
      if (field === 'name') nextRecognizedName = proposed.recognized_name ?? nextRecognizedName
      if (field === 'producer') nextRecognizedProducer = proposed.recognized_producer ?? nextRecognizedProducer
      if (field === 'vintage') nextRecognizedVintage = proposed.recognized_vintage ?? nextRecognizedVintage
      if (field === 'confidence') {
        nextRecognitionConfidence = proposed.recognition_confidence ?? nextRecognitionConfidence
      }
      if (DETAIL_FIELD_KEYS.includes(field)) {
        nextDetails[field] = proposedDetails[field]
      }
    }

    nextPayload.catalog_details = nextDetails
    nextPayload.review = proposedPayload.review || currentPayload.review || null
    nextPayload.catalog_match = proposedPayload.catalog_match || currentPayload.catalog_match || null
    nextPayload.web_enrichment =
      proposedPayload.web_enrichment || currentPayload.web_enrichment || null

    const {data: updatedRow, error: updateError} = await withTimeout(
      supabase
        .from('tasting_bottle_images')
        .update({
          status: 'recognized',
          recognized_name: nextRecognizedName,
          recognized_producer: nextRecognizedProducer,
          recognized_vintage: nextRecognizedVintage,
          recognition_confidence: nextRecognitionConfidence,
          recognized_payload: nextPayload,
          error_message: null,
        })
        .eq('id', imageId)
        .eq('uploaded_by', user.id)
        .select(
          'id, original_filename, storage_bucket, storage_path, status, recognized_name, recognized_producer, recognized_vintage, recognition_confidence, recognized_payload, error_message, created_at',
        )
        .single(),
      12000,
      'update image row',
    )

    if (updateError) {
      return NextResponse.json({error: updateError.message}, {status: 500})
    }

    return NextResponse.json({ok: true, updated: updatedRow})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
