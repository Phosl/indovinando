import {notFound, redirect} from 'next/navigation'
import LevelClient from './LevelClient'
import {getWineCourseData} from '@/lib/wineCourseContent'
import {getServerLanguage} from '@/lib/i18n/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {canAccessLevel, getAuthRedirectPath} from '@/lib/courseAccess'

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

  return <LevelClient level={level} levelIndex={levelIndex} levels={levels} lessons={lessons} />
}
