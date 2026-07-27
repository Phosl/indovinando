import {notFound, redirect} from 'next/navigation'
import LessonClient from './LessonClient'
import {getWineCourseData} from '@/lib/wineCourseContent'
import {getServerLanguage} from '@/lib/i18n/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {canAccessLevel, getAuthRedirectPath} from '@/lib/courseAccess'
import JsonLd from '@/components/JsonLd'
import {buildPageMetadata, getSiteUrl, SITE_NAME} from '@/lib/seo'

export const revalidate = 300

export async function generateStaticParams() {
  const {levels} = await getWineCourseData('it')
  return levels.flatMap((l) => l.lessonIds.map((lessonId) => ({levelId: l.id, lessonId})))
}

export async function generateMetadata({params}) {
  const lang = await getServerLanguage()
  const {levels, lessonsById} = await getWineCourseData(lang)
  const {levelId, lessonId} = await params
  const level = levels.find((item) => item.id === levelId)
  const lesson = lessonsById[lessonId]
  if (!level || !lesson) {
    return buildPageMetadata({
      title: lang === 'en' ? 'Lesson not found' : 'Lezione non trovata',
      path: `/corso-vino/${levelId}/${lessonId}`,
      lang,
      noIndex: true,
    })
  }

  const description =
    lesson.intro?.paragraphs?.find((paragraph) => String(paragraph || '').trim()) ||
    (lang === 'en'
      ? `Interactive wine lesson: ${lesson.title}.`
      : `Lezione interattiva sul vino: ${lesson.title}.`)

  return buildPageMetadata({
    title: `${lesson.title} · ${lang === 'en' ? 'Wine course' : 'Corso vino'}`,
    description,
    path: `/corso-vino/${level.id}/${lesson.id}`,
    lang,
    noIndex: !canAccessLevel(level),
  })
}

export default async function LessonPage({params}) {
  const [lang, resolvedParams] = await Promise.all([getServerLanguage(), params])
  const supabase = await createServerSupabase()
  const {levels, lessonsById} = await getWineCourseData(lang)
  const {levelId, lessonId} = resolvedParams
  const level = levels.find((l) => l.id === levelId)
  const lesson = lessonsById[lessonId]
  if (!level || !lesson) notFound()

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
      redirect(getAuthRedirectPath(`/corso-vino/${levelId}/${lessonId}`, lang))
    }
    redirect('/corso-vino')
  }

  const currentIndex = level.lessonIds.indexOf(lessonId)
  const nextLessonId = currentIndex >= 0 ? (level.lessonIds[currentIndex + 1] ?? null) : null
  const lessonUrl = getSiteUrl(`/corso-vino/${level.id}/${lesson.id}`)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${lessonUrl}#lesson`,
    name: lesson.title,
    description: lesson.intro?.paragraphs?.[0],
    url: lessonUrl,
    inLanguage: lang === 'en' ? 'en-US' : 'it-IT',
    learningResourceType: 'Lesson',
    isPartOf: {
      '@type': 'Course',
      name: level.title,
      url: getSiteUrl(`/corso-vino/${level.id}`),
    },
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: getSiteUrl('/'),
    },
  }

  return (
    <>
      <JsonLd data={structuredData} />
      <LessonClient
        level={level}
        lesson={lesson}
        nextLessonId={nextLessonId}
        levels={levels}
      />
    </>
  )
}
