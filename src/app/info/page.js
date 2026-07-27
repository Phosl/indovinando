import InfoClient from './InfoClient'
import {getServerLanguage} from '@/lib/i18n/server'
import {buildPageMetadata} from '@/lib/seo'

export async function generateMetadata() {
  const lang = await getServerLanguage()

  return buildPageMetadata({
    title: lang === 'en' ? 'About the app' : 'Informazioni sull’app',
    description:
      lang === 'en'
        ? 'Learn what Indovinando is and how the platform supports blind wine tastings.'
        : 'Scopri cos’è Indovinando e come la piattaforma aiuta a creare e gestire degustazioni alla cieca.',
    path: '/info',
    lang,
  })
}

export default function InfoPage() {
  return <InfoClient />
}
