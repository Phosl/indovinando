import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import styles from './dashboard.module.scss'

export default async function Dashboard() {
  const supabase = await createServerSupabase()
  const {data} = await supabase.auth.getUser()

  if (!data.user) {
    redirect('/auth')
  }

  const {data: profile} = await supabase
    .from('profiles')
    .select('username')
    .eq('id', data.user.id)
    .single()

  const [{data: games}, {data: enotecaMenus}] = await Promise.all([
    supabase
      .from('games')
      .select('id, name, status, created_at')
      .eq('created_by', data.user.id)
      .order('created_at', {ascending: false}),
    supabase
      .from('enoteca_menus')
      .select('id, name, is_published, created_at')
      .eq('user_id', data.user.id)
      .order('created_at', {ascending: false}),
  ])

  return (
    <main className={styles.dashboard}>
      <div className={styles.container}>
        <section className={styles.arcadeHero}>
          <h1>INDOVINANDO</h1>
          <p>Benvenuto, {profile?.username || data.user.email}!</p>
          <div className={styles.heroActions}>
            <a href="/game/create-quick" className="btn primary">
              ⚡ Crea Gioco Veloce
            </a>
            <a href="/game/create" className="btn accent">
              + Crea Gioco
            </a>
            <a href="/enoteca/manage/create" className={styles.enotecaAction}>
              🍷 Nuovo Menu Enoteca
            </a>
          </div>
        </section>

        {games && games.length > 0 ? (
          <div className={styles.gamesSection}>
            <h2>I tuoi giochi ({games.length})</h2>
            <div className={styles.gamesList}>
              {games.map((game) => (
                <div key={game.id} className={styles.gameCard}>
                  <h3>{game.name}</h3>
                  <p className={styles.statusRow}>
                    Stato:{' '}
                    <span
                      className={`${styles.statusBadge} ${game.status === 'published' ? styles.published : styles.draft}`}>
                      {game.status === 'published' ? 'Pubblicato' : 'Bozza'}
                    </span>
                  </p>
                  <p className={styles.date}>
                    Creato: {new Date(game.created_at).toLocaleDateString('it-IT')}
                  </p>
                  <div className={styles.gameActions}>
                    <a href={`/game/${game.id}`} className="btn primary">
                      Visualizza
                    </a>
                    <a href={`/game/${game.id}/live`} className={styles.liveAction}>
                      Gioca Live
                    </a>
                    <a href={`/game/${game.id}/print`} className="btn secondary">
                      Stampa Scheda
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>Non hai ancora creato giochi. Inizia ora!</p>
          </div>
        )}

        {/* ── Enoteca menus section ── */}
        <div className={styles.gamesSection}>
          <h2>🍷 I tuoi menu enoteca ({enotecaMenus?.length ?? 0})</h2>
          {enotecaMenus && enotecaMenus.length > 0 ? (
            <div className={styles.gamesList}>
              {enotecaMenus.map((menu) => (
                <div key={menu.id} className={styles.gameCard}>
                  <h3>{menu.name}</h3>
                  <p className={styles.statusRow}>
                    Stato:{' '}
                    <span
                      className={`${styles.statusBadge} ${menu.is_published ? styles.published : styles.draft}`}>
                      {menu.is_published ? 'Pubblicato' : 'Bozza'}
                    </span>
                  </p>
                  <p className={styles.date}>
                    Creato: {new Date(menu.created_at).toLocaleDateString('it-IT')}
                  </p>
                  <div className={styles.gameActions}>
                    <a href={`/enoteca/manage/${menu.id}`} className="btn primary">
                      Modifica
                    </a>
                    {menu.is_published && (
                      <a href={`/enoteca/${menu.id}`} className={styles.liveAction} target="_blank" rel="noopener noreferrer">
                        🍷 Link giocatori
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>Nessun menu ancora. <a href="/enoteca/manage/create">Crea il tuo primo menu enoteca</a>!</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
