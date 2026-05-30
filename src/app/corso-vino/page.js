import CourseClient from './CourseClient'
import {getWineCourseData} from '@/lib/wineCourseContent'
import {getServerLanguage} from '@/lib/i18n/server'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getCourseViewerState} from '@/lib/courseAccess'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata() {
  const lang = await getServerLanguage()
  return {
    title: lang === 'en' ? 'Wine Course | Indovinando' : 'Corso Vino | Indovinando',
    description:
      lang === 'en'
        ? 'Learn wine step by step with interactive Duolingo-style lessons.'
        : 'Impara il vino passo dopo passo con lezioni interattive stile Duolingo.',
  }
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

  return <CourseClient levels={levels} isAdmin={isAdmin} viewer={viewer} lang={lang} />
}
