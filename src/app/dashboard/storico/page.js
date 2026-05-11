import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import TopBarBack from '@/components/TopBarBack'
import StoricoClient from './StoricoClient'
import styles from './storico.module.scss'
import it from '@/lib/i18n/locales/it.json'
import en from '@/lib/i18n/locales/en.json'

export const metadata = {title: 'Storico Partite'}

export default async function StoricoPage() {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const locale = lang === 'en' ? en : it
  const t = locale.dashboard?.storico || it.dashboard.storico

  const {
    data: {user},
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const {data: sessions} = await supabase
    .from('live_session_results')
    .select('id, game_name, played_at, player_count, players')
    .eq('host_user_id', user.id)
    .order('played_at', {ascending: false})
    .limit(100)

  return (
    <main className={styles.page}>
      <TopBarBack title={t.title} href="/dashboard" />
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.subtitle}>{t.subtitle}</p>
        </div>
        <StoricoClient sessions={sessions || []} t={t} lang={lang} />
      </div>
    </main>
  )
}
