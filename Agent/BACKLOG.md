# Backlog

## Aggiornato: giugno 2026

---

## ✅ Completato (recente)

### Auto-tasting, catalogo e quiz

- Pipeline auto-tasting consolidata su `OpenAI Vision`, con `web enrichment` manuale e
  controllabile.
- Match catalogo rinforzato, gestione casi ambigui tipo `Idda`, e recupero dati accessori dal
  catalogo senza nuova ricerca web.
- Flusso `Fai web-search` con preview differenze, applicazione selettiva degli aggiornamenti e
  badge/token/costo più leggibili.
- Salvataggio catalogo esteso a dati utili per quiz e scheda vino (`price_min/max`, profilo gusto,
  note narrative, sorgenti).
- Quiz automatico migliorato per bottiglia singola, fallback fasce annata, risposte AI più brevi e
  più coerenti con la UI.
- Metriche auto-tasting separate tra sessione e singola bottiglia (token/costo).
- Aggiornata documentazione tecnica:
  - `Agent/CREA_QUIZ_OPEN_AI.md`
  - `Agent/AUTOVISION_LOGICA_SEMPLICE.md`
  - `Agent/DATABASE.md`
  - `Agent/SUPABASE_FULL_CHECKPOINT_AUDIT.sql`

### Table-live e i18n

- Allineati gli avatar in `table-live` tra top bar, lobby, classifica live e classifica finale
  usando `avatar_id` reale con fallback coerente.
- Primo pass anti-hardcoded su `table-live session`: messaggio host in lobby portato su i18n e reso
  più visibile.
- Esteso il dizionario IT/EN nelle aree `auto-tasting`, `BottleModal`, `QuestionsList` e parti del
  flusso live/table-live.

### Live Multiplayer — Bug & stabilità

- **TDZ fix `QuestionSlideScreen`**: `const t = setTimeout(...)` ombreggiava il `t` della traduzione
  → rinominato `timer`.
- **Host overlay "nessun giocatore"**: decoupling `Promise.all` che bloccava l'aggiornamento
  giocatori per RLS su `live_round_answers`; aggiunto preload server-side di `initialPlayers` in
  `page.js`.
- **Classifica divergente host/guest**: rimosso il calcolo locale di `sortedLeaderboard`; aggiunto
  `GET /api/live/session/standings` con service role key → unica fonte di verità per tutti i client.
- **Correzione preload risposte corrette**: `play/page.js` (server) carica `game_bottle_answers` con
  service role e inietta `_correctAnswers` direttamente nell'oggetto bottle (evita hang RLS per
  utenti autenticati).

### Storico partite

- Tabella `live_session_results` (snapshot permanente: game_name, played_at, player_count, players
  jsonb).
- `POST /api/live/session/finish` salva snapshot asincrono, non bloccante, con dedup su retry.
- Pagina `/dashboard/storico` (server component + `StoricoClient` con state client).
- Filter pills per nome gioco (visibili solo se >1 gioco distinto); click su pill
  attiva/deseleziona.
- Pulsante "📜 Storico partite" nel dashboard hero.
- Chiavi i18n italiane + inglesi (`dashboard.storico.*`).
- Migration: `LIVE_SESSION_HISTORY.sql`.

### TopBar migliorata

- Creato `TopBarBack.jsx`: thin client wrapper che accetta `href` stringa (usabile da server
  component).
- Applicato a `/dashboard/storico` e `/changelog`.

### Corso Vino UX

- UX post-lezione: rimosso pulsante "Ripeti lezione" dalla schermata finale; mantenuto un CTA
  principale; aggiunto "Tutte le lezioni" in alto.
- Badge "Ripeti/Repeat" su card lezioni completate con maggior contrasto.

### i18n

- Sistema `useT` / `getServerLanguage` completato su tutte le aree live.
- Corsi: traduzione EN automatica (`scripts/translate-courses-to-en.mjs`).

---

## 🔜 Prossimi step

### Alta priorità

- **Revisione editoriale EN corsi** (`public/corsi/en`): eliminare frasi innaturali da traduzione
  automatica, ricontrollare terminologia tecnica vinicola.
- **QA mobile flusso corso**: intro → quiz → risultato → navigazione livello (testare su iPhone
  reale).

### Bassa priorità / Nice to have

- Estensione progressiva dizionario i18n alle aree con stringhe ancora inline (es. game editor,
  enoteca details).
- Audit mirato hardcoded UI ancora aperti:
  - `src/components/game/utils/validations.js`
  - `src/app/admin/vini/page.js`
  - `src/app/admin/produttori/dettaglio/page.js`
  - `src/components/landing/*`
  - `src/app/table-live/session/[sessionId]/TableLiveSessionClient.jsx` (residui)
  - metadata/title server pages non ancora uniformati IT/EN
- Timeout automatico round (host non avanza → round avanza da solo dopo N secondi).
- Notifica in-game quando un giocatore si disconnette / risulta inattivo.
- Possibilità di rigiocare una partita dallo storico (usa stesso game, crea nuova sessione).
- Export PDF/CSV dello storico partite.
- Dark mode sistema.
