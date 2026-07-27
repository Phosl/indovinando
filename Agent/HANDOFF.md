# Handoff — Indovinando

Ultimo aggiornamento: 2026-07-27

## Stato generale

- `main` allineato a `origin/main` prima del checkpoint; modifiche motion e SEO/GEO validate e pronte per commit/deploy.
- App in fase di polish pre-release/demo, con focus su UX mobile/PWA, performance percepita, flussi di creazione partita e stabilità dati.
- Regole repo importanti:
  - riusare componenti esistenti prima di crearne nuovi;
  - usare colori `var(...)` da `global.scss` / Clean Palette;
  - `tc` = commit title in inglese;
  - `ns` = prossimo step.

## Feature implementate di recente

### Checkpoint 2026-07-27 — link pubblico pronto alla condivisione

- Link pubblico di riferimento: `https://indovinando.vercel.app/`.
- Creata anteprima social JPEG dedicata 1200×630 da 238 KB, usata in modo uniforme da Open Graph e Twitter Card.
- Le pagine partner non usano più loghi remoti SVG come `og:image`; titolo e descrizione restano specifici, l’immagine è quella affidabile del sito.
- Eliminate letture duplicate delle statistiche in home e memoizzati per richiesta i dati pubblico vino/partner condivisi tra metadata e pagina.
- Centralizzata la validazione dei redirect interni per impedire percorsi assoluti o protocol-relative nei parametri `next` e `back`.
- Il fallback statico della sitemap produce ora un warning server sicuro e diagnosticabile.
- Aggiunto smoke test riutilizzabile `npm run check:public -- <base-url>` per metadata, crawler WhatsApp, asset social, route pubbliche, noindex privati, robots, sitemap e dati fittizi.
- Smoke locale superato con 44 URL in sitemap; table-live superato nelle modalità `instant` ed `end`, con cleanup delle sessioni QA.
- Build production, lint mirato, lint completo senza errori, audit Next.js con 0 errori e `git diff --check` completati.

### Checkpoint 2026-07-24 — SEO e GEO

- Report completo: `Agent/SEO_GEO_AUDIT_2026_07_24.md`.
- Audit production: la home non esponeva title/description e `/robots.txt` e `/sitemap.xml` restituivano `404`.
- Aggiunta fonte condivisa per origin canonico, metadata pubblici, Open Graph, Twitter Card, robots e serializzazione JSON-LD.
- Aggiunti metadata localizzati e canonical a home, demo, classifiche, vini, partner, corso e pagine informative.
- Aggiunti dati strutturati coerenti con i contenuti visibili: Organization, WebSite, WebApplication, FAQ, CollectionPage, Dataset, LocalBusiness, Course e LearningResource.
- Aggiunti `robots.txt`, sitemap dinamica per partner, vini reali e soli livelli/lezioni del corso accessibili senza login.
- Le Preview Vercel vengono escluse dall'indicizzazione; le aree private e operative inviano anche `X-Robots-Tag: noindex, nofollow`.
- `OAI-SearchBot` può leggere i contenuti pubblici; `GPTBot` è escluso e le API restano fuori dalla scansione.
- Rimossi ranking, utenti, statistiche e partner fittizi dai fallback pubblici: se i dati reali non bastano, l'interfaccia mostra uno stato vuoto verificabile.
- FAQ e sezione “Come funziona” rese più esplicite per rispondere alle domande principali su preparazione, QR, browser, demo e risultati.
- Build production, lint mirato, validazione JSON e controllo HTTP locale completati.

### Checkpoint 2026-07-10 — demo pubblica

- Aggiunta route pubblica `/demo`, disponibile senza login e senza scritture su database.
- La demo usa direttamente le sei domande del questionario standard condiviso: Stato, Regione, Uvaggio, Anno, Voto e Prezzo.
- Demo, creazione rapida e creazione automatica leggono lo stesso `getQuickTemplateQuestions`, senza copie parallele del template.
- Il gioco riusa direttamente `TopBar`, `QuestionSlideScreen` e `ResultsScreen` del flusso table-live: grafica e interazioni restano identiche alla partita reale.
- Audio, vibrazione, toggle suoni, classifica bottom-sheet e conferma uscita riusano `useGameAudio` e `GameOverlays` del table-live.
- Cinque avversari simulati aggiornano i punteggi con tempi sfalsati durante le domande; la classifica aperta cambia in tempo reale.
- Punteggio allineato al table-live: `10` punti per risposta oggettiva corretta, `0` per risposta errata o voto neutro, massimo `50` e nessuna combo.
- Ogni risposta mostra il feedback reale del gioco; al termine vengono mostrati riepilogo, punteggio e vino rivelato.
- Aggiunti accessi dalla landing, dal menu landing e dalla dashboard degli utenti registrati.
- Aggiunta sezione promozionale subito sotto l'hero della landing, riusando `LandingCTA`, con vantaggi concreti e CTA primaria verso `/demo`.
- CTA finale verso la creazione di una degustazione e possibilità di rigiocare immediatamente.
- Contenuti completi in italiano e inglese; UI responsive e compatibile con `prefers-reduced-motion`.
- Build production, lint e validazione JSON completati senza errori.

### Checkpoint 2026-07-10 — centralina super-admin

- Aggiunta pagina protetta `/profilo/centralina`, visibile dal profilo solo ai super-admin.
- La centralina mostra stato generale, versione deploy, ambiente e regione senza esporre secret.
- Aggiunti controlli rapidi e approfonditi, tutti in sola lettura, per configurazione, database, Storage e servizi principali.
- Aggiunte metriche operative su utenti, degustazioni, partner, partite live, scansioni AI e ordini crediti.
- Integrato test on-demand di OpenAI Vision tramite endpoint super-admin già esistente.
- Integrato il report table-live più recente e una checklist manuale mobile/PWA salvata localmente nel browser.
- Aggiunti collegamenti rapidi ad amministrazione, crediti, landing interna e changelog.
- Nuova API protetta `GET /api/admin/control-center?scope=quick|deep`; una richiesta non autenticata restituisce `403`.
- Validazione completata con lint mirato, `git diff --check` e build production Next.js.

### Checkpoint 2026-07-10 — motion e skeleton

- Transizioni pagina ridotte a solo `translateX` orizzontale + `opacity`, con due keyframe condivisi per ingresso e uscita.
- Navigazione con `prefers-reduced-motion` senza animazioni o ritardi artificiali.
- Shimmer degli skeleton reso più morbido; card e frame entrano con una breve animazione condivisa.
- Aggiunto `PageSkeleton` riutilizzabile per evitare nuovi loading duplicati.
- Aggiunti loading dedicati a classifiche, dettaglio vino, sottosezioni profilo, table-live e area admin/corsi.
- Build e lint mirato completati senza errori; resta il controllo visuale finale su iPhone/PWA reale.

### Checkpoint 2026-07-10 — table-live

Report completo: `Agent/TABLE_LIVE_TEST_REPORT_2026_07_10.md`.

- Flusso table-live verificato end-to-end nelle modalità `instant` e `end` con host e guest.
- Link e QR della lobby ora aprono direttamente il join dell'evento con codice partita già compilato.
- Accesso diretto alla sessione senza token giocatore reindirizza al join senza esporre domande o soluzioni.
- Risposte corrette non sono più disponibili prima del momento previsto dalla modalità scelta.
- Invio risposta validato lato server: domanda e opzione devono appartenere al gioco; una risposta confermata non può essere cambiata.
- Refresh durante la partita ripristina risposte, domanda corrente e riepilogo del round.
- Avanzamento round consentito solo all'host e protetto contro chiamate duplicate concorrenti.
- Nuovi partecipanti non possono entrare dopo l'avvio della partita.
- Uscita volontaria guest aggiorna `is_active` e non blocca più il round; uscita host chiude la sessione.
- Riepilogo table-live usa l'endpoint classifiche table-live invece di quello del vecchio live.
- Aggiunto smoke test riutilizzabile `npm run check:table-live -- <event-slug> <base-url>` con cleanup automatico.
- Scelta `risposte subito` / `risposte alla fine` ingrandita e resa più comoda su mobile.

### Checkpoint 2026-06-21

- Landing pubblica aggiornata con hero più esplicita, FAQ e immagini da `public/landing`.
- Aggiunta pagina interna `/landingpage` visibile anche da utenti loggati, con link dashboard solo super-admin.
- Service worker reso più controllato: niente precache rigido della shell, runtime cache e avviso manuale nuova versione.
- Avviato hardening tecnico sul salvataggio giochi: validazione payload dedicata e uso helper Supabase admin/fallback condiviso.
- Aggiunto recap Supabase Security Advisor con SQL safe-first e note sui refactor RLS enoteca/table-live.

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
npm run check:public -- <base-url>
npm run check:table-live -- <event-slug> <base-url>
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
6. Valutare una presenza/heartbeat per i giocatori che chiudono forzatamente la pagina senza usare “Esci”.
7. Drag&drop bottiglie/domande: lasciare stabile la versione attuale, evitare nuove animazioni pesanti.

## Note operative

- Se una pagina mostra flicker/blank tra route, controllare prima:
  - `loading.js` della route;
  - background di `body/html/route-shell`;
  - apertura con `window.open` invece di `router.push`;
  - overlay/bottom row fixed dentro container con transform.
- Se una card resta “schiarita” dopo tap mobile, spesso è hover sticky: usare media query `@media (hover: none)` per neutralizzare hover.
- Per UI nuove: preferire componenti esistenti (`TopBar`, `InfoModal`, `BottomRow`, button globali) e colori `var(...)`.
