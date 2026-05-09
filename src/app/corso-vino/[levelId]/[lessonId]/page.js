import {notFound} from 'next/navigation'
import levels from '@/data/wine-course/levels.json'
import {LESSONS} from '@/data/wine-course/lessonRegistry'
import LessonClient from './LessonClient'

export function generateStaticParams() {
  return levels.flatMap((l) => l.lessonIds.map((lessonId) => ({levelId: l.id, lessonId})))
}

export async function generateMetadata({params}) {
  const {lessonId} = await params
  const lesson = LESSONS[lessonId]
  if (!lesson) return {}
  return {title: `${lesson.title} | Corso di Vino`}
}

export default async function LessonPage({params}) {
  const {levelId, lessonId} = await params
  const level = levels.find((l) => l.id === levelId)
  const lesson = LESSONS[lessonId]
  if (!level || !lesson) notFound()

  return <LessonClient level={level} lesson={lesson} />
}
