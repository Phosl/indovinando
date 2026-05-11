# Backlog

## Aggiornato: giugno 2026

---

## ✅ Completato (recente)

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
- Timeout automatico round (host non avanza → round avanza da solo dopo N secondi).
- Notifica in-game quando un giocatore si disconnette / risulta inattivo.
- Possibilità di rigiocare una partita dallo storico (usa stesso game, crea nuova sessione).
- Export PDF/CSV dello storico partite.
- Dark mode sistema.
