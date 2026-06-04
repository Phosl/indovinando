import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'

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
  const {data: blob, error: downloadError} = await withTimeout(
    supabase.storage.from(bucket).download(path),
    30000,
    'storage download',
  )

  if (!downloadError && blob) return blob

  const firstError = downloadError?.message || 'storage download failed'
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

export async function GET(request) {
  try {
    const {searchParams} = new URL(request.url)
    const imageId = String(searchParams.get('id') || '').trim()
    if (!imageId) {
      return NextResponse.json({error: 'Missing id'}, {status: 400})
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
        .select('storage_bucket, storage_path, mime_type, uploaded_by')
        .eq('id', imageId)
        .eq('uploaded_by', user.id)
        .single(),
      12000,
      'find image row',
    )

    if (imageError || !imageRow) {
      return NextResponse.json({error: 'Image not found'}, {status: 404})
    }

    const blob = await downloadStorageObjectWithFallback({
      supabase,
      bucket: imageRow.storage_bucket || 'tasting-bottles',
      path: imageRow.storage_path,
      request,
    })

    const bytes = await blob.arrayBuffer()
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': imageRow.mime_type || blob.type || 'application/octet-stream',
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
