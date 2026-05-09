import styles from './changelog.module.scss'

export const metadata = {
  title: 'Changelog — Indovinando',
  description: 'Cronologia degli aggiornamenti e delle versioni di Indovinando',
}

const CHANGELOG = [
  {
    version: '1.5.0',
    date: '9 maggio 2026',
    label: 'Performance & UX',
    changes: [
      'React.memo su tutti i componenti presentazionali per ridurre i re-render',
      "Classifica nell'overlay aggiornata ogni 3 secondi mentre è aperta",
      'Supporto tasto Invio per Controlla e Continua da tastiera',
      'Ottimizzazioni CSS mobile: touch-action, overscroll-behavior, will-change, -webkit-tap-highlight-color',
      'Pagina classifica finale mobile-first (max 640px, podio a colonna singola su small screen)',
      'Pulsante "Torna alla Dashboard" sempre full-width su mobile',
      'Miglioramento logging errori su useRoundPlay (ora mostra il messaggio reale)',
    ],
  },
  {
    version: '1.4.0',
    date: '8 maggio 2026',
    label: 'Risultati e Classifica Live',
    changes: [
      'Sezione "🏆 Classifica Live" nei risultati bottiglia con proiezione punteggi e badge +N verde',
      "Fix double-count: snapshot dei punteggi congelato all'apertura di ogni bottiglia",
      'Badge "tu" inline viola per il giocatore corrente nella classifica',
      'Riga risposta con colore di sfondo e bordo sinistro colorato (verde corretto, rosso errato)',
      'Punti visualizzati come pill verde (+25 🔥 se combo)',
      'Unico pulsante "Vedi classifica" sull\'ultima bottiglia (rimosso "Concludi")',
      'Host sempre reindirizzato alla classifica anche in caso di errore nel sync',
    ],
  },
  {
    version: '1.3.0',
    date: '7 maggio 2026',
    label: 'Multiplayer — Funzionalità sociali',
    changes: [
      'Indicatore di progresso: "X/N giocatori pronti..." nella schermata risultati',
      "Kick player: l'host può rimuovere un giocatore dalla partita dal pannello classifica",
      'Auto-reconnect: il giocatore che rientra viene reindirizzato direttamente al gioco se già in sessione',
      'Pulizia automatica sessioni terminate da più di 24 ore',
      'Polling fallback live_sessions ogni 3s nel client (copertura se Realtime non è attivo)',
    ],
  },
  {
    version: '1.2.0',
    date: '6 maggio 2026',
    label: 'Stabilità Realtime',
    changes: [
      'Fix blocco su "Attendi che tutti i giocatori finiscano": live_sessions aggiunta alla pubblicazione Realtime',
      'Polling ogni 2s sulle risposte mentre si aspetta il completamento del round',
      'Re-fetch risposte dal DB su ogni INSERT (evita lo strip delle righe altrui via RLS)',
      'Channel Realtime stabili: nessun re-subscribe inutile tra i render',
    ],
  },
  {
    version: '1.1.0',
    date: '5 maggio 2026',
    label: 'Gameplay & UX',
    changes: [
      'Sistema combo: risposte consecutive corrette danno +5/+10/+15 punti bonus',
      'Toast animato 🔥💥⚡️🤯 alla conquista di un combo',
      'Reveal bottiglia alla fine del round (nome, produttore, annata)',
      'Riepilogo risposte per domanda con esito corretto/errato',
      "Schermata di transizione con coriandoli tra una bottiglia e l'altra",
      'Sheet di uscita con modal di conferma',
      'Suoni audio: risposta corretta, errata, bottiglia completata (toggle ON/OFF)',
    ],
  },
  {
    version: '1.0.0',
    date: '4 maggio 2026',
    label: 'Launch',
    changes: [
      'Editor giochi: crea partite con bottiglie, domande a scelta multipla e risposte corrette',
      'Sessioni live multiplayer con Supabase Realtime',
      'Schermata quiz mobile-first con animazioni slide tra le domande',
      'Classifica in tempo reale accessibile durante la partita',
      'Classifica finale con podio 🥇🥈🥉 alla fine della sessione',
      'Foglio di stampa per condivisione fisica delle domande',
      'Dashboard host con lista partite e gestione sessioni',
      'Autenticazione utente (Supabase Auth)',
      'Skeleton loading su tutte le route data-fetching',
    ],
  },
]

const LABEL_COLORS = {
  'Performance & UX': '#6b2f8e',
  'Risultati e Classifica Live': '#2563eb',
  'Multiplayer — Funzionalità sociali': '#d97706',
  'Stabilità Realtime': '#dc2626',
  'Gameplay & UX': '#16a34a',
  Launch: '#374151',
}

export default function ChangelogPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>📋 Changelog</h1>
          <p className={styles.subtitle}>Cronologia degli aggiornamenti di Indovinando</p>
        </div>

        <div className={styles.timeline}>
          {CHANGELOG.map((entry) => (
            <div key={entry.version} className={styles.entry}>
              <div className={styles.entryMeta}>
                <span className={styles.version}>v{entry.version}</span>
                <span className={styles.date}>{entry.date}</span>
              </div>
              <div className={styles.entryBody}>
                <div className={styles.entryHeader}>
                  <span
                    className={styles.label}
                    style={{background: LABEL_COLORS[entry.label] ?? '#374151'}}>
                    {entry.label}
                  </span>
                </div>
                <ul className={styles.changeList}>
                  {entry.changes.map((change, i) => (
                    <li key={i} className={styles.changeItem}>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
