import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {toLocaleTag} from '@/lib/i18n/config'
import styles from './storico.module.scss'
import it from '@/lib/i18n/locales/it.json'
import en from '@/lib/i18n/locales/en.json'

export const metadata = {title: 'Storico Partite'}

const APPLE_AVATARS = ['👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀', '🧑‍🍳', '👨‍⚕️']

export default async function StoricoPage() {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const locale = lang === 'en' ? en : it
  const t = locale.dashboard?.storico || it.dashboard.storico

  const {data: {user}} = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const {data: sessions} = await supabase
    .from('live_session_results')
    .select('id, game_name, played_at, player_count, players')
    .eq('host_user_id', user.id)
    .order('played_at', {ascending: false})
    .limit(50)

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <a href="/dashboard" className={styles.back}>← {locale.common?.back || 'Indietro'}</a>
          <h1>{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
        </div>

        {!sessions?.length ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🎭</span>
            <p>{t.empty}</p>
          </div>
        ) : (
          <div className={styles.list}>
            {sessions.map((s) => {
              const winner = s.players?.[0]
              const played = new Date(s.played_at)
              return (
                <div key={s.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.gameName}>{s.game_name}</h3>
                      <span className={styles.date}>
                        {played.toLocaleDateString(toLocaleTag(lang), {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                        {' · '}
                        {played.toLocaleTimeString(toLocaleTag(lang), {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <span className={styles.playerCount}>
                      👥 {s.player_count} {s.player_count === 1 ? t.player : t.players}
                    </span>
                  </div>

                  {s.players?.length > 0 && (
                    <div className={styles.podium}>
                      {s.players.slice(0, 3).map((p, idx) => (
                        <div key={p.id} className={`${styles.podiumItem} ${styles[`rank${idx + 1}`]}`}>
                          <span className={styles.medal}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                          </span>
                          <span className={styles.avatar}>
                            {APPLE_AVATARS[p.avatar_id - 1] || '👤'}
                          </span>
                          <span className={styles.nickname}>{p.nickname}</span>
                          <span className={styles.score}>{p.total_score} {t.points}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {s.players?.length > 3 && (
                    <details className={styles.moreDetails}>
                      <summary className={styles.moreSummary}>
                        {t.showAll} ({s.players.length})
                      </summary>
                      <div className={styles.fullList}>
                        {s.players.map((p, idx) => (
                          <div key={p.id} className={styles.fullRow}>
                            <span className={styles.fullRank}>#{idx + 1}</span>
                            <span className={styles.fullAvatar}>
                              {APPLE_AVATARS[p.avatar_id - 1] || '👤'}
                            </span>
                            <span className={styles.fullNickname}>{p.nickname}</span>
                            <span className={styles.fullScore}>{p.total_score} {t.points}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
