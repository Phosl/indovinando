import {NextResponse} from 'next/server'
import {isSuperAdmin} from '@/lib/courseAdmin'

const GOOGLE_CLOUD_VISION_API_KEY = process.env.GOOGLE_CLOUD_VISION_API_KEY

function withTimeout(promise, ms, label) {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
}

export async function GET() {
  try {
    const allowed = await isSuperAdmin()
    if (!allowed) {
      return NextResponse.json({ok: false, error: 'Not authorized'}, {status: 403})
    }

    if (!GOOGLE_CLOUD_VISION_API_KEY) {
      return NextResponse.json({ok: false, error: 'GOOGLE_CLOUD_VISION_API_KEY missing'}, {status: 500})
    }

    // 1x1 transparent PNG
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y6xR+gAAAAASUVORK5CYII='

    const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`
    const body = {
      requests: [
        {
          image: {content: pngBase64},
          features: [{type: 'TEXT_DETECTION'}],
        },
      ],
    }

    const response = await withTimeout(
      fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      }),
      20000,
      'vision health request',
    )

    const json = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: response.status,
          error: json?.error?.message || `Vision HTTP ${response.status}`,
        },
        {status: 500},
      )
    }

    const first = json?.responses?.[0]
    if (first?.error?.message) {
      return NextResponse.json({ok: false, error: first.error.message}, {status: 500})
    }

    return NextResponse.json({
      ok: true,
      message: 'Vision API reachable',
    })
  } catch (error) {
    return NextResponse.json({ok: false, error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
