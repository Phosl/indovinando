import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'

function withTimeout(promise, ms, label) {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
}

function parseOptionalNumber(value) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  const numeric = Number(normalized.replace(',', '.'))
  return Number.isFinite(numeric) ? numeric : null
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
    const imageId = String(body?.imageId || '').trim()
    const draft = body?.draft && typeof body.draft === 'object' ? body.draft : null

    if (!imageId || !draft) {
      return NextResponse.json({error: 'Missing imageId or draft'}, {status: 400})
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
    const nextDetails = {
      ...currentDetails,
      country: String(draft.country || '').trim() || null,
      region: String(draft.region || '').trim() || null,
      quiz_region: String(draft.region || '').trim() || null,
      appellation: String(draft.appellation || '').trim() || null,
      quiz_appellation: String(draft.appellation || '').trim() || null,
      type: String(draft.type || '').trim() || null,
      grapes: String(draft.grapes || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      average_price: parseOptionalNumber(draft.average_price),
      why_notable: String(draft.why_notable || '').trim() || null,
      short_description: String(draft.short_description || '').trim() || null,
    }

    const nextPayload = {
      ...currentPayload,
      catalog_details: nextDetails,
      review: {
        ...(currentPayload.review || {}),
        required: false,
      },
    }

    const {data: updatedRow, error: updateError} = await withTimeout(
      supabase
        .from('tasting_bottle_images')
        .update({
          status: 'recognized',
          recognized_name: String(draft.recognized_name || '').trim() || row.recognized_name,
          recognized_producer:
            String(draft.recognized_producer || '').trim() || row.recognized_producer,
          recognized_vintage:
            String(draft.recognized_vintage || '').trim() || row.recognized_vintage,
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
      'update manual details',
    )

    if (updateError) {
      return NextResponse.json({error: updateError.message}, {status: 500})
    }

    return NextResponse.json({ok: true, updated: updatedRow})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
