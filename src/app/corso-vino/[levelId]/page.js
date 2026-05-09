import {notFound} from 'next/navigation'
import levels from '@/data/wine-course/levels.json'
import {LESSONS} from '@/data/wine-course/lessonRegistry'
import LevelClient from './LevelClient'

export function generateStaticParams() {
  return levels.map((l) => ({levelId: l.id}))
}

export async function generateMetadata({params}) {
  const {levelId} = await params
  const level = levels.find((l) => l.id === levelId)
  if (!level) return {}
  return {title: `${level.title} | Corso di Vino`}
}

export default async function LevelPage({params}) {
  const {levelId} = await params
  const level = levels.find((l) => l.id === levelId)
  if (!level) notFound()

  const levelIndex = levels.findIndex((l) => l.id === levelId)
  const lessons = level.lessonIds.map((id) => LESSONS[id]).filter(Boolean)

  return <LevelClient level={level} levelIndex={levelIndex} levels={levels} lessons={lessons} />
}
