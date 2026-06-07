import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'

export const runtime = 'nodejs'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
const BUCKET = 'business-branding'

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
      return NextResponse.json({error: 'File too large (max 5MB)'}, {status: 400})
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const safeName = toSafeFileName(file.name) || `logo.${ext}`
    const objectPath = `${user.id}/logo-${Date.now()}-${safeName}`
    const fileBytes = new Uint8Array(await file.arrayBuffer())

    const {error: uploadError} = await supabase.storage.from(BUCKET).upload(objectPath, fileBytes, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    })

    if (uploadError) {
      return NextResponse.json({error: uploadError.message}, {status: 500})
    }

    const {
      data: {publicUrl},
    } = supabase.storage.from(BUCKET).getPublicUrl(objectPath)

    const {error: profileError} = await supabase
      .from('profiles')
      .update({
        business_logo_path: objectPath,
        business_logo_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (profileError) {
      return NextResponse.json({error: profileError.message}, {status: 500})
    }

    return NextResponse.json({
      ok: true,
      logo: {
        path: objectPath,
        url: publicUrl,
      },
    })
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
