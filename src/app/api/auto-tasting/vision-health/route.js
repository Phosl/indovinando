import {NextResponse} from 'next/server'
import {isSuperAdmin} from '@/lib/courseAdmin'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini'

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

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ok: false, error: 'OPENAI_API_KEY missing'}, {status: 500})
    }

    const endpoint = 'https://api.openai.com/v1/responses'
    const body = {
      model: OPENAI_VISION_MODEL,
      input: 'Reply with JSON {"ok":true}.',
      text: {
        format: {
          type: 'json_schema',
          name: 'healthcheck',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['ok'],
            properties: {
              ok: {type: 'boolean'},
            },
          },
        },
      },
      max_output_tokens: 50,
    }

    const response = await withTimeout(
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
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
          error: json?.error?.message || `OpenAI HTTP ${response.status}`,
        },
        {status: 500},
      )
    }

    const outputText = String(json?.output_text || '').trim()
    if (!outputText.includes('"ok"')) {
      return NextResponse.json({ok: false, error: 'Unexpected OpenAI health response'}, {status: 500})
    }

    return NextResponse.json({
      ok: true,
      message: 'OpenAI Vision reachable',
      model: OPENAI_VISION_MODEL,
    })
  } catch (error) {
    return NextResponse.json({ok: false, error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
