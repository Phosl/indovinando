import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'

function withTimeout(promise, ms, label) {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
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

    const {data: blob, error: downloadError} = await withTimeout(
      supabase.storage.from(imageRow.storage_bucket).download(imageRow.storage_path),
      30000,
      'storage download',
    )

    if (downloadError || !blob) {
      return NextResponse.json({error: downloadError?.message || 'Download failed'}, {status: 500})
    }

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

