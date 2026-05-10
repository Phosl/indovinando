import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import {getServerLanguage} from '@/lib/i18n/server'
import {toLocaleTag} from '@/lib/i18n/config'
import it from '@/lib/i18n/locales/it.json'
import en from '@/lib/i18n/locales/en.json'
import styles from './dashboard.module.scss'

export default async function Dashboard() {
  const supabase = await createServerSupabase()
  const lang = await getServerLanguage()
  const locale = lang === 'en' ? en : it
  const dashboardDict = locale.dashboard || it.dashboard || {}
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.9.0'
  const {data} = await supabase.auth.getUser()

  if (!data.user) {
    redirect('/auth')
  }

  const {data: profile} = await supabase
    .from('profiles')
    .select('username, super_admin')
    .eq('id', data.user.id)
    .single()

  const {data: games} = await supabase
    .from('games')
    .select('id, name, status, created_at')
    .eq('created_by', data.user.id)
    .order('created_at', {ascending: false})

  return (
    <main className={styles.dashboard}>
      <div className={styles.container}>
        <section className={styles.arcadeHero}>
          <h1>INDOVINANDO</h1>
          <h4>
            {dashboardDict.versionLabel || 'Versione BETA'} {appVersion}
          </h4>
          <p>
            {dashboardDict.welcome || 'Benvenuto'}, {profile?.username || data.user.email}!
          </p>
          <div className={styles.heroActions}>
            <a href="/game/create-quick" className="btn primary">
              {dashboardDict.createQuickGame || '⚡ Crea gioco rapido'}
            </a>
            <a href="/game/create" className="btn accent">
              {dashboardDict.createGame || '+ Crea gioco'}
            </a>
            <a href="/profilo" className="btn secondary">
              {dashboardDict.profile || '👤 Profilo'}
            </a>
            {profile?.super_admin && (
              <a href="/admin/corsi" className="btn secondary">
                {dashboardDict.admin || '⚙️ Admin'}
              </a>
            )}
          </div>
        </section>

        {/* Wine Course banner */}
        <a href="/corso-vino" className={styles.corsoCard}>
          <span className={styles.corsoEmoji}>🍷</span>
          <div className={styles.corsoInfo}>
            <span className={styles.corsoLabel}>{dashboardDict.newLabel || 'Novita'}</span>
            <strong className={styles.corsoTitle}>
              {dashboardDict.wineCourse || 'Corso Vino'}
            </strong>
            <span className={styles.corsoDesc}>
              {dashboardDict.wineCourseDesc || 'Impara il vino passo dopo passo · gratis 🎓'}
            </span>
          </div>
          <span className={styles.corsoArrow}>→</span>
        </a>

        {games && games.length > 0 ? (
          <div className={styles.gamesSection}>
            <h2>
              {dashboardDict.yourGames || 'I tuoi giochi'} ({games.length})
            </h2>
            <div className={styles.gamesList}>
              {games.map((game) => (
                <div key={game.id} className={styles.gameCard}>
                  <h3>{game.name}</h3>
                  <p className={styles.statusRow}>
                    {dashboardDict.status || 'Stato'}:{' '}
                    <span
                      className={`${styles.statusBadge} ${game.status === 'published' ? styles.published : styles.draft}`}>
                      {game.status === 'published'
                        ? dashboardDict.published || 'Pubblicato'
                        : dashboardDict.draft || 'Bozza'}
                    </span>
                  </p>
                  <p className={styles.date}>
                    {dashboardDict.created || 'Creato il'}:{' '}
                    {new Date(game.created_at).toLocaleDateString(toLocaleTag(lang))}
                  </p>
                  <div className={styles.gameActions}>
                    <a href={`/game/${game.id}`} className="btn primary">
                      {dashboardDict.view || 'Apri'}
                    </a>
                    <a href={`/game/${game.id}/live`} className={styles.liveAction}>
                      {dashboardDict.playLive || 'Gioca Live'}
                    </a>
                    {game.status === 'published' && (
                      <a href={`/enoteca/${game.id}`} className={styles.enotecaAction}>
                        {dashboardDict.enoteca || '🍷 Enoteca'}
                      </a>
                    )}
                    <a href={`/game/${game.id}/print`} className="btn secondary">
                      {dashboardDict.printCard || 'Stampa scheda'}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>{dashboardDict.emptyState || 'Non hai ancora creato giochi. Inizia ora!'}</p>
          </div>
        )}
      </div>
    </main>
  )
}
