import {notFound} from 'next/navigation'
import LevelClient from './LevelClient'
import {getWineCourseData} from '@/lib/wineCourseContent'
import {getServerLanguage} from '@/lib/i18n/server'

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
  if (!level) return {}
  return {title: `${level.title} | ${lang === 'en' ? 'Wine Course' : 'Corso Vino'}`}
}

export default async function LevelPage({params}) {
  const [lang, resolvedParams] = await Promise.all([getServerLanguage(), params])
  const {levels, lessonsById} = await getWineCourseData(lang)
  const {levelId} = resolvedParams
  const level = levels.find((l) => l.id === levelId)
  if (!level) notFound()

  const levelIndex = levels.findIndex((l) => l.id === levelId)
  const lessons = level.lessonIds.map((id) => lessonsById[id]).filter(Boolean)

  return <LevelClient level={level} levelIndex={levelIndex} levels={levels} lessons={lessons} />
}
