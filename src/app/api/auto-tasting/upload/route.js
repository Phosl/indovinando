import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'

export const runtime = 'nodejs'

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
])

const HEIC_FAMILY_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
])

function isUnsupportedHeicConversionError(error) {
  const message = String(error?.message || '').toLowerCase()
  return (
    message.includes('heif') &&
    (message.includes('compression format has not been built in') ||
      message.includes('error while loading plugin') ||
      message.includes('bad seek'))
  )
}

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

function replaceFileExtension(filename, nextExtension) {
  const safeExtension = String(nextExtension || '').replace(/^\.+/, '') || 'jpg'
  const baseName = String(filename || '').replace(/\.[^.]+$/, '')
  return `${baseName || 'bottle'}.${safeExtension}`
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
    const originalSafeName = toSafeFileName(file.name) || `bottle.${ext}`
    const originalBytes = Buffer.from(await file.arrayBuffer())

    let uploadMimeType = file.type || 'application/octet-stream'
    let uploadBytes = originalBytes
    let uploadSizeBytes = file.size
    let uploadSafeName = originalSafeName

    if (HEIC_FAMILY_TYPES.has(file.type)) {
      try {
        const sharpModule = await import('sharp')
        const sharp = sharpModule.default
        const convertedBuffer = await withTimeout(
          sharp(originalBytes).rotate().jpeg({quality: 88, mozjpeg: true}).toBuffer(),
          60000,
          'heic conversion',
        )

        uploadBytes = convertedBuffer
        uploadMimeType = 'image/jpeg'
        uploadSizeBytes = convertedBuffer.byteLength
        uploadSafeName =
          toSafeFileName(replaceFileExtension(originalSafeName, 'jpg')) || 'bottle.jpg'
      } catch (conversionError) {
        if (!isUnsupportedHeicConversionError(conversionError)) {
          throw conversionError
        }
      }
    }

    const objectPath = `${user.id}/draft/${crypto.randomUUID()}-${uploadSafeName}`

    const {error: uploadError} = await withTimeout(
      supabase.storage.from('tasting-bottles').upload(objectPath, uploadBytes, {
        cacheControl: '3600',
        upsert: false,
        contentType: uploadMimeType,
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
        mime_type: uploadMimeType || null,
        size_bytes: uploadSizeBytes,
      },
    })
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
