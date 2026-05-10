import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createClient} from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function createAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase service credentials')
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {persistSession: false, autoRefreshToken: false},
  })
}

export async function POST(request) {
  try {
    const {gameId} = await request.json()
    const trimmedGameId = String(gameId ?? '').trim()

    if (!trimmedGameId) {
      return NextResponse.json({error: 'Missing game id'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const {data: game, error: gameError} = await supabase
      .from('games')
      .select('id, created_by')
      .eq('id', trimmedGameId)
      .eq('created_by', user.id)
      .single()

    if (gameError || !game) {
      return NextResponse.json({error: 'Game not found'}, {status: 404})
    }

    const admin = createAdminClient()
    const sessionId = crypto.randomUUID()

    const {error} = await admin.from('live_sessions').insert({
      id: sessionId,
      game_id: trimmedGameId,
      host_user_id: user.id,
      status: 'lobby',
      current_question_index: 0,
      round_status: 'waiting_players',
    })

    if (error) {
      return NextResponse.json({error: error.message}, {status: 500})
    }

    return NextResponse.json({id: sessionId})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
