import CourseClient from './CourseClient'
import {getWineCourseData} from '@/lib/wineCourseContent'
import {getServerLanguage} from '@/lib/i18n/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getCourseViewerState} from '@/lib/courseAccess'
import JsonLd from '@/components/JsonLd'
import {buildPageMetadata, getSiteUrl, SITE_NAME} from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata() {
  const lang = await getServerLanguage()

  return buildPageMetadata({
    title: lang === 'en' ? 'Interactive wine course' : 'Corso vino interattivo',
    description:
      lang === 'en'
        ? 'Learn wine step by step with short lessons and interactive quizzes.'
        : 'Impara il vino passo dopo passo con lezioni brevi e quiz interattivi.',
    path: '/corso-vino',
    lang,
  })
}

export default async function CorsoVino() {
  const supabase = await createServerSupabase()
  const [lang, authResult] = await Promise.all([getServerLanguage(), supabase.auth.getUser()])

  const [{levels}, {data: authData}] = await Promise.all([getWineCourseData(lang), authResult])

  let isAdmin = false
  let isPremium = false
  if (authData?.user) {
    const {data: profile} = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()
    isAdmin = profile?.super_admin === true
    isPremium = profile?.is_premium === true
  }

  const viewer = getCourseViewerState({userId: authData?.user?.id, isPremium})
  const courseUrl = getSiteUrl('/corso-vino')
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': `${courseUrl}#course`,
    name: lang === 'en' ? 'Interactive wine course' : 'Corso vino interattivo',
    description:
      lang === 'en'
        ? 'Learn wine step by step with interactive lessons and quizzes.'
        : 'Impara il vino passo dopo passo con lezioni e quiz interattivi.',
    url: courseUrl,
    inLanguage: lang === 'en' ? 'en-US' : 'it-IT',
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: getSiteUrl('/'),
    },
    hasPart: levels.map((level) => ({
      '@type': 'Course',
      name: level.title,
      description: level.description,
      url: getSiteUrl(`/corso-vino/${level.id}`),
    })),
  }

  return (
    <>
      <JsonLd data={structuredData} />
      <CourseClient levels={levels} isAdmin={isAdmin} viewer={viewer} lang={lang} />
    </>
  )
}
