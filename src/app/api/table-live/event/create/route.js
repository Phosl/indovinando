import {NextResponse} from 'next/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {createAdminSupabaseOrFallback} from '@/lib/supabaseAdmin'

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
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
    const base = slugify(title) || 'evento'

    let created = null
    for (let i = 0; i < 20; i++) {
      const suffix = i === 0 ? '' : `-${Math.floor(100 + Math.random() * 900)}`
      const slug = `${base}${suffix}`
      const {data, error} = await db
        .from('table_live_events')
        .insert({
          slug,
          title,
          game_id: gameId,
          created_by: user.id,
          inactivity_timeout_minutes: inactivityTimeoutMinutes,
          status: 'active',
        })
        .select('id, slug, title, game_id')
        .maybeSingle()

      if (!error && data) {
        created = data
        break
      }

      if (error && error.code !== '23505') {
        return NextResponse.json({error: error.message}, {status: 500})
      }
    }

    if (!created) {
      return NextResponse.json({error: 'Unable to create event slug'}, {status: 500})
    }

    return NextResponse.json({
      id: created.id,
      slug: created.slug,
      url: `/table-live/event/${created.slug}`,
    })
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
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

    const {data: event, error} = await supabase
      .from('table_live_events')
      .select('id, slug, title, game_id, status, created_at')
      .eq('game_id', gameId)
      .eq('created_by', user.id)
      .eq('status', 'active')
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({error: error.message}, {status: 500})
    }

    if (!event) {
      return NextResponse.json({event: null})
    }

    return NextResponse.json({
      event: {
        id: event.id,
        slug: event.slug,
        title: event.title,
        url: `/table-live/event/${event.slug}`,
      },
    })
  } catch (error) {
    return NextResponse.json({error: error?.message || 'Unexpected error'}, {status: 500})
  }
}
