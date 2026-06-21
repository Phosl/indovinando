import {createClient} from '@supabase/supabase-js'

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
        wineGroupKey: 'blind-1',
        name: 'Barolo Riserva XYZ',
        producer: 'Cantina delle Colline',
        region: 'Piemonte',
        note: 'Punteggio medio altissimo nelle degustazioni alla cieca.',
      },
      {
        id: 'blind-2',
        wineGroupKey: 'blind-2',
        name: 'Etna Rosso ABC',
        producer: 'Tenuta del Vulcano',
        region: 'Sicilia',
        note: 'Molto riconosciuto per equilibrio e personalità.',
      },
      {
        id: 'blind-3',
        wineGroupKey: 'blind-3',
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
        wineGroupKey: 'qp-1',
        name: 'Chianti Classico DEF',
        producer: 'Fattoria del Borgo',
        region: 'Toscana',
        note: 'Ottima percezione qualitativa rispetto alla fascia prezzo.',
      },
      {
        id: 'qp-2',
        wineGroupKey: 'qp-2',
        name: 'Montepulciano JKL',
        producer: 'Cantina del Sole',
        region: 'Abruzzo',
        note: 'Apprezzato per immediatezza e convenienza.',
      },
      {
        id: 'qp-3',
        wineGroupKey: 'qp-3',
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
        wineGroupKey: 'surprise-1',
        name: 'Etna Rosso ABC',
        producer: 'Tenuta del Vulcano',
        region: 'Sicilia',
        note: 'Ha superato spesso le aspettative dei partecipanti.',
      },
      {
        id: 'surprise-2',
        wineGroupKey: 'surprise-2',
        name: 'Fiano PQR',
        producer: 'Colli del Sud',
        region: 'Campania',
        note: 'Molto citato come vino rivelazione.',
      },
      {
        id: 'surprise-3',
        wineGroupKey: 'surprise-3',
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
        wineGroupKey: 'div-1',
        name: 'Orange Wine VWX',
        producer: 'Terre Libere',
        region: 'Friuli-Venezia Giulia',
        note: 'Voti molto distanti: amato da alcuni, discusso da altri.',
      },
      {
        id: 'div-2',
        wineGroupKey: 'div-2',
        name: 'Lambrusco YZA',
        producer: 'Casa Emilia',
        region: 'Emilia-Romagna',
        note: 'Divide molto in base al contesto di degustazione.',
      },
      {
        id: 'div-3',
        wineGroupKey: 'div-3',
        name: 'Aglianico BCD',
        producer: 'Radici Antiche',
        region: 'Basilicata',
        note: 'Profilo intenso, con giudizi spesso estremi.',
      },
    ],
  },
]

const FALLBACK_USER_SECTION = {
  id: 'precision',
  items: [
    {
      id: 'user-1',
      name: 'Marco',
      profileType: 'wine_lover',
      accuracyRatio: 0.92,
      sessionCount: 8,
      objectiveAnswerCount: 34,
    },
    {
      id: 'user-2',
      name: 'Giulia',
      profileType: 'sommelier',
      accuracyRatio: 0.89,
      sessionCount: 6,
      objectiveAnswerCount: 28,
    },
    {
      id: 'user-3',
      name: 'Andrea',
      profileType: 'professional',
      accuracyRatio: 0.87,
      sessionCount: 5,
      objectiveAnswerCount: 24,
    },
  ],
}

const ACTIVE_USERS_DAYS = 30
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function createRankingsClient(fallback) {
  if (SUPABASE_URL && SERVICE_ROLE_KEY) {
    return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {persistSession: false, autoRefreshToken: false},
    })
  }
  return fallback
}

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

function formatCurrency(value, currency = 'EUR', locale = 'it-IT') {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(numeric)
  } catch {
    return `${numeric.toFixed(2)} ${currency}`
  }
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

function formatPercent(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return `${Math.round(numeric * 100)}%`
}

async function loadRealGlobalStatsSnapshot(supabase) {
  const statsClient = createRankingsClient(supabase)
  const activeUsersSince = new Date(Date.now() - ACTIVE_USERS_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const [eventsResult, analyzedWinesResult, ratingsResult, activeUsersResult] = await Promise.all([
    statsClient.from('public_wine_rating_events').select('session_id, bottle_id'),
    statsClient
      .from('tasting_bottle_images')
      .select('id', {count: 'exact', head: true})
      .eq('status', 'recognized'),
    statsClient
      .from('public_wine_rating_events')
      .select('question_id', {count: 'exact', head: true})
      .eq('is_rating_question', true),
    statsClient
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

  const rankingsClient = createRankingsClient(supabase)
  const {data, error} = await rankingsClient
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
    wineGroupKey: row.wine_group_key,
    name: row.display_name || '—',
    producer: row.producer || '—',
    region: toRegionLabel(row),
    note: buildNote(sectionId, row),
  }))
}

async function loadUserRankingRows(supabase) {
  const rankingsClient = createRankingsClient(supabase)
  const {data, error} = await rankingsClient
    .from('public_user_rankings')
    .select(
      [
        'user_id',
        'display_name',
        'profile_type',
        'session_count',
        'objective_answer_count',
        'correctness_ratio',
        'precision_rank',
        'eligible_precision',
      ].join(', '),
    )
    .eq('eligible_precision', true)
    .order('precision_rank', {ascending: true})
    .limit(3)

  if (error) return []

  return (data || []).map((row) => ({
    id: `user-${row.user_id}`,
    name: row.display_name || '—',
    profileType: row.profile_type || null,
    accuracyRatio: Number(row.correctness_ratio || 0),
    sessionCount: Number(row.session_count || 0),
    objectiveAnswerCount: Number(row.objective_answer_count || 0),
  }))
}

export function getFallbackPublicRankingsSnapshot() {
  return {
    isInitialData: true,
    sectionsInitialData: true,
    userSectionInitialData: true,
    globalStats: buildFallbackGlobalStatsSnapshot(),
    userSection: FALLBACK_USER_SECTION,
    sections: FALLBACK_SECTIONS,
  }
}

function getFallbackPublicWineDetailSnapshot(wineGroupKey) {
  if (!wineGroupKey) return null

  for (const section of FALLBACK_SECTIONS) {
    const itemIndex = section.items.findIndex(
      (item) => item.wineGroupKey === wineGroupKey || item.id === wineGroupKey,
    )

    if (itemIndex === -1) continue

    const item = section.items[itemIndex]
    const placements = [{id: section.id, rank: itemIndex + 1}]

    return {
      wineGroupKey: item.wineGroupKey || item.id,
      name: item.name || '—',
      producer: item.producer || '—',
      region: item.region || '—',
      appellation: null,
      averagePrice: null,
      stats: {
        blindScore: null,
        qualityPriceScore: null,
        surpriseScore: null,
        divisiveScore: null,
        ratingCount: 0,
        tastingCount: 0,
        recognitionRate: null,
      },
      placements,
      isInitialData: true,
    }
  }

  return null
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
    const [globalStats, userRankingItems, blindItems, qualityPriceItems, surprisingItems, divisiveItems] =
      await Promise.all([
        getPublicGlobalStatsSnapshot(supabase),
        loadUserRankingRows(supabase),
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
    const userSectionInitialData = userRankingItems.length === 0

    return {
      isInitialData: sectionsInitialData || userSectionInitialData,
      sectionsInitialData,
      userSectionInitialData,
      globalStats,
      userSection: userSectionInitialData
        ? FALLBACK_USER_SECTION
        : {id: 'precision', items: userRankingItems},
      sections: sectionsInitialData ? FALLBACK_SECTIONS : sections,
    }
  } catch {
    return getFallbackPublicRankingsSnapshot()
  }
}

export async function getPublicWineDetailSnapshot(supabase, wineGroupKey, lang = 'it') {
  if (!wineGroupKey) return null
  if (!supabase) return getFallbackPublicWineDetailSnapshot(wineGroupKey)

  const locale = lang === 'en' ? 'en-US' : 'it-IT'

  try {
    const rankingsClient = createRankingsClient(supabase)
    const {data, error} = await rankingsClient
      .from('public_wine_rankings')
      .select(
        [
          'wine_group_key',
          'display_name',
          'producer',
          'region_label',
          'appellation_label',
          'avg_price_value',
          'blind_score',
          'quality_price_score',
          'surprise_score',
          'divisive_score',
          'rating_count',
          'rating_session_count',
          'correctness_ratio',
          'eligible_blind',
          'eligible_quality_price',
          'eligible_surprising',
          'eligible_divisive',
          'blind_rank',
          'quality_price_rank',
          'surprise_rank',
          'divisive_rank',
        ].join(', '),
      )
      .eq('wine_group_key', wineGroupKey)
      .maybeSingle()

    if (error || !data) return getFallbackPublicWineDetailSnapshot(wineGroupKey)

    const placements = [
      data.eligible_blind && data.blind_rank
        ? {id: 'blind', rank: data.blind_rank}
        : null,
      data.eligible_quality_price && data.quality_price_rank
        ? {id: 'qualityPrice', rank: data.quality_price_rank}
        : null,
      data.eligible_surprising && data.surprise_rank
        ? {id: 'surprising', rank: data.surprise_rank}
        : null,
      data.eligible_divisive && data.divisive_rank
        ? {id: 'divisive', rank: data.divisive_rank}
        : null,
    ].filter(Boolean)

    return {
      wineGroupKey: data.wine_group_key,
      name: data.display_name || '—',
      producer: data.producer || '—',
      region: data.region_label || '—',
      appellation: data.appellation_label || null,
      averagePrice: formatCurrency(data.avg_price_value, 'EUR', locale),
      stats: {
        blindScore: formatScore(data.blind_score),
        qualityPriceScore: formatScore(data.quality_price_score, 3),
        surpriseScore: formatScore(data.surprise_score, 2),
        divisiveScore: formatScore(data.divisive_score, 3),
        ratingCount: data.rating_count || 0,
        tastingCount: data.rating_session_count || 0,
        recognitionRate: Number.isFinite(Number(data.correctness_ratio))
          ? `${Math.round(Number(data.correctness_ratio) * 100)}%`
          : null,
      },
      placements,
      isInitialData: false,
    }
  } catch {
    return getFallbackPublicWineDetailSnapshot(wineGroupKey)
  }
}
