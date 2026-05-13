import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createClient} from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function createWriteClient(fallback) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key) return createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}})
  return fallback
}

export async function POST(request) {
  try {
    const {sessionId} = await request.json()
    const trimmedSessionId = String(sessionId ?? '').trim()

    if (!trimmedSessionId) {
      return NextResponse.json({error: 'Missing session id'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const {data: ownedSession, error: sessionError} = await supabase
      .from('live_sessions')
      .select('id')
      .eq('id', trimmedSessionId)
      .eq('host_user_id', user.id)
      .maybeSingle()

    if (sessionError || !ownedSession) {
      return NextResponse.json({error: 'Session not found'}, {status: 404})
    }

    const db = createWriteClient(supabase)
    const {data: players, error: playersError} = await db
      .from('live_players')
      .select('id, nickname, avatar_id, is_host, joined_at')
      .eq('session_id', trimmedSessionId)
      .order('joined_at', {ascending: true})

    if (playersError) {
      return NextResponse.json({error: playersError.message}, {status: 500})
    }

    return NextResponse.json({count: players?.length || 0, players: players || []})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
