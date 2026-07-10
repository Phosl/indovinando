import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createClient} from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function createReadClient(fallback) {
  if (SUPABASE_URL && SERVICE_ROLE_KEY) {
    return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {persistSession: false, autoRefreshToken: false},
    })
  }
  return fallback
}

function isExpired(session, timeoutMinutes) {
  const lastActivity = new Date(session.last_activity_at).getTime()
  const now = Date.now()
  return now - lastActivity > timeoutMinutes * 60 * 1000
}

export async function POST(request) {
  try {
    const body = await request.json()
    const eventSlug = String(body?.eventSlug || '').trim()
    const joinCode = String(body?.joinCode || '')
      .replace(/\D+/g, '')
      .slice(0, 4)

    if (!eventSlug || joinCode.length !== 4) {
      return NextResponse.json({error: 'Missing required fields'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const db = createReadClient(supabase)

    const {data: event, error: eventError} = await db
      .from('table_live_events')
      .select('id, inactivity_timeout_minutes, status')
      .eq('slug', eventSlug)
      .maybeSingle()

    if (eventError || !event || event.status !== 'active') {
      return NextResponse.json({error: 'Event not found or inactive'}, {status: 404})
    }

    const {data: session, error: sessionError} = await db
      .from('table_live_sessions')
      .select('id, status, last_activity_at')
      .eq('event_id', event.id)
      .eq('join_code', joinCode)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({error: 'Session not found'}, {status: 404})
    }

    if (session.status !== 'lobby') {
      return NextResponse.json({error: 'Session closed'}, {status: 409})
    }

    if (isExpired(session, event.inactivity_timeout_minutes || 15)) {
      return NextResponse.json({error: 'Session expired'}, {status: 409})
    }

    return NextResponse.json({ok: true})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
