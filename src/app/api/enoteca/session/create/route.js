import {NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import {createServerSupabase} from '@/lib/supabaseServer'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function createAnonClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase public credentials')
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {persistSession: false, autoRefreshToken: false},
  })
}

export async function POST(request) {
  try {
    const {gameId, nickname, tableName} = await request.json()

    const trimmedGameId = String(gameId ?? '').trim()
    const trimmedNickname = String(nickname ?? '').trim()
    const normalizedTable =
      typeof tableName === 'string' && tableName.trim() ? tableName.trim() : null

    if (!trimmedGameId) {
      return NextResponse.json({error: 'Missing game id'}, {status: 400})
    }

    if (!trimmedNickname) {
      return NextResponse.json({error: 'Missing nickname'}, {status: 400})
    }

    const supabase = createAnonClient()
    const serverSupabase = await createServerSupabase()
    const {
      data: {user},
    } = await serverSupabase.auth.getUser()

    const {data: game, error: gameError} = await supabase
      .from('games')
      .select('id, status')
      .eq('id', trimmedGameId)
      .eq('status', 'published')
      .single()

    if (gameError || !game) {
      return NextResponse.json({error: 'Game not found or unpublished'}, {status: 404})
    }

    const baseInsertPayload = {
      game_id: trimmedGameId,
      nickname: trimmedNickname,
      table_name: normalizedTable,
    }

    let session = null
    let insertError = null

    if (user?.id) {
      const withUserResult = await supabase
        .from('enoteca_tasting_sessions')
        .insert({
          ...baseInsertPayload,
          user_id: user.id,
        })
        .select('id')
        .single()
      session = withUserResult.data
      insertError = withUserResult.error
    }

    if (!session?.id) {
      const fallbackResult = await supabase
        .from('enoteca_tasting_sessions')
        .insert(baseInsertPayload)
        .select('id')
        .single()
      session = fallbackResult.data
      insertError = fallbackResult.error
    }

    if (insertError || !session?.id) {
      return NextResponse.json({error: insertError?.message || 'Insert failed'}, {status: 500})
    }

    return NextResponse.json({id: session.id})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
