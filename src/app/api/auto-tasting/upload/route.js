import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'

export const runtime = 'nodejs'

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])

function withTimeout(promise, ms, label) {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
}

function toSafeFileName(filename) {
  return filename
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
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

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return NextResponse.json({error: 'Missing file'}, {status: 400})
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({error: `Unsupported file type: ${file.type}`}, {status: 400})
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({error: 'File too large (max 15MB)'}, {status: 400})
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeName = toSafeFileName(file.name) || `bottle.${ext}`
    const objectPath = `${user.id}/draft/${crypto.randomUUID()}-${safeName}`
    const fileBytes = new Uint8Array(await file.arrayBuffer())

    const {error: uploadError} = await withTimeout(
      supabase.storage.from('tasting-bottles').upload(objectPath, fileBytes, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      }),
      60000,
      'storage upload',
    )

    if (uploadError) {
      return NextResponse.json({error: uploadError.message}, {status: 500})
    }

    return NextResponse.json({
      ok: true,
      upload: {
        storage_bucket: 'tasting-bottles',
        storage_path: objectPath,
        original_filename: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
      },
    })
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
