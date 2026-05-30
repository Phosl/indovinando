import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'

function withTimeout(promise, ms, label) {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
}

export async function POST(request) {
  const reqId = crypto.randomUUID()
  try {
    console.log(`[auto-tasting/metadata][${reqId}] start`)
    const supabase = await createServerSupabase()
    console.log(`[auto-tasting/metadata][${reqId}] client ready`)
    const {
      data: {user},
    } = await withTimeout(supabase.auth.getUser(), 8000, 'auth getUser')
    console.log(`[auto-tasting/metadata][${reqId}] auth resolved user=${user?.id || 'none'}`)

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const body = await request.json()
    const storageBucket = String(body?.storage_bucket ?? 'tasting-bottles').trim() || 'tasting-bottles'
    const storagePath = String(body?.storage_path ?? '').trim()
    const originalFilename = String(body?.original_filename ?? '').trim() || null
    const mimeType = String(body?.mime_type ?? '').trim() || null
    const sizeBytes = Number(body?.size_bytes ?? 0) || null

    if (!storagePath) {
      return NextResponse.json({error: 'Missing storage_path'}, {status: 400})
    }

    console.log(`[auto-tasting/metadata][${reqId}] inserting storage_path=${storagePath}`)
    const {data: inserted, error: insertError} = await withTimeout(
      supabase
        .from('tasting_bottle_images')
        .insert({
          uploaded_by: user.id,
          storage_bucket: storageBucket,
          storage_path: storagePath,
          original_filename: originalFilename,
          mime_type: mimeType,
          size_bytes: sizeBytes,
          status: 'processing',
        })
        .select('id, original_filename, storage_bucket, storage_path, status, created_at')
        .single(),
      12000,
      'metadata insert',
    )

    if (insertError) {
      return NextResponse.json({error: insertError.message}, {status: 500})
    }

    console.log(`[auto-tasting/metadata][${reqId}] success id=${inserted?.id}`)
    return NextResponse.json({ok: true, image: inserted})
  } catch (error) {
    console.error(`[auto-tasting/metadata][${reqId}] error`, error)
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
