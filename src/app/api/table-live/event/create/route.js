import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createAdminSupabaseOrFallback} from '@/lib/supabaseAdmin'
import {
  ensureActiveTableLiveEvent,
  getActiveTableLiveEvent,
} from '@/lib/tableLiveEvents'

function logEventError(operation, gameId, error) {
  console.error('[table-live event]', {
    operation,
    gameId,
    code: error?.code || 'UNKNOWN',
  })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const gameId = String(body?.gameId || '').trim()
    const title = String(body?.title || '').trim()
    const inactivityTimeoutMinutes = Number(body?.inactivityTimeoutMinutes || 15)

    if (!gameId || !title) {
      return NextResponse.json({error: 'Missing required fields'}, {status: 400})
    }

    if (!Number.isInteger(inactivityTimeoutMinutes) || inactivityTimeoutMinutes < 1 || inactivityTimeoutMinutes > 240) {
      return NextResponse.json({error: 'Invalid inactivity timeout'}, {status: 400})
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
      .eq('id', gameId)
      .eq('created_by', user.id)
      .maybeSingle()

    if (gameError || !game) {
      return NextResponse.json({error: 'Game not found'}, {status: 404})
    }

    const db = createAdminSupabaseOrFallback(supabase)
    const {event, error, created} = await ensureActiveTableLiveEvent(db, {
      gameId,
      createdBy: user.id,
      title,
      inactivityTimeoutMinutes,
    })

    if (error || !event) {
      logEventError('ensure', gameId, error)
      return NextResponse.json({error: 'Unable to prepare this event'}, {status: 500})
    }

    return NextResponse.json({
      event,
      id: event.id,
      slug: event.slug,
      url: event.url,
      created,
    })
  } catch (error) {
    logEventError('ensure-unexpected', null, error)
    return NextResponse.json({error: 'Unable to prepare this event'}, {status: 500})
  }
}

export async function GET(request) {
  try {
    const {searchParams} = new URL(request.url)
    const gameId = String(searchParams.get('gameId') || '').trim()

    if (!gameId) {
      return NextResponse.json({error: 'Missing gameId'}, {status: 400})
    }

    const supabase = await createServerSupabase()
    const {
      data: {user},
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({error: 'Not authenticated'}, {status: 401})
    }

    const {event, error} = await getActiveTableLiveEvent(supabase, {
      gameId,
      createdBy: user.id,
    })

    if (error) {
      logEventError('find-active', gameId, error)
      return NextResponse.json({error: 'Unable to load this event'}, {status: 500})
    }

    if (!event) {
      return NextResponse.json({event: null})
    }

    return NextResponse.json({event})
  } catch (error) {
    logEventError('find-active-unexpected', null, error)
    return NextResponse.json({error: 'Unable to load this event'}, {status: 500})
  }
}
