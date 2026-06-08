const FALLBACK_GLOBAL_STATS = [
  {id: 'tastings', icon: '🍷', value: '12.458'},
  {id: 'analyzedWines', icon: '🍇', value: '8.921'},
  {id: 'ratings', icon: '⭐', value: '187.532'},
  {id: 'activeUsers', icon: '👥', value: '4.120'},
]

const FALLBACK_SECTIONS = [
  {
    id: 'blind',
    emoji: '🏆',
    items: [
      {
        id: 'blind-1',
        name: 'Barolo Riserva XYZ',
        producer: 'Cantina delle Colline',
        region: 'Piemonte',
        note: 'Punteggio medio altissimo nelle degustazioni alla cieca.',
      },
      {
        id: 'blind-2',
        name: 'Etna Rosso ABC',
        producer: 'Tenuta del Vulcano',
        region: 'Sicilia',
        note: 'Molto riconosciuto per equilibrio e personalità.',
      },
      {
        id: 'blind-3',
        name: 'Verdicchio Classico GHI',
        producer: 'Podere Adriatico',
        region: 'Marche',
        note: 'Sorprende spesso anche assaggiatori esperti.',
      },
    ],
  },
  {
    id: 'qualityPrice',
    emoji: '💰',
    items: [
      {
        id: 'qp-1',
        name: 'Chianti Classico DEF',
        producer: 'Fattoria del Borgo',
        region: 'Toscana',
        note: 'Ottima percezione qualitativa rispetto alla fascia prezzo.',
      },
      {
        id: 'qp-2',
        name: 'Montepulciano JKL',
        producer: 'Cantina del Sole',
        region: 'Abruzzo',
        note: 'Apprezzato per immediatezza e convenienza.',
      },
      {
        id: 'qp-3',
        name: 'Soave MNO',
        producer: 'Villa del Vento',
        region: 'Veneto',
        note: 'Molto scelto nei quiz come vino dal valore sorprendente.',
      },
    ],
  },
  {
    id: 'surprising',
    emoji: '🍷',
    items: [
      {
        id: 'surprise-1',
        name: 'Etna Rosso ABC',
        producer: 'Tenuta del Vulcano',
        region: 'Sicilia',
        note: 'Ha superato spesso le aspettative dei partecipanti.',
      },
      {
        id: 'surprise-2',
        name: 'Fiano PQR',
        producer: 'Colli del Sud',
        region: 'Campania',
        note: 'Molto citato come vino rivelazione.',
      },
      {
        id: 'surprise-3',
        name: 'Franciacorta STU',
        producer: 'Metodo Vivo',
        region: 'Lombardia',
        note: 'Colpisce per finezza e resa in degustazione.',
      },
    ],
  },
  {
    id: 'divisive',
    emoji: '🔥',
    items: [
      {
        id: 'div-1',
        name: 'Orange Wine VWX',
        producer: 'Terre Libere',
        region: 'Friuli-Venezia Giulia',
        note: 'Voti molto distanti: amato da alcuni, discusso da altri.',
      },
      {
        id: 'div-2',
        name: 'Lambrusco YZA',
        producer: 'Casa Emilia',
        region: 'Emilia-Romagna',
        note: 'Divide molto in base al contesto di degustazione.',
      },
      {
        id: 'div-3',
        name: 'Aglianico BCD',
        producer: 'Radici Antiche',
        region: 'Basilicata',
        note: 'Profilo intenso, con giudizi spesso estremi.',
      },
    ],
  },
]

const ACTIVE_USERS_DAYS = 30

function formatCount(value) {
  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric)) return '0'
  return new Intl.NumberFormat('it-IT').format(numeric)
}

function formatScore(value, digits = 2) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return numeric.toFixed(digits)
}

function toRegionLabel(row) {
  return row?.region_label || row?.appellation_label || '—'
}

function buildNote(sectionId, row) {
  if (sectionId === 'blind') {
    return `Rating medio ${formatScore(row.blind_score)} su ${row.rating_count} valutazioni reali.`
  }
  if (sectionId === 'qualityPrice') {
    return `Qualità/prezzo ${formatScore(row.quality_price_score, 3)} con prezzo medio ${formatScore(row.avg_price_value)}.`
  }
  if (sectionId === 'surprising') {
    return `Sorprendente: rating ${formatScore(row.blind_score)} con riconoscibilità ${formatScore((row.correctness_ratio || 0) * 100, 0)}%.`
  }
  if (sectionId === 'divisive') {
    return `Molto divisivo: deviazione voti ${formatScore(row.divisive_score, 3)} su ${row.rating_count} valutazioni.`
  }
  return null
}

function buildFallbackGlobalStatsSnapshot() {
  return {
    isInitialData: true,
    items: FALLBACK_GLOBAL_STATS,
    meta: {
      activeUsersDays: ACTIVE_USERS_DAYS,
    },
  }
}

async function loadRealGlobalStatsSnapshot(supabase) {
  const activeUsersSince = new Date(Date.now() - ACTIVE_USERS_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const [eventsResult, analyzedWinesResult, ratingsResult, activeUsersResult] = await Promise.all([
    supabase.from('public_wine_rating_events').select('session_id, bottle_id'),
    supabase
      .from('tasting_bottle_images')
      .select('id', {count: 'exact', head: true})
      .eq('status', 'recognized'),
    supabase
      .from('public_wine_rating_events')
      .select('question_id', {count: 'exact', head: true})
      .eq('is_rating_question', true),
    supabase
      .from('public_wine_rating_events')
      .select('user_id')
      .not('user_id', 'is', null)
      .gte('session_completed_at', activeUsersSince),
  ])

  if (eventsResult.error || analyzedWinesResult.error || ratingsResult.error || activeUsersResult.error) {
    return buildFallbackGlobalStatsSnapshot()
  }

  const tastingsSet = new Set((eventsResult.data || []).map((row) => row.session_id).filter(Boolean))
  const activeUsersSet = new Set(
    (activeUsersResult.data || []).map((row) => row.user_id).filter(Boolean),
  )

  return {
    isInitialData: false,
    items: [
      {id: 'tastings', icon: '🍷', value: formatCount(tastingsSet.size)},
      {id: 'analyzedWines', icon: '🍇', value: formatCount(analyzedWinesResult.count || 0)},
      {id: 'ratings', icon: '⭐', value: formatCount(ratingsResult.count || 0)},
      {id: 'activeUsers', icon: '👥', value: formatCount(activeUsersSet.size)},
    ],
    meta: {
      activeUsersDays: ACTIVE_USERS_DAYS,
    },
  }
}

async function loadSectionRows(supabase, sectionId) {
  const config = {
    blind: {rank: 'blind_rank', eligible: 'eligible_blind'},
    qualityPrice: {rank: 'quality_price_rank', eligible: 'eligible_quality_price'},
    surprising: {rank: 'surprise_rank', eligible: 'eligible_surprising'},
    divisive: {rank: 'divisive_rank', eligible: 'eligible_divisive'},
  }[sectionId]

  if (!config) return []

  const {data, error} = await supabase
    .from('public_wine_rankings')
    .select(
      'wine_group_key, display_name, producer, region_label, appellation_label, blind_score, quality_price_score, surprise_score, divisive_score, avg_price_value, correctness_ratio, rating_count',
    )
    .eq(config.eligible, true)
    .order(config.rank, {ascending: true})
    .limit(3)

  if (error) return []

  return (data || []).map((row) => ({
    id: `${sectionId}-${row.wine_group_key}`,
    name: row.display_name || '—',
    producer: row.producer || '—',
    region: toRegionLabel(row),
    note: buildNote(sectionId, row),
  }))
}

export function getFallbackPublicRankingsSnapshot() {
  return {
    isInitialData: true,
    sectionsInitialData: true,
    globalStats: buildFallbackGlobalStatsSnapshot(),
    sections: FALLBACK_SECTIONS,
  }
}

export async function getPublicGlobalStatsSnapshot(supabase) {
  if (!supabase) {
    return buildFallbackGlobalStatsSnapshot()
  }

  try {
    return await loadRealGlobalStatsSnapshot(supabase)
  } catch {
    return buildFallbackGlobalStatsSnapshot()
  }
}

export async function getPublicRankingsSnapshot(supabase) {
  if (!supabase) {
    return getFallbackPublicRankingsSnapshot()
  }

  try {
    const [globalStats, blindItems, qualityPriceItems, surprisingItems, divisiveItems] =
      await Promise.all([
        getPublicGlobalStatsSnapshot(supabase),
        loadSectionRows(supabase, 'blind'),
        loadSectionRows(supabase, 'qualityPrice'),
        loadSectionRows(supabase, 'surprising'),
        loadSectionRows(supabase, 'divisive'),
      ])

    const sections = [
      {id: 'blind', emoji: '🏆', items: blindItems},
      {id: 'qualityPrice', emoji: '💰', items: qualityPriceItems},
      {id: 'surprising', emoji: '🍷', items: surprisingItems},
      {id: 'divisive', emoji: '🔥', items: divisiveItems},
    ]

    const sectionsInitialData = sections.some((section) => section.items.length === 0)

    return {
      isInitialData: sectionsInitialData,
      sectionsInitialData,
      globalStats,
      sections: sectionsInitialData ? FALLBACK_SECTIONS : sections,
    }
  } catch {
    return getFallbackPublicRankingsSnapshot()
  }
}
