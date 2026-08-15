import InfoClient from './InfoClient'
import {getServerLanguage} from '@/lib/i18n/server'
import {buildPageMetadata} from '@/lib/seo'

export async function generateMetadata() {
  const lang = await getServerLanguage()

  return buildPageMetadata({
    title: lang === 'en' ? 'App guide' : 'Guida all’app',
    description:
      lang === 'en'
        ? 'The complete Indovinando guide: video, blind tastings, game modes, AI credits, wine course, and business solutions.'
        : 'La guida completa a Indovinando: video, degustazioni alla cieca, modalità di gioco, crediti AI, corso vino e soluzioni business.',
    path: '/info',
    lang,
  })
}

export default function InfoPage() {
  return <InfoClient />
}
