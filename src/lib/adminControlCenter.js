import 'server-only'

import {createAdminSupabase} from '@/lib/supabaseAdmin'
import {getAppVersion} from '@/lib/appVersion'

const TABLE_LIVE_REPORT = {
  status: 'passed',
  lastRunAt: '2026-07-10T00:00:00.000Z',
  checks: [
    'Host leave',
    'Instant answers',
    'End reveal answers',
    'Guest permissions',
    'Refresh restore',
    'Final standings',
  ],
}

const CONFIG_GROUPS = [
  {
    key: 'core',
    label: 'Core app',
    required: true,
    items: [
      ['Supabase URL', 'NEXT_PUBLIC_SUPABASE_URL'],
      ['Supabase anon key', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
      ['Supabase service role', 'SUPABASE_SERVICE_ROLE_KEY'],
      ['URL pubblica app', 'NEXT_PUBLIC_APP_URL'],
    ],
  },
  {
    key: 'ai',
    label: 'AI e riconoscimento',
    required: false,
    items: [
      ['OpenAI', 'OPENAI_API_KEY'],
      ['Google Vision', 'GOOGLE_CLOUD_VISION_API_KEY'],
    ],
  },
  {
    key: 'payments',
    label: 'Stripe',
    required: false,
    items: [
      ['Publishable key', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
      ['Secret key', 'STRIPE_SECRET_KEY'],
      ['Webhook secret', 'STRIPE_WEBHOOK_SECRET'],
      ['Pacchetto 10 crediti', 'STRIPE_PRICE_AI_CREDITS_10'],
      ['Pacchetto 30 crediti', 'STRIPE_PRICE_AI_CREDITS_30'],
      ['Pacchetto 100 crediti', 'STRIPE_PRICE_AI_CREDITS_100'],
    ],
  },
  {
    key: 'maps',
    label: 'Mappe',
    required: false,
    items: [['Google Maps', 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY']],
  },
]

const QUICK_DATABASE_CHECKS = [
  ['profiles', 'Profili'],
  ['games', 'Degustazioni'],
  ['table_live_sessions', 'Sessioni table-live'],
  ['tasting_bottle_images', 'Scansioni bottiglie'],
  ['ai_credit_purchase_orders', 'Ordini crediti'],
]

const DEEP_DATABASE_CHECKS = [
  ...QUICK_DATABASE_CHECKS,
  ['game_bottles', 'Bottiglie'],
  ['game_questions', 'Domande'],
  ['game_question_options', 'Opzioni domande'],
  ['table_live_events', 'Eventi table-live'],
  ['table_live_players', 'Giocatori table-live'],
  ['table_live_round_answers', 'Risposte table-live'],
  ['wine_course_progress', 'Progressi corso'],
  ['public_wine_rankings', 'Classifica vini'],
  ['public_user_rankings', 'Classifica utenti'],
]

function configured(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function buildConfigurationSnapshot() {
  return CONFIG_GROUPS.map((group) => {
    const items = group.items.map(([label, envName]) => ({
      label,
      configured: configured(process.env[envName]),
    }))
    const configuredCount = items.filter((item) => item.configured).length
    return {
      key: group.key,
      label: group.label,
      required: group.required,
      status:
        configuredCount === items.length
          ? 'ok'
          : configuredCount === 0
            ? group.required
              ? 'error'
              : 'off'
            : 'warning',
      configuredCount,
      totalCount: items.length,
      items,
    }
  })
}

async function runCount(db, table, filters = []) {
  const startedAt = Date.now()
  try {
    let query = db.from(table).select('*', {count: 'exact', head: true})
    for (const [method, column, value] of filters) {
      query = query[method](column, value)
    }
    const {count, error} = await query
    if (error) throw error
    return {ok: true, count: count || 0, durationMs: Date.now() - startedAt}
  } catch (error) {
    return {
      ok: false,
      count: null,
      durationMs: Date.now() - startedAt,
      error: error?.message || 'Controllo non disponibile',
    }
  }
}

async function runDatabaseCheck(db, [table, label]) {
  const result = await runCount(db, table)
  return {
    key: table,
    label,
    status: result.ok ? 'ok' : 'error',
    durationMs: result.durationMs,
    detail: result.ok ? `${result.count} record raggiungibili` : result.error,
  }
}

async function getMetrics(db) {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [
    profiles,
    games,
    publicPartners,
    activeEvents,
    playingSessions,
    finishedSessions,
    failedScans,
    processingScans,
    pendingOrders,
    failedOrders,
  ] = await Promise.all([
    runCount(db, 'profiles'),
    runCount(db, 'games'),
    runCount(db, 'profiles', [['eq', 'is_partner_public', true]]),
    runCount(db, 'table_live_events', [['eq', 'status', 'active']]),
    runCount(db, 'table_live_sessions', [['eq', 'status', 'playing']]),
    runCount(db, 'table_live_sessions', [
      ['eq', 'status', 'finished'],
      ['gte', 'updated_at', last24Hours],
    ]),
    runCount(db, 'tasting_bottle_images', [
      ['eq', 'status', 'failed'],
      ['gte', 'created_at', last24Hours],
    ]),
    runCount(db, 'tasting_bottle_images', [['eq', 'status', 'processing']]),
    runCount(db, 'ai_credit_purchase_orders', [['eq', 'status', 'pending']]),
    runCount(db, 'ai_credit_purchase_orders', [
      ['eq', 'status', 'failed'],
      ['gte', 'created_at', last24Hours],
    ]),
  ])

  return [
    {key: 'profiles', label: 'Profili', value: profiles.count, status: profiles.ok ? 'ok' : 'error'},
    {key: 'games', label: 'Degustazioni', value: games.count, status: games.ok ? 'ok' : 'error'},
    {
      key: 'partners',
      label: 'Partner pubblici',
      value: publicPartners.count,
      status: publicPartners.ok ? 'ok' : 'error',
    },
    {
      key: 'events',
      label: 'Eventi attivi',
      value: activeEvents.count,
      status: activeEvents.ok ? 'ok' : 'error',
    },
    {
      key: 'playing',
      label: 'Partite live ora',
      value: playingSessions.count,
      status: playingSessions.ok ? 'info' : 'error',
    },
    {
      key: 'finished24h',
      label: 'Partite concluse 24h',
      value: finishedSessions.count,
      status: finishedSessions.ok ? 'ok' : 'error',
    },
    {
      key: 'failedScans',
      label: 'Scansioni fallite 24h',
      value: failedScans.count,
      status: !failedScans.ok ? 'error' : failedScans.count > 0 ? 'warning' : 'ok',
    },
    {
      key: 'processingScans',
      label: 'Scansioni in corso',
      value: processingScans.count,
      status: !processingScans.ok ? 'error' : processingScans.count > 5 ? 'warning' : 'info',
    },
    {
      key: 'pendingOrders',
      label: 'Ordini in attesa',
      value: pendingOrders.count,
      status: !pendingOrders.ok ? 'error' : pendingOrders.count > 0 ? 'warning' : 'ok',
    },
    {
      key: 'failedOrders',
      label: 'Pagamenti falliti 24h',
      value: failedOrders.count,
      status: !failedOrders.ok ? 'error' : failedOrders.count > 0 ? 'warning' : 'ok',
    },
  ]
}

async function getStorageService(db) {
  const startedAt = Date.now()
  try {
    const {data, error} = await db.storage.listBuckets()
    if (error) throw error
    return {
      key: 'storage',
      label: 'Supabase Storage',
      status: 'ok',
      durationMs: Date.now() - startedAt,
      detail: `${data?.length || 0} bucket raggiungibili`,
    }
  } catch (error) {
    return {
      key: 'storage',
      label: 'Supabase Storage',
      status: 'error',
      durationMs: Date.now() - startedAt,
      detail: error?.message || 'Storage non raggiungibile',
    }
  }
}

function getOverallStatus(configuration, services, metrics) {
  if (
    configuration.some((group) => group.required && group.status === 'error') ||
    services.some((service) => service.status === 'error') ||
    metrics.some((metric) => metric.status === 'error')
  ) {
    return 'error'
  }
  if (
    configuration.some((group) => group.status === 'warning') ||
    metrics.some((metric) => metric.status === 'warning')
  ) {
    return 'warning'
  }
  return 'ok'
}

export async function getControlCenterSnapshot({scope = 'quick'} = {}) {
  const startedAt = Date.now()
  const configuration = buildConfigurationSnapshot()
  const appVersion = await getAppVersion()
  let services = []
  let metrics = []

  try {
    const db = createAdminSupabase()
    const checks = scope === 'deep' ? DEEP_DATABASE_CHECKS : QUICK_DATABASE_CHECKS
    const [databaseChecks, metricSnapshot, storageCheck] = await Promise.all([
      Promise.all(checks.map((check) => runDatabaseCheck(db, check))),
      getMetrics(db),
      scope === 'deep' ? getStorageService(db) : Promise.resolve(null),
    ])
    services = storageCheck ? [...databaseChecks, storageCheck] : databaseChecks
    metrics = metricSnapshot
  } catch (error) {
    services = [
      {
        key: 'database',
        label: 'Supabase database',
        status: 'error',
        durationMs: Date.now() - startedAt,
        detail: error?.message || 'Client admin non disponibile',
      },
    ]
  }

  return {
    scope,
    status: getOverallStatus(configuration, services, metrics),
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    deployment: {
      version: appVersion,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
      region: process.env.VERCEL_REGION || null,
    },
    configuration,
    services,
    metrics,
    reports: {
      tableLive: TABLE_LIVE_REPORT,
    },
  }
}
