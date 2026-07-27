import {createClient} from '@supabase/supabase-js'
import {canAccessLevel} from '@/lib/courseAccess'
import {listPublicPartners} from '@/lib/partners'
import {listPublicWineKeys} from '@/lib/publicRankings'
import {getSiteUrl} from '@/lib/seo'
import {getWineCourseData} from '@/lib/wineCourseContent'

export const revalidate = 3600

const STATIC_ROUTES = [
  {path: '/', changeFrequency: 'weekly', priority: 1},
  {path: '/demo', changeFrequency: 'monthly', priority: 0.9},
  {path: '/classifiche', changeFrequency: 'daily', priority: 0.8},
  {path: '/partner', changeFrequency: 'weekly', priority: 0.8},
  {path: '/corso-vino', changeFrequency: 'weekly', priority: 0.7},
  {path: '/info', changeFrequency: 'monthly', priority: 0.5},
  {path: '/changelog', changeFrequency: 'weekly', priority: 0.4},
  {path: '/copyright', changeFrequency: 'yearly', priority: 0.2},
]

function createSitemapSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

function logSitemapFallback(reason, error) {
  const details =
    error instanceof Error
      ? {name: error.name, message: error.message}
      : error
        ? {message: String(error)}
        : undefined

  console.warn('[seo:sitemap] Using static entries only', {reason, ...details})
}

export default async function sitemap() {
  const staticEntries = STATIC_ROUTES.map(({path, ...entry}) => ({
    url: getSiteUrl(path),
    ...entry,
  }))

  try {
    const supabase = createSitemapSupabase()
    if (!supabase) {
      logSitemapFallback('missing Supabase environment variables')
      return staticEntries
    }

    const [partners, wineKeys, courseData] = await Promise.all([
      listPublicPartners(supabase, 'it'),
      listPublicWineKeys(supabase),
      getWineCourseData('it'),
    ])

    const partnerEntries = partners.map((partner) => ({
      url: getSiteUrl(`/partner/${encodeURIComponent(partner.slug)}`),
      changeFrequency: 'weekly',
      priority: 0.6,
    }))

    const wineEntries = wineKeys.map((wineKey) => ({
      url: getSiteUrl(`/classifiche/${encodeURIComponent(wineKey)}`),
      changeFrequency: 'daily',
      priority: 0.6,
    }))

    const freeCourseEntries = (courseData.levels || [])
      .filter((level) => canAccessLevel(level))
      .flatMap((level) => [
        {
          url: getSiteUrl(`/corso-vino/${level.id}`),
          changeFrequency: 'monthly',
          priority: 0.7,
        },
        ...level.lessonIds.map((lessonId) => ({
          url: getSiteUrl(`/corso-vino/${level.id}/${lessonId}`),
          changeFrequency: 'monthly',
          priority: 0.6,
        })),
      ])

    return [...staticEntries, ...partnerEntries, ...wineEntries, ...freeCourseEntries]
  } catch (error) {
    logSitemapFallback('dynamic entries could not be loaded', error)
    return staticEntries
  }
}
