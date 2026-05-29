import {notFound} from 'next/navigation'
import LessonClient from './LessonClient'
import {getWineCourseData} from '@/lib/wineCourseContent'
import {getServerLanguage} from '@/lib/i18n/server'

export const revalidate = 300

export async function generateStaticParams() {
  const {levels} = await getWineCourseData('it')
  return levels.flatMap((l) => l.lessonIds.map((lessonId) => ({levelId: l.id, lessonId})))
}

export async function generateMetadata({params}) {
  const lang = await getServerLanguage()
  const {lessonsById} = await getWineCourseData(lang)
  const {lessonId} = await params
  const lesson = lessonsById[lessonId]
  if (!lesson) return {}
  return {title: `${lesson.title} | ${lang === 'en' ? 'Wine Course' : 'Corso Vino'}`}
}

export default async function LessonPage({params}) {
  const [lang, resolvedParams] = await Promise.all([getServerLanguage(), params])
  const {levels, lessonsById} = await getWineCourseData(lang)
  const {levelId, lessonId} = resolvedParams
  const level = levels.find((l) => l.id === levelId)
  const lesson = lessonsById[lessonId]
  if (!level || !lesson) notFound()

  const currentIndex = level.lessonIds.indexOf(lessonId)
  const nextLessonId = currentIndex >= 0 ? (level.lessonIds[currentIndex + 1] ?? null) : null

  return <LessonClient level={level} lesson={lesson} nextLessonId={nextLessonId} levels={levels} />
}
