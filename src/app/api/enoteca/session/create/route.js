import {NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'

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

    const {data: game, error: gameError} = await supabase
      .from('games')
      .select('id, status')
      .eq('id', trimmedGameId)
      .eq('status', 'published')
      .single()

    if (gameError || !game) {
      return NextResponse.json({error: 'Game not found or unpublished'}, {status: 404})
    }

    const {data: session, error: insertError} = await supabase
      .from('enoteca_tasting_sessions')
      .insert({
        game_id: trimmedGameId,
        nickname: trimmedNickname,
        table_name: normalizedTable,
      })
      .select('id')
      .single()

    if (insertError || !session?.id) {
      return NextResponse.json({error: insertError?.message || 'Insert failed'}, {status: 500})
    }

    return NextResponse.json({id: session.id})
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
