import CourseClient from './CourseClient'
import {getWineCourseData} from '@/lib/wineCourseContent'
import {getServerLanguage} from '@/lib/i18n/server'
import {createServerSupabase} from '@/lib/supabaseServer'

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
  const lang = await getServerLanguage()
  const {levels} = await getWineCourseData(lang)

  const {data} = await supabase.auth.getUser()
  let isAdmin = false
  if (data?.user) {
    const {data: profile} = await supabase
      .from('profiles')
      .select('super_admin')
      .eq('id', data.user.id)
      .single()
    isAdmin = profile?.super_admin === true
  }

  return <CourseClient levels={levels} isAdmin={isAdmin} />
}
