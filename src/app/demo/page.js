import DemoGameClient from './DemoGameClient'
import {getServerLanguage} from '@/lib/i18n/server'
import {buildPageMetadata} from '@/lib/seo'

export async function generateMetadata() {
  const lang = await getServerLanguage()

  return buildPageMetadata({
    title: lang === 'en' ? 'Blind wine tasting demo' : 'Demo degustazione alla cieca',
    description:
      lang === 'en'
        ? 'Play a free blind wine tasting demo with six questions, five simulated opponents, sounds, and a live leaderboard.'
        : 'Prova gratis una degustazione alla cieca con sei domande, cinque avversari simulati, suoni e classifica in tempo reale.',
    path: '/demo',
    lang,
  })
}

export default function DemoPage() {
  return <DemoGameClient />
}
