import {redirect} from 'next/navigation'
import {createServerSupabase} from '@/lib/supabaseServer'
import styles from './dashboard.module.scss'

export default async function Dashboard() {
  const supabase = await createServerSupabase()
  const {data} = await supabase.auth.getUser()

  if (!data.user) {
    redirect('/auth')
  }

  // Query per ottenere username dal profilo utente
  const {data: profile} = await supabase
    .from('profiles')
    .select('username')
    .eq('id', data.user.id)
    .single()

  // Query per ottenere i giochi dell'utente
  const {data: games} = await supabase
    .from('games')
    .select('id, name, status, created_at')
    .eq('created_by', data.user.id)
    .order('created_at', {ascending: false})

  return (
    <main className={styles.dashboard}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Benvenuto, {profile?.username || data.user.email}!</h1>
          <p className={styles.subtitle}>Gestisci i tuoi giochi</p>
        </div>

        <div className={styles.actionSection}>
          <a href="/game/create" className="btn primary">
            + Crea Nuovo Gioco
          </a>
          <a href="/game/create-quick" className="btn secondary">
            ⚡ Crea Gioco Veloce
          </a>
        </div>

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
                    <a href={`/game/${game.id}/live`} className="btn secondary">
                      Gioca Live
                    </a>
                    <a
                      href={`/game/${game.id}/print`}
                      className="btn secondary">
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
      </div>
    </main>
  )
}
