import {notFound, redirect} from 'next/navigation'
import LevelClient from './LevelClient'
import {getWineCourseData} from '@/lib/wineCourseContent'
import {getServerLanguage} from '@/lib/i18n/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {canAccessLevel, getAuthRedirectPath} from '@/lib/courseAccess'
import JsonLd from '@/components/JsonLd'
import {buildPageMetadata, getSiteUrl, SITE_NAME} from '@/lib/seo'

export const revalidate = 300

export async function generateStaticParams() {
  const {levels} = await getWineCourseData('it')
  return levels.map((l) => ({levelId: l.id}))
}

export async function generateMetadata({params}) {
  const lang = await getServerLanguage()
  const {levels} = await getWineCourseData(lang)
  const {levelId} = await params
  const level = levels.find((l) => l.id === levelId)
  if (!level) {
    return buildPageMetadata({
      title: lang === 'en' ? 'Course level not found' : 'Livello del corso non trovato',
      path: `/corso-vino/${levelId}`,
      lang,
      noIndex: true,
    })
  }

  return buildPageMetadata({
    title: `${level.title} · ${lang === 'en' ? 'Wine course' : 'Corso vino'}`,
    description:
      level.description ||
      (lang === 'en'
        ? 'Interactive lessons to learn wine step by step.'
        : 'Lezioni interattive per imparare il vino passo dopo passo.'),
    path: `/corso-vino/${level.id}`,
    lang,
    noIndex: !canAccessLevel(level),
  })
}

export default async function LevelPage({params}) {
  const [lang, resolvedParams] = await Promise.all([getServerLanguage(), params])
  const supabase = await createServerSupabase()
  const {levels, lessonsById} = await getWineCourseData(lang)
  const {levelId} = resolvedParams
  const level = levels.find((l) => l.id === levelId)
  if (!level) notFound()

  const {
    data: {user},
  } = await supabase.auth.getUser()

  let isPremium = false
  if (user) {
    const {data: profile} = await supabase.from('profiles').select('*').eq('id', user.id).single()
    isPremium = profile?.is_premium === true
  }

  const canAccess = canAccessLevel(level, {userId: user?.id, isPremium})
  if (!canAccess) {
    if (!user) {
      redirect(getAuthRedirectPath(`/corso-vino/${levelId}`, lang))
    }
    redirect('/corso-vino')
  }

  const levelIndex = levels.findIndex((l) => l.id === levelId)
  const lessons = level.lessonIds.map((id) => lessonsById[id]).filter(Boolean)
  const levelUrl = getSiteUrl(`/corso-vino/${level.id}`)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': `${levelUrl}#course`,
    name: level.title,
    description: level.description,
    url: levelUrl,
    inLanguage: lang === 'en' ? 'en-US' : 'it-IT',
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: getSiteUrl('/'),
    },
    hasPart: lessons.map((lesson) => ({
      '@type': 'LearningResource',
      name: lesson.title,
      url: getSiteUrl(`/corso-vino/${level.id}/${lesson.id}`),
      learningResourceType: 'Lesson',
    })),
  }

  return (
    <>
      <JsonLd data={structuredData} />
      <LevelClient level={level} levelIndex={levelIndex} levels={levels} lessons={lessons} />
    </>
  )
}
