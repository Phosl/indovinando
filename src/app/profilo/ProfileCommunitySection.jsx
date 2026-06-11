import {getServerLanguage} from '@/lib/i18n/server'
import {getPublicRankingsSnapshot} from '@/lib/publicRankings'
import {createServerSupabase} from '@/lib/supabaseServer'
import CommunityHighlightsCard from '@/components/community/CommunityHighlightsCard'

export default async function ProfileCommunitySection() {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const snapshot = await getPublicRankingsSnapshot(supabase)
  const locale =
    lang === 'en'
      ? (await import('@/lib/i18n/locales/en.json')).default
      : (await import('@/lib/i18n/locales/it.json')).default
  const text = locale.profile?.communityWidget || {}

  return (
    <CommunityHighlightsCard
      snapshot={snapshot}
      text={text}
      ctaHref="/classifiche?back=%2Fprofilo"
    />
  )
}
