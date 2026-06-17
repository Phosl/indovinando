# Handoff — Indovinando

Ultimo aggiornamento: 2026-06-16

## Stato generale

- Branch/worktree pulito al momento della creazione di questo handoff.
- App in fase di polish pre-release/demo, con focus su UX mobile/PWA, performance percepita, flussi di creazione partita e stabilità dati.
- Regole repo importanti:
  - riusare componenti esistenti prima di crearne nuovi;
  - usare colori `var(...)` da `global.scss` / Clean Palette;
  - `tc` = commit title in inglese;
  - `ns` = prossimo step.

## Feature implementate di recente

### Profili e business

- Wizard profilo utente con preferenze, esperienza, newsletter e stato profilo completo.
- Profilo business per enoteche/ristoranti/attività con dati pubblici, indirizzo Google Places e coordinate.
- Scheda pubblica partner con modalità landing/app e back coerente.
- Logo business e branding degustazioni collegati a QR, schede e landing dove previsto.
- Badge/area business e preferenze profilo spostate su pagina dedicata.

### Partner, landing e classifiche

- Landing aggiornata con sezione partner, mappa Google e card essenziali.
- Pagina classifiche pubblica con ranking vini reali, statistiche community e pagina scheda vino.
- Widget community usato come anteprima e alleggerito/lazy dove necessario.
- Ranking utente più bravo aggiunto.
- Link condivisi resi dinamici rispetto a origin corrente/preview Vercel.

### Crediti AI e Stripe

- Sistema crediti AI con contatore profilo.
- Checkout Stripe per pacchetti crediti 10/30/100.
- Webhook Stripe che accredita crediti dopo pagamento.
- Pagina crediti dedicata con storico ordini.
- Modale/overlay durante redirect Stripe e schermata success/cancel gestita.
- Documentazione Stripe aggiornata in `Agent/STRIPE_DEV_TEST_GUIDE.md` e piano in `Agent/STRIPE_CREDITS_PLAN.md`.

### Creazione degustazione automatica

- Wizard automatico in step:
  - foto bottiglie;
  - elenco bottiglie analizzate;
  - dettaglio bottiglia;
  - generazione questionario/template.
- Persistenza draft per evitare perdita foto/dati se si esce con gesture mobile.
- Upload mobile/HEIC migliorato con fallback preview.
- Analisi batch più robusta e ricerca web iniziale rafforzata.
- Catalog match + icona match, campi incompleti evidenziati e recupero guidato campi mancanti.
- Domanda “stato/paese” mantenuta nel template AI quando disponibile.
- Informazione colore/tipo vino portata dall’analisi AI ai campi bottiglia.
- Salva catalogo ripristinato nella scheda bottiglia.

### Gioco, table-live e partita

- Flussi live/enoteca nascosti: al momento rimane una modalità principale multiplayer/table-live.
- Avvia partita porta direttamente alla creazione link/QR evento.
- Join/create table-live rifiniti con step nickname/avatar/opzioni.
- Opzioni partita: risposta immediata o risposte alla fine, con schema DB dedicato.
- RLS/fallback admin per preview Vercel sistemati sulle route table-live/session.
- Storico partite profilo e dashboard include anche sessioni table-live dove possibile.
- Eliminazione degustazione corretta con cascade per eventi table-live e redirect verso lista.
- Bottom row table-live corretta per PWA/mobile.

### Corso vino e UI app

- Cover corsi da `public/corsi/cover_corsi`, fallback immagine se manca.
- Card corsi rifinite con colori `var(...)`.
- TopBar PWA/safe-area migliorata in più aree.
- Skeleton dashboard/corso/degustazioni ottimizzati per ridurre flicker.
- Progress corso controllato e cleanup SQL disponibile.
- Key points nelle lezioni messi in box dedicato.

## Ultimi bug trattati

- Sfondo nero nei loading/skeleton:
  - causa: safe-area nera applicata troppo globalmente su `body/html`.
  - fix applicato: nero limitato alla safe-area top, `body/html/route-shell` con background app.
- Riga nera tra contenuto e bottom nav:
  - mitigata riportando `html` su `var(--app-background)` e lasciando overlay top dedicato.
- Table-live avatar step:
  - bottom row/back button sistemato per non uscire dal wrapper.
- Table-live opzioni partita:
  - card semplificata, info evento fuori card.
- “Vai al link” in avvia partita:
  - convertito da apertura nuova pagina a navigazione interna con router dove possibile.

## Stato DB / SQL importanti

File SQL recenti da tenere presenti:

- `Agent/SUPABASE_AI_SCAN_CREDITS.sql`
- `Agent/SUPABASE_AI_CREDIT_PURCHASES.sql`
- `Agent/SUPABASE_TABLE_LIVE_ANSWER_REVEAL_MODE.sql`
- `Agent/SUPABASE_GAME_DELETE_TABLE_LIVE_CASCADE.sql`
- `Agent/SUPABASE_PUBLIC_WINE_RANKINGS.sql`
- `Agent/SUPABASE_PUBLIC_USER_RANKINGS.sql`
- `Agent/SUPABASE_WINE_COURSE_PROGRESS_CLEANUP.sql`
- `Agent/LIVE_SESSION_HISTORY.sql`

Nota: per ambienti Preview Vercel serve verificare env server-side Supabase admin, altrimenti alcune route create/save possono mostrare “Missing Supabase admin environment variables”.

## Env importanti

### Pubbliche / client

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Nota: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` è normale che sia visibile al browser, ma va limitata in Google Cloud per dominio e API.

### Server only

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_CLOUD_VISION_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_AI_CREDITS_10`
- `STRIPE_PRICE_AI_CREDITS_30`
- `STRIPE_PRICE_AI_CREDITS_100`
- `OPENAI_WEB_ENRICHMENT_ENABLED`

## Comandi utili

```bash
npm run dev
npm run build
npx eslint <file>
git diff --check
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Per Stripe locale:

1. avviare app locale;
2. avviare `stripe listen --forward-to localhost:3000/api/stripe/webhook`;
3. aggiornare `STRIPE_WEBHOOK_SECRET` locale con il secret mostrato dalla CLI se cambia;
4. testare con carta `4242 4242 4242 4242`.

## Check consigliati prima demo/release

### Mobile/PWA

- Dashboard: spazio safe-area, testo “Benvenuto…” non attaccato sopra.
- Corso vino: home corso → capitolo → lezione → back, senza skeleton nero.
- Bottom nav: nessuna riga nera scrollando fino in fondo.
- Table-live create/join: bottom row non tagliata e back dentro wrapper.

### Creazione automatica

- Caricare 1 bottiglia singola e generare quiz.
- Caricare 3/4 bottiglie in batch e verificare:
  - anteprime;
  - crediti scalati;
  - dati bottiglia completi;
  - ricerca web iniziale;
  - quiz AI con domanda paese/stato;
  - nessuna bottiglia segnata incompleta se i campi richiesti sono pieni.

### Stripe

- Compra crediti → redirect Stripe → pagamento test → ritorno success.
- Compra crediti → torna indietro/cancel → nessun hydration mismatch.
- Verificare storico pagina crediti e contatore profilo.

### Partite/storici

- Creare evento table-live.
- Entrare come player.
- Avviare partita.
- Completare una partita.
- Verificare storico profilo e dashboard/storico.

## TODO / prossimi step suggeriti

1. Audit completo topbar/safe-area in PWA su iPhone reale.
2. Spezzare ulteriormente `GameCreateClient` se cresce ancora, ma senza toccare flussi stabili.
3. Valutare cleanup periodico immagini automatic tasting con TTL 1 giorno.
4. Rimuovere definitivamente vecchi flussi live/enoteca quando la modalità unica è confermata.
5. Aggiungere storico transazioni admin/super-admin solo se serve davvero.
6. Migliorare opzione “risposte alla fine” nel table-live con reveal finale completo.
7. Drag&drop bottiglie/domande: lasciare stabile la versione attuale, evitare nuove animazioni pesanti.

## Note operative

- Se una pagina mostra flicker/blank tra route, controllare prima:
  - `loading.js` della route;
  - background di `body/html/route-shell`;
  - apertura con `window.open` invece di `router.push`;
  - overlay/bottom row fixed dentro container con transform.
- Se una card resta “schiarita” dopo tap mobile, spesso è hover sticky: usare media query `@media (hover: none)` per neutralizzare hover.
- Per UI nuove: preferire componenti esistenti (`TopBar`, `InfoModal`, `BottomRow`, button globali) e colori `var(...)`.
