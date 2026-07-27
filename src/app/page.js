import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {buildPageMetadata} from '@/lib/seo'
import LandingPage from '@/components/landing/LandingPage'

export async function generateMetadata() {
  const lang = await getServerLanguage()
  const isEn = lang === 'en'

  return buildPageMetadata({
    title: isEn
      ? 'Create and organize blind wine tastings'
      : 'Crea e organizza degustazioni alla cieca',
    description: isEn
      ? 'Prepare the quiz, invite participants with a QR code, run the blind wine tasting, and collect leaderboards and real wine ratings.'
      : 'Prepara il quiz, invita i partecipanti con un QR, gestisci la degustazione alla cieca e raccogli classifiche e valutazioni reali sui vini.',
    path: '/',
    lang,
  })
}

export default async function Home() {
  const supabase = await createServerSupabase()
  const {data} = await supabase.auth.getUser()

  if (data.user) {
    redirect('/dashboard')
  }

  return <LandingPage />
}
