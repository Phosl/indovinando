# 🧊 ICEBUCKET — Migliorie future

Idee buone ma non prioritarie. Da riprendere quando c'è tempo.

---

## 📱 PWA / App

- [ ] **Offline: Corso Vino** — i JSON dei corsi sono statici in `/public/corsi/`, con cache-first
      nel SW si può giocare completamente offline
- [x] **Offline: shell app** — runtime cache per asset shell/statici (`/_next/static`, CSS, font,
      icone) senza chunk Next hardcoded
- [ ] **Pagina "Sei offline"** — invece del browser error, mostrare una schermata brandizzata con
      messaggio gentile
- [x] **Splash screen animato** — logo/icona animata durante il caricamento iniziale instead della
      schermata nera
- [ ] **Background Sync** — salvare risposte offline e sincronizzare quando si torna online
- [ ] **Notifiche Push** — avvisare giocatori di partite live in avvio (richiede backend Supabase
      Push)
- [ ] **Share Target** — condividere un link direttamente a Indovinando da altre app
- [ ] **Badging API** — mostrare un badge sull'icona home quando c'è una partita in attesa

---

## 🎮 Gioco Live

- [ ] **Live offline (modalità locale)** — fallback senza server/realtime per partite locali su un
      solo dispositivo, con sincronizzazione risultati quando torna la rete
- [ ] **Spectator mode** — seguire una partita senza giocare
- [ ] **Timer per domanda** — opzione di aggiungere un countdown visibile ai giocatori

---

## 🍷 Enoteca

- [ ] **Modalità offline** — giocare senza account e senza salvare, per demo/test
- [ ] **Enoteca offline con sync** — salvare sessioni localmente offline e inviarle a Supabase
      quando la connessione ritorna
- [ ] **Filtri per regione/vitigno** — selezionare vini per categoria
- [ ] **Storico degustazioni** — vedere le sessioni passate con dettaglio bottiglie

---

## 🎓 Corso Vino

- [ ] **Navigazione offline completa** — rendere `/corso-vino` e `/corso-vino/[levelId]` client-only
      (o prerender statico) per aprire i corsi anche offline senza visita precedente
- [ ] **Certificati** — PDF/immagine scaricabile al completamento di un livello
- [ ] **Streaks** — mantenere la serie di giorni consecutivi di studio
- [ ] **Ripasso intelligente** — riproporre domande sbagliate nelle sessioni successive

---

## 🛠️ Tech / Dev

- [ ] **Skeleton sulle transizioni client-side** — attualmente gli skeleton appaiono solo su
      navigazioni server (loading.js), non su click veloci già cached
- [ ] **Error boundary globale** — pagina di errore brandizzata invece della crash screen Next.js
- [ ] **Analytics** — tracciare eventi di gioco (risposta, combo, completamento) con Plausible o
      simile
- [ ] **Rate limiting API** — protezione anti-spam sulle route /api
- [ ] **Test E2E** — Playwright per flussi critici (login → crea partita → gioca)

- [ ] **IDEA** — potremmo salvare una versione leggera, ma non so se ha senso.. l utente nel profilo
      puo tenere traccia di tutte le bottiglie che inserisce se ha determinati parametri, es se
      inserisco bottiglia ( anche manualmente. ) la bottiglie viene salvata, magari se i dati
      combaciano con il template standard li machiamo e salvimo anche quelli, non so se mi sono
      spiegato

- [x] **DB VINI - WINE CATALOG** Sistemare Vini con piu uvaggi... es idda bianco è Carricante ma ho
      Nerello Mascalese, Carricante, Nerello Cappuccio cosi poi mi da associazione sbagliata. Valori
      usati nel quiz: Italy | Sicilia | Nerello Mascalese | - Forse script di verifica del solo
      uvaggio, anno, etc.. Lista vini, prende nome e produttore, aggiunge uvaggio come opzionale
      prendendo i primi 3/5 risultati di google, aprire pagina e prendere valori

- [ ] **Partita con codice** - Admin crea QR code utenti vanno su QR code, utente vede schermata con
      Numero 1545, altri utenti partecipano a 1545. Parte partita Live Specifica step 1:
      `LIVE_TABLE_GROUPS_STEP1.md`

---

## 🚀 TODO — Miglioramenti stato attuale (focus breve termine)

### Auto Tasting / Quiz Builder — micro task raccolti

- [x] **Fix preview loader bloccato** — caso sporadico `Anteprime caricate: 0/2`
- [x] **Template standard: non escludere Stato se uguale** — mantenerlo comunque nel quiz standard
- [x] **Almeno 5 opzioni per domanda nel quiz** — aumentare i distrattori quando i dati sono pochi
- [x] **Quick create step 4: risposte neutre non devono risultare incomplete**
- [x] **Rivedere load bottiglie auto-tasting** — timeout sporadici su fetch/refresh lista
- [x] **Tab in preview quiz** — switch tra `Quiz AI` e `Quiz standard` dentro la preview
- [x] **Card evento tavoli da rivedere**
  - logo Indovinando piccolo
  - QR code in alto
  - blocco `Link e QR evento`
  - testo: `Accedi a questo link per giocare o stampa il QR per condividerlo.`
  - Link: `Apri Link, Copia link, Stampa QR, apre modale come ora e li,`
  - invertire pulsanti nella modale QR: `Chiudi`, `Stampa`
- [x] ** Inserisci il Codice Partita -> Migliora il campo codice**
  - Usa 4 caselle separate oppure un placeholder tipo “Es. 4821”.
  - Evita “0000”.
- [x] **Migliorare la ricerca, prima mi trovava il vino Idda**

- [x] **Uniformare playersList come la partita Live e fare attenzione che la pagina non scrolla.**
- [x] **codice partita, piu evidente**
- [x] **Check ora Idda bianco ce l ho nel catalogo..solo se faccio scatta foto mi da sempre ricerca
      Web..invece che catalogo giusto?**
- [ ] **Audit hardcoded / traduzioni mancanti** — usare il file recap già esistente come checklist
  - Fatto un primo pass su `auto-tasting`, `BottleModal`, `QuestionsList`, `table-live session`.
  - Ancora aperti: `validations`, `admin vini/produttori`, `landing`, metadata/title server pages.
- [x] **Aggiornare documentazione** — schema `game_questions`, domande neutre, flow quiz auto

- [] **Rigenera link evento, manderei all inserimento del nome del evento**
- [] **Su carica bottiglia sarebbe bello avere effetto Card**
- scrolling alla tinder.magari foto di fondo con gradiente scuro
- sopra e le informazioni, tipo carta magic,
- fonti web puo essere in una modale
- [] **Ordine Bottiglie**
- [x] **Valutare deeplink** — share/open diretto su create quiz / sessioni / eventi
- [x] **effetto glow analizza tutte**
- [ ] **quante bottiglie si caricano e anlizzano alla volta? Forse una alla volta e quando finito si
      genera qui?**
- [x] **se non troviamo l'anno possiamo sempre mettere delle fasce ( magari ipotizzando l'anno )**

- [x] **schede vino complete con desc etx**
- [x] **check fai web fa mobile**
- [x] **come fa a trovare il prezzo alla prima analisi**
- [x] **Migliorare risposte su domande generate**

### P0 — Stabilità flusso di gioco (iniziamo da qui)

- [x] **Fix ultima domanda (tavoli)** — applicato fix anti-skip; **da validare** con test host+guest
      endgame
- [x] **Classifica Tavoli robusta** — applicato fix redirect/fallback; **da validare** su sessioni
      reali
- [ ] **Allineamento completo Live Tavoli vs Live classico** — stessa UX su fine round, classifica,
      prossimo step
- [ ] **Stabilità realtime multi-device** — test host + 2 guest su round finali e cambio bottiglia
- [ ] **Sulle domande che fa l'Ai, dovrebbe mettere delle risposte della stessa lunghezza o
      intensità**
- [ ] **Tradurre i dati a seconda della lingua impostata**

### P1 — Qualità UX percepita

- [ ] **Riduzione latenza percepita risposte** — ottimizzare check answer + refresh stato round
- [ ] **Audio UX Tavoli** — ridurre delay e allineare timing feedback con Live originale
- [x] **Flusso uscita partita** — introdotta modale uscita; **da rifinire** allineamento completo
      con Live

### P2 — UI polish e hardening

- [x] **UI consistency pagine Tavoli** — fatto grosso lavoro su spacing/topbar/CTA; **resta polish
      finale**
- [ ] **Safe area mobile** — evitare overlap navbar/bottom actions nei quiz
- [ ] **Checklist QA pre-release** — script test manuale rapido per
      create/join/play/leaderboard/endgame

---

## 🧭 Live Architecture Map (attuale)

### Shared (Live classico + Tavolo)

- `TopBar` → `src/app/live/session/[sessionId]/play/components/TopBar.jsx`
- `ResultsScreen` → `src/app/live/session/[sessionId]/play/components/ResultsScreen.jsx`
- `GameOverlays` → `src/app/live/session/[sessionId]/play/components/GameOverlays.jsx`
- `useGameAudio` → `src/app/live/session/[sessionId]/play/hooks/useGameAudio.js`
- Stili gameplay principali → `src/app/live/session/[sessionId]/play/playerLive.module.scss`

### Dedicated (solo Live classico)

- Orchestrazione round/realtime avanzata → `PlayerLiveClient` + `useRoundPlay`
- API live classiche (`/api/live/*`)

### Dedicated (solo Tavolo)

- Sessioni/eventi tavoli + join code → `TableLiveSessionClient` / `table-live/*`
- API tavoli (`/api/table-live/*`)
- DB separato tavoli (`table_live_*`)

---

## 🎯 UI System Contract (prossimo step)

### 1) Motion Contract

Obiettivo: stessa “fisica” in tutta l’app (live, tavolo, dashboard, modali).

- [ ] **Preset globali motion** (massimo 3):
  - `snappy` → per CTA, toggle, feedback veloci
  - `smooth` → per transizioni tra viste/cards
  - `playful` → per momenti celebrativi (combo/completion)
- [ ] **Regola unica tempi**:
  - micro feedback: `120–180ms`
  - transizioni principali: `200–280ms`
  - evitare animazioni > `320ms` su flussi frequenti
- [ ] **Regola easing/spring**:
  - niente easing random locale
  - usare solo preset centralizzati
- [ ] **Reduced motion**:
  - fallback automatico se `prefers-reduced-motion`

---

### 2) Micro-interaction Refine (con spring, leggero)

Nota: sì, possiamo usare spring; impatto prestazioni basso se limitiamo le aree animate e usiamo
transform/opacity.

- [ ] **Checklist per ogni interazione core**:
  - Anticipation (hint interazione)
  - Preview (feedback mentre interagisci)
  - Commit (conferma azione)
  - Resolution (stato finale pulito)
- [ ] **Flussi prioritari**:
  1. join/create live
  2. check risposta → risultato round
  3. ultima bottiglia → classifica finale
- [ ] **No animazioni decorative isolate**:
  - ogni animazione deve comunicare stato/azione

---

### 3) Visual Polish Uniforme

- [ ] **Audit componenti ricorrenti**:
  - card, topbar, CTA, chips, overlay, modali
- [ ] **Allineare stile cross-sezione**:
  - dashboard / miei-giochi / game / live / table-live
- [ ] **Regola UI**:
  - stesso componente = stessa grammatica visiva
  - niente varianti ad-hoc se non necessarie

---

### 4) Spacing / Typography Scale

Obiettivo: eliminare valori sparsi e “quasi uguali”.

- [ ] **Spacing scale unica**: `4, 8, 12, 16, 24, 32, 48`
- [ ] **Typography scale unica**:
  - Hero: `32/900`
  - H1: `28/900`
  - H2: `24/900`
  - H3: `20/800-900`
  - Body: `16/500-600`
  - Small: `14/600`
  - Caption: `12/700`
- [ ] **Line-height guidance**:
  - heading: `1.15–1.25`
  - body: `1.35–1.5`
- [ ] **Tokenizzazione**:
  - spostare gradualmente i valori in token shared

- [ ] **importazione nuovo file staging aggiunte colonne alter table public.wine_import_staging** -
      add column if not exists quiz_region text, add column if not exists quiz_appellation text, add
      column if not exists quiz_price_band text; alter table public.wine_labels add column if not
      exists quiz_region text, add column if not exists quiz_appellation text, add column if not
      exists quiz_price_band text;

- [ ] **NEXT FEAUTURE**: Testa le tue conoscenza sul vino! Quiz generico del vino con 3 livelli
      amatore - appassionato - somellier

- [] **Indici tabella per ottimizzazione**
- create extension if not exists pg_trgm;
- create index if not exists idx_wine_labels_normalized_name_trgm
- on public.wine_labels using gin (normalized_name gin_trgm_ops);
- create index if not exists idx_wine_labels_name_trgm
- on public.wine_labels using gin (name gin_trgm_ops);
- create index if not exists idx_wine_labels_data_source
- on public.wine_labels(data_source);
- create index if not exists idx_wine_labels_producer_id – on public.wine_labels(producer_id);
