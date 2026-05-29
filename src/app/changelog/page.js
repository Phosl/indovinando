import styles from './changelog.module.scss'
import TopBarBack from '@/components/TopBarBack'
import {getServerLanguage} from '@/lib/i18n/server'

export async function generateMetadata() {
  const lang = await getServerLanguage()
  const isEn = lang === 'en'

  return {
    title: isEn ? 'Changelog — Indovinando' : 'Changelog — Indovinando',
    description: isEn
      ? 'History of Indovinando updates and versions.'
      : 'Cronologia degli aggiornamenti e delle versioni di Indovinando',
  }
}

const UI_TEXT = {
  it: {
    title: '📋 Changelog',
    subtitle: 'Cronologia degli aggiornamenti di Indovinando',
    autoLabel: 'Auto',
  },
  en: {
    title: '📋 Changelog',
    subtitle: 'History of Indovinando updates',
    autoLabel: 'Auto',
  },
}

const CHANGELOG = [
  {
    version: '1.24.1',
    date: '29 maggio 2026',
    label: 'Auto',
    changes: [
      'ui(modals): fullscreen per aggiungi domanda/bottiglia con footer fisso e navigazione semplificata (freccia back + CTA primaria)',
    ],
  },

  {
    version: '1.24.0',
    date: '29 maggio 2026',
    label: 'Auto',
    changes: [
      'sposta storico partite su pagina dedicata con card migliorate, avatar game e filtri a pill per nome partita',
    ],
  },

  {
    version: '1.23.4',
    date: '29 maggio 2026',
    label: 'Auto',
    changes: [
      'restyle my games and create mode card',
    ],
  },

  {
    version: '1.23.3',
    date: '28 maggio 2026',
    label: 'Auto',
    changes: [
      'fixing style',
    ],
  },

  {
    version: '1.23.2',
    date: '16 maggio 2026',
    label: 'Auto',
    changes: [
      'fix question list',
    ],
  },

  {
    version: '1.23.1',
    date: '16 maggio 2026',
    label: 'Auto',
    changes: [
      'migliora stile card domande, visualizzazione opzioni e pulizia codice',
    ],
  },

  {
    version: '1.23.0',
    date: '16 maggio 2026',
    label: 'Auto',
    changes: [
      'modale info questionario con animazione, icona help, preferenza non mostrare più e riapertura manuale',
    ],
  },

  {
    version: '1.22.1',
    date: '16 maggio 2026',
    label: 'Auto',
    changes: [
      'improve guide copy, reset create-game step state, and anchor topbar lesson progress',
    ],
  },

  {
    version: '1.22.0',
    date: '16 maggio 2026',
    label: 'Auto',
    changes: [
      'improve profile options layout and bottle creation flow',
    ],
  },

  {
    version: '1.21.2',
    date: '15 maggio 2026',
    label: 'Auto',
    changes: [
      'start game editor wizard from step 1 for all modes',
    ],
  },

  {
    version: '1.21.1',
    date: '15 maggio 2026',
    label: 'Auto',
    changes: [
      'eliminate step 1 flash on quick-create and edit mode by initializing step state eagerly',
    ],
  },

  {
    version: '1.21.0',
    date: '15 maggio 2026',
    label: 'Auto',
    changes: [
      'add language switcher to home page under changelog, verify translations complete (296 keys both IT/EN)',
    ],
  },

  {
    version: '1.20.1',
    date: '14 maggio 2026',
    label: 'Auto',
    changes: [
      'reduce click latency and smooth internal navigation',
    ],
  },

  {
    version: '1.20.0',
    date: '14 maggio 2026',
    label: 'Auto',
    changes: [
      'smooth create-game navigation and wizard transitions',
    ],
  },

  {
    version: '1.19.0',
    date: '14 maggio 2026',
    label: 'Auto',
    changes: [
      'improve route transitions and fix lesson back navigation',
    ],
  },

  {
    version: '1.18.8',
    date: '14 maggio 2026',
    label: 'Auto',
    changes: [
      'move  illustator file',
    ],
  },

  {
    version: '1.18.7',
    date: '14 maggio 2026',
    label: 'Auto',
    changes: [
      'app icon',
    ],
  },

  {
    version: '1.18.6',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'memoize click handlers for mobile UX fluidity',
    ],
  },

  {
    version: '1.18.5',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'memoize onClick handlers in CourseClient and ProfileClient to reduce render cascades',
    ],
  },

  {
    version: '1.18.4',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'install CTA login con bottom sheet e harden PWA head/manifest',
    ],
  },

  {
    version: '1.18.3',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'fix icon',
    ],
  },

  {
    version: '1.18.2',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'new app icon',
    ],
  },

  {
    version: '1.18.1',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'corso pallini con stato lezione (verde/arancione/grigio)',
    ],
  },

  {
    version: '1.18.0',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'aggiungi tasto condividi per installazione da home',
    ],
  },

  {
    version: '1.17.8',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'ripristina splash/meta iOS nel head renderizzato',
    ],
  },

  {
    version: '1.17.7',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'tab slider scrollabile e animazioni domande ripristinate',
    ],
  },

  {
    version: '1.17.6',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'revert(enoteca): annulla fix slider domande nella card',
    ],
  },

  {
    version: '1.17.5',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'contiene slider domande dentro la card su mobile',
    ],
  },

  {
    version: '1.17.4',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'renderizza tutti i link splash iOS nel head del RootLayout',
    ],
  },

  {
    version: '1.17.3',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'aggiungi fallback splash iOS per iPhone mini/zoom e dpr3',
    ],
  },

  {
    version: '1.17.2',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'configura startup image iPhone 12 via metadata layout',
    ],
  },

  {
    version: '1.17.1',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'aggiorna ICEBUCKET con idee offline future',
    ],
  },

  {
    version: '1.17.0',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'pre-cacha tutti i JSON dei corsi all\'installazione del SW',
    ],
  },

  {
    version: '1.16.3',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'offline page con link a corso vino, SW cacha pagine corso già visitate',
    ],
  },

  {
    version: '1.16.2',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'auto-reload pagina offline quando torna la rete',
    ],
  },

  {
    version: '1.16.1',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'aggiornamenti sw.js, offline.html e ICEBUCKET',
    ],
  },

  {
    version: '1.16.0',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'offline minimale + pagina offline + ICEBUCKET.md con migliorie future',
    ],
  },

  {
    version: '1.15.0',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'aggiunte vibrazioni haptic per risposta corretta/errata/combo in tutti i giochi',
    ],
  },

  {
    version: '1.14.2',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'aggiorna manifest icons e layout metadata per favicon/apple-touch-icon corretti',
    ],
  },

  {
    version: '1.14.1',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'favicon e app icon ora servite solo da /app_icon, head aggiornata per compatibilità',
    ],
  },

  {
    version: '1.14.0',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'aggiunti splash screen Apple automatici e favicon, migliorata gestione head',
    ],
  },

  {
    version: '1.13.30',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'Add enoteca leaderboard and PWA install entrypoint',
    ],
  },

  {
    version: '1.13.29',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'Refactor live and enoteca share details UI',
    ],
  },

  {
    version: '1.13.28',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'Update docs and fix live avatar rendering',
    ],
  },

  {
    version: '1.13.27',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'Polish course/live UI and fix SVG avatar selection',
    ],
  },

  {
    version: '1.13.26',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'Polish sharing QR flows, copyright page, and wine course progress UI',
    ],
  },

  {
    version: '1.13.25',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'Improve host invite share actions layout',
    ],
  },

  {
    version: '1.13.24',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'Polish Enoteca/live sharing flows and navigation',
    ],
  },

  {
    version: '1.13.23',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: [
      'fix back button no logged user',
    ],
  },

  {
    version: '1.13.22',
    date: '13 maggio 2026',
    label: 'Auto',
    changes: ['Refine course UX, guest navigation, and loading skeletons'],
  },

  {
    version: '1.13.21',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['Polish course progress and lesson flow'],
  },

  {
    version: '1.13.20',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['Auth mascot for password reset and improve avatar mapping'],
  },

  {
    version: '1.13.19',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['Format live session avatar helper'],
  },

  {
    version: '1.13.18',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['Fix live avatar constraint for SVG avatars'],
  },

  {
    version: '1.13.17',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['Fix host avatar persistence in live session start'],
  },

  {
    version: '1.13.16',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['Fix storico filters and spacing'],
  },

  {
    version: '1.13.15',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: [
      'UI/UX: corso mascotte, auth exit button, password reset copy, loading and form polish',
    ],
  },

  {
    version: '1.13.14',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: [
      'UX: homepage card buttons, forgot password, guest mode fix, InfoModal, ScrollToTop, BottleAnswersSelector redesign, auth form restyle',
    ],
  },

  {
    version: '1.13.13',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['UI polish: skeleton loading, fix deploy imports, fix corso vino level loading'],
  },

  {
    version: '1.13.12',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['force-add PageLayout.module.css (was ignored by gitignore)'],
  },

  {
    version: '1.13.11',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['page layout problem'],
  },

  {
    version: '1.13.10',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['fix css import'],
  },

  {
    version: '1.13.9',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['Update GameCreateClient.jsx'],
  },

  {
    version: '1.13.8',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['fix style'],
  },

  {
    version: '1.13.7',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['add button variant'],
  },

  {
    version: '1.13.6',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['fix enoteca header'],
  },

  {
    version: '1.13.5',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: [
      'fix top bar padding',
      'UI polish: dashboard gradients bottom, miei giochi tabs pill, game card bigger name + uniform buttons, avatar picker row, SVG avatar fixes, corso vino badges, leaderboard/TopBar avatar unification, bugfixes',
    ],
  },

  {
    version: '1.13.4',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['UX: step scelta tipo gioco in /game/create + miglioramento grafico wizard'],
  },

  {
    version: '1.13.3',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: ['UX: skeleton loading su live session lobby e classifica live'],
  },

  {
    version: '1.13.2',
    date: '12 maggio 2026',
    label: 'Auto',
    changes: [
      'host allPlayersCompleted gate + remove last supabaseClient calls from useRoundPlay',
      'route all live_round_answers DB ops through server routes',
      'remove dead HostLiveClient (/host route never used)',
      'guest last-bottle UX + remove dead roundAnchorAt state',
      'remove roundAnchorAt filter from handleAnswerInsert to fix end-game deadlock',
      'fixed',
    ],
  },

  {
    version: '1.13.1',
    date: '11 maggio 2026',
    label: 'Auto',
    changes: ['enoteca hanging on load for authenticated users + doc update'],
  },

  {
    version: '1.13.0',
    date: '11 maggio 2026',
    label: 'Auto',
    changes: ['storico - filtro per gioco con pills'],
  },

  {
    version: '1.12.0',
    date: '11 maggio 2026',
    label: 'Auto',
    changes: ['TopBar in storico e changelog'],
  },

  {
    version: '1.11.0',
    date: '11 maggio 2026',
    label: 'Auto',
    changes: ['storico partite live - snapshot, pagina /dashboard/storico'],
  },

  {
    version: '1.10.9',
    date: '11 maggio 2026',
    label: 'Auto',
    changes: ['live session - classifica overlay, t shadow, standings API'],
  },

  {
    version: '1.10.8',
    date: '11 maggio 2026',
    label: 'Auto',
    changes: ['i18n: deep copy cleanup and full IT/EN text optimization'],
  },

  {
    version: '1.10.7',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['rimossi i tentativi sperimentali sul check host e sulla latenza'],
  },

  {
    version: '1.10.6',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['precaricate le opzioni corrette host per ridurre la latenza al check'],
  },

  {
    version: '1.10.5',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['evitato il blocco del check host nello stato "checking"'],
  },

  {
    version: '1.10.4',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['mantenuto il check host attivo con fallback runtime'],
  },

  {
    version: '1.10.3',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: [
      'semplificato il percorso check host rimuovendo wrapper timeout e fallback API non necessari',
    ],
  },

  {
    version: '1.10.2',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['formattazione automatica changelog'],
  },

  {
    version: '1.10.1',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['stabilizzato il flusso di avvio e caricamento in Enoteca'],
  },

  {
    version: '1.10.0',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ["uniformata la versione dell'app tra home e changelog"],
  },

  {
    version: '1.9.2',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['complete i18n dictionary migration and logout cleanup'],
  },

  {
    version: '1.9.1',
    date: '10 maggio 2026',
    label: 'i18n & Session',
    changes: [
      'Rimossi i flag isEn/isEnglish dal runtime app in favore di dizionari centralizzati',
      'Migrazione testi live/corso/dashboard verso useT o pickLangText con nuove chiavi locale',
      'Logout rinforzato: pulizia storage/cookie/cache/IndexedDB e redirect alla home',
      'Refactor wineCourseContent con fallback localizzati da dizionario (it/en)',
    ],
  },

  {
    version: '1.9.0',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: [
      'Live UX fixes, i18n/dashboard updates, and changelog note for host check latency',
      'course admin editor with Supabase Storage backend',
    ],
  },

  {
    version: '1.8.1',
    date: '10 maggio 2026',
    label: 'Live UX',
    changes: [
      'Fix gating classifica finale: il pulsante resta disabilitato finché non hanno completato tutti i partecipanti del round corrente',
      'Migliorata UX transizione verso classifica finale',
      "Nota aperta: la velocità di feedback del pulsante 'Check' per host non è ancora pienamente risolta",
    ],
  },

  {
    version: '1.8.0',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['fix live session creation and game save timeout blocking'],
  },

  {
    version: '1.7.1',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['format changelog automation script'],
  },

  {
    version: '1.7.0',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['improve all wine course lessons and answer balance'],
  },

  {
    version: '1.6.2',
    date: '10 maggio 2026',
    label: 'Auto',
    changes: ['automate changelog update on pre-push'],
  },

  {
    version: '1.6.0',
    date: '10 maggio 2026',
    label: 'UX & Mobile',
    changes: [
      'Homepage semplificata: 3 pulsanti (Accedi/Registrati, Corso Vino, Come funziona) in colonna',
      'Pagina /auth dedicata per il form di login e registrazione (rimossa dalla homepage)',
      'Modale ospite nel Corso Vino al posto del banner inline',
      'Fix skeleton loading su mobile: nessun elemento esce fuori dai box (maxWidth: 100%)',
      'Fix key prop mancante nei card skeleton della dashboard',
      'Pulsante Changelog aggiunto nel profilo utente',
      'Fix header profilo su mobile: pulsanti Indietro e Logout affiancati orizzontalmente',
    ],
  },
  {
    version: '1.5.1',
    date: '9 maggio 2026',
    label: 'Corso Vino UX',
    changes: [
      'Schermata risultato lezione semplificata: mantenuto un solo pulsante principale in basso',
      'Aggiunto nel top header il pulsante "Tutte le lezioni" / "All lessons"',
      'Rimosso il pulsante "Ripeti lezione" dalla schermata finale della lezione',
      'Elenco lezioni livello: aumentata la visibilità delle lezioni completate con badge "Ripeti/Repeat" e contrasto migliorato',
    ],
  },
  {
    version: '1.5.0',
    date: '9 maggio 2026',
    label: 'Performance & UX',
    changes: [
      'React.memo su tutti i componenti presentazionali per ridurre i re-render',
      "Leaderboard nell'overlay aggiornata ogni 3 secondi mentre è aperta",
      'Supporto tasto Invio per Check e Continue da tastiera',
      'Ottimizzazioni CSS mobile: touch-action, overscroll-behavior, will-change, -webkit-tap-highlight-color',
      'Pagina classifica finale mobile-first (max 640px, podio a colonna singola su small screen)',
      'Pulsante "Torna alla Dashboard" sempre full-width su mobile',
      'Miglioramento logging errori su useRoundPlay (ora mostra il messaggio reale)',
    ],
  },
  {
    version: '1.4.0',
    date: '8 maggio 2026',
    label: 'Risultati e Leaderboard Live',
    changes: [
      'Sezione "🏆 Leaderboard Live" nei risultati bottiglia con proiezione punteggi e badge +N verde',
      "Fix double-count: snapshot dei punteggi congelato all'apertura di ogni bottiglia",
      'Badge "tu" inline viola per il giocatore corrente nella classifica',
      'Riga risposta con colore di sfondo e bordo sinistro colorato (verde corretto, rosso errato)',
      'Punti visualizzati come pill verde (+25 🔥 se combo)',
      'Unico pulsante "Vedi classifica" sull\'ultima bottiglia (rimosso "Termina")',
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
      'Pannello di uscita con modale di conferma',
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
      'Leaderboard in tempo reale accessibile durante la partita',
      'Leaderboard finale con podio 🥇🥈🥉 alla fine della sessione',
      'Foglio di stampa per condivisione fisica delle domande',
      'Dashboard host con lista partite e gestione sessioni',
      'Autenticazione utente (Supabase Auth)',
      'Skeleton loading su tutte le route data-fetching',
    ],
  },
]

const LABEL_COLORS = {
  'i18n & Session': '#0ea5e9',
  'Corso Vino UX': '#0f766e',
  'Performance & UX': '#6b2f8e',
  'Risultati e Leaderboard Live': '#2563eb',
  'Multiplayer — Funzionalità sociali': '#d97706',
  'Stabilità Realtime': '#dc2626',
  'Gameplay & UX': '#16a34a',
  Launch: '#374151',
}

const LABEL_TRANSLATIONS = {
  'i18n & Session': 'i18n & Session',
  'Corso Vino UX': 'Wine Course UX',
  'Performance & UX': 'Performance & UX',
  'Risultati e Leaderboard Live': 'Live Results & Leaderboard',
  'Multiplayer — Funzionalità sociali': 'Multiplayer — Social Features',
  'Stabilità Realtime': 'Realtime Stability',
  'Gameplay & UX': 'Gameplay & UX',
  Launch: 'Launch',
  Auto: 'Auto',
}

const IT_TO_EN_MONTH = {
  gennaio: 'January',
  febbraio: 'February',
  marzo: 'March',
  aprile: 'April',
  maggio: 'May',
  giugno: 'June',
  luglio: 'July',
  agosto: 'August',
  settembre: 'September',
  ottobre: 'October',
  novembre: 'November',
  dicembre: 'December',
}

function formatEntryDate(date, lang) {
  if (lang !== 'en') return date
  const parts = String(date).trim().split(' ')
  if (parts.length !== 3) return date

  const [day, month, year] = parts
  const monthEn = IT_TO_EN_MONTH[month.toLowerCase()]
  if (!monthEn) return date
  return `${monthEn} ${day}, ${year}`
}

function formatEntryLabel(label, lang) {
  if (lang !== 'en') return label
  return LABEL_TRANSLATIONS[label] ?? label
}

export default async function ChangelogPage() {
  const lang = await getServerLanguage()
  const text = lang === 'en' ? UI_TEXT.en : UI_TEXT.it
  const backHref = '/'

  return (
    <div className={styles.page}>
      <TopBarBack title={text.title.replace('📋 ', '')} href={backHref} />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{text.title}</h1>
          <p className={styles.subtitle}>{text.subtitle}</p>
        </div>

        <div className={styles.timeline}>
          {CHANGELOG.map((entry) => (
            <div key={entry.version} className={styles.entry}>
              <div className={styles.entryMeta}>
                <span className={styles.version}>v{entry.version}</span>
                <span className={styles.date}>{formatEntryDate(entry.date, lang)}</span>
              </div>
              <div className={styles.entryBody}>
                <div className={styles.entryHeader}>
                  <span
                    className={styles.label}
                    style={{background: LABEL_COLORS[entry.label] ?? '#374151'}}>
                    {formatEntryLabel(entry.label, lang)}
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
