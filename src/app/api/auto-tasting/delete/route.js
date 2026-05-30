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
  try {
    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const body = await request.json()
    const imageId = body?.imageId
    const storagePath = String(body?.storagePath ?? '').trim()
    const storageBucket = String(body?.storageBucket ?? 'tasting-bottles').trim() || 'tasting-bottles'

    const trimmedImageId = String(imageId ?? '').trim()
    if (!trimmedImageId && !storagePath) {
      return NextResponse.json({error: 'Missing imageId or storagePath'}, {status: 400})
    }

    let imageRow = null
    let imageError = null
    if (trimmedImageId) {
      const lookupResult = await withTimeout(
        supabase
          .from('tasting_bottle_images')
          .select('id, storage_bucket, storage_path, uploaded_by')
          .eq('id', trimmedImageId)
          .eq('uploaded_by', user.id)
          .single(),
        12000,
        'find image',
      )
      imageRow = lookupResult.data
      imageError = lookupResult.error
    } else {
      imageRow = {
        id: null,
        storage_bucket: storageBucket,
        storage_path: storagePath,
        uploaded_by: user.id,
      }
    }

    if (imageError || !imageRow) {
      return NextResponse.json({error: 'Image not found'}, {status: 404})
    }

    const {error: storageError} = await withTimeout(
      supabase.storage.from(imageRow.storage_bucket).remove([imageRow.storage_path]),
      30000,
      'delete storage file',
    )
    if (storageError) {
      return NextResponse.json({error: storageError.message}, {status: 500})
    }

    if (imageRow.id) {
      const {error: deleteError} = await withTimeout(
        supabase.from('tasting_bottle_images').delete().eq('id', imageRow.id),
        12000,
        'delete metadata',
      )
      if (deleteError) {
        return NextResponse.json({error: deleteError.message}, {status: 500})
      }
    }

    return NextResponse.json({ok: true, imageId: imageRow.id})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
