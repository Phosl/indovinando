import 'server-only'

const TABLE_LIVE_EVENT_SELECT = 'id, slug, title, game_id, status, created_at'

function slugifyEventTitle(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function toEventDto(event) {
  if (!event) return null

  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    gameId: event.game_id,
    status: event.status,
    createdAt: event.created_at,
    url: `/table-live/event/${event.slug}`,
  }
}

export async function getActiveTableLiveEvent(db, {gameId, createdBy}) {
  const {data, error} = await db
    .from('table_live_events')
    .select(TABLE_LIVE_EVENT_SELECT)
    .eq('game_id', gameId)
    .eq('created_by', createdBy)
    .eq('status', 'active')
    .order('created_at', {ascending: false})
    .limit(1)
    .maybeSingle()

  return {
    event: error ? null : toEventDto(data),
    error,
  }
}

export async function ensureActiveTableLiveEvent(
  db,
  {gameId, createdBy, title, inactivityTimeoutMinutes = 15},
) {
  const existingResult = await getActiveTableLiveEvent(db, {gameId, createdBy})
  if (existingResult.error || existingResult.event) {
    return {
      ...existingResult,
      created: false,
    }
  }

  const baseSlug = slugifyEventTitle(title) || 'evento'
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? '' : `-${Math.floor(100 + Math.random() * 900)}`
    const {data, error} = await db
      .from('table_live_events')
      .insert({
        slug: `${baseSlug}${suffix}`,
        title,
        game_id: gameId,
        created_by: createdBy,
        inactivity_timeout_minutes: inactivityTimeoutMinutes,
        status: 'active',
      })
      .select(TABLE_LIVE_EVENT_SELECT)
      .maybeSingle()

    if (!error && data) {
      return {
        event: toEventDto(data),
        error: null,
        created: true,
      }
    }

    if (error?.code !== '23505') {
      return {
        event: null,
        error,
        created: false,
      }
    }
  }

  return {
    event: null,
    error: {
      code: 'TABLE_LIVE_SLUG_UNAVAILABLE',
      message: 'Unable to create a unique table-live event slug',
    },
    created: false,
  }
}
