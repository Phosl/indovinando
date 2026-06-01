# I18N Inline Text Audit

Date: 2026-06-01

This file tracks inline text candidates still present in the codebase so they can be migrated to locale dictionaries gradually.

Scope of this audit:
- `src/app`
- `src/components`

Excluded from this pass:
- `loading.js` files
- skeleton/loading placeholder files
- locale JSON files
- `src/app/changelog/page.js`

Current snapshot:
- Files with candidates: about 116
- Audit style: heuristic, not authoritative
- Expect false positives such as HTTP methods, headers, CSS class strings, SQL/select fragments, media/window feature strings, and internal identifiers

## Immediate Priority

These are the files most worth cleaning first because they contain obvious user-facing labels or messages.

### Auth

- `src/components/auth/AuthInfoFab.jsx`
  - `Informazioni`
  - button text currently rendered as `Info`

- `src/components/auth/AuthEntryClient.jsx`
  - `Indovinando`
  - `Indovinando Logo`

### Dashboard and profile

- `src/app/dashboard/page.js`
  - `Indovinando Logo`
  - `Supremo`
  - `Admin`
  - `Catalog and course management tools.`
  - `Strumenti gestione catalogo e corsi.`

- `src/app/dashboard/DashboardInfoFab.jsx`
  - `Versione BETA`
  - `Informazioni`

- `src/app/profilo/ProfileClient.jsx`
  - `Novizio`
  - `Curioso`
  - `Magico`
  - `Esperto`
  - `Maestro`
  - `Supremo`

- `src/app/profilo/partite/page.js`
  - `Le mie partite`
  - `Player`
  - `Giocatore`
  - `You`

- `src/app/profilo/partite/PartiteClient.jsx`
  - `All`
  - `Tutti`
  - `Live`
  - `Enoteca`
  - `You`
  - `No opponents`

### Live and table live

- `src/app/table-live/event/[slug]/TableLiveEventClient.jsx`
  - `Inserisci un nickname`
  - `Impossibile creare la partita`
  - `Errore di rete`

- `src/app/table-live/session/[sessionId]/TableLiveSessionClient.jsx`
  - `Sessione non trovata`
  - `Errore di rete`
  - `Avvio partita fallito`

- `src/app/live/session/[sessionId]/page.js`
  - `Entra nella partita`
  - `Gioco`

### Game creation and gameplay

- `src/app/game/create/GameCreateClient.jsx`
  - many inline labels and option values
  - examples: `Stato`, `Italia`, `Francia`, `Usa`, `Australia`, `Grecia`
  - this file has the largest concentration of candidates in the app slice

- `src/app/game/create-quick/GameCreateClient.jsx`
  - same pattern as above, smaller but still dense

- `src/components/game/BottleModal/index.jsx`
  - `Rosso`, `Bianco`, `Rose`, `Champagne`, `Altro`
  - `Seleziona la risposta corretta per ogni domanda.`
  - `Next` / `Avanti`

- `src/components/game/GameEditor/index.jsx`
  - `Questionario precompilato`
  - `Crea il questionario`
  - `Guida questionario`

- `src/components/game/utils/validations.js`
  - several validation messages are still hardcoded

## Second Priority

These files also contain visible copy, but are a bit less central or have more mixed signal.

### App pages

- `src/app/profilo/page.js`
  - `Profilo`

- `src/app/info/page.js`
  - `Info App`

- `src/app/dashboard/storico/page.js`
  - `Storico Partite`

- `src/app/miei-giochi/page.js`
  - `I miei giochi`

- `src/app/miei-giochi/MieiGiochiClient.jsx`
  - fallback `I miei giochi`

- `src/app/game/[id]/page.js`
  - `Gioco`

- `src/app/game/[id]/edit/page.js`
  - `Modifica Gioco`

- `src/app/game/[id]/table-live/page.js`
  - `Live Tavoli`

- `src/app/game/[id]/live/page.js`
  - `Sessione Live`

- `src/app/table-live/session/[sessionId]/leaderboard/page.js`
  - `Classifica Tavolo`
  - `Partita non trovata`
  - `Gioco`

- `src/app/live/session/[sessionId]/leaderboard/page.js`
  - `Classifica finale`
  - `Gioco`

### Course and enoteca

- `src/app/corso-vino/page.js`
  - metadata strings in both languages are inline in the page file

- `src/app/corso-vino/[levelId]/[lessonId]/LessonClient.jsx`
  - combo labels
  - sound toggle labels
  - some input hints

- `src/app/enoteca/[menuId]/play/EnotecaPlayClient.jsx`
  - combo labels
  - ordinal labels like `Prima`, `Seconda`, `Terza`

- `src/app/enoteca/[menuId]/EnotecaBridgeClient.jsx`
  - `QR degustazione`

## Admin Backlog

Admin still contains a lot of inline text and can be cleaned as a separate pass.

- `src/app/admin/page.js`
  - `Admin`

- `src/app/admin/produttori/page.js`
  - `Admin - Produttori`
  - `Cerca produttore`
  - `Produttore sconosciuto`
  - `Origine N/A`

- `src/app/admin/produttori/dettaglio/page.js`
  - `Admin - Produttore`
  - `Produttore`
  - `Cerca bottiglia`

- `src/app/admin/vini/page.js`
  - `Admin - Vini`
  - `Es. Barolo`
  - `Origine N/A`

- `src/app/admin/corsi/page.js`
  - `Admin - Corsi`

- `src/app/admin/corsi/[levelId]/[lessonId]/LessonEditorClient.jsx`
  - `Rimuovi slide`
  - `Titolo...`
  - `Scrivi la domanda...`
  - `Risposta corretta`
  - `Messaggio quando la risposta e corretta...`
  - `Messaggio quando la risposta e sbagliata...`

## Component Backlog

- `src/components/InfoModal/index.jsx`
  - `Come funziona`

- `src/components/Loader/index.jsx`
  - `Loading...`

- `src/components/TopBar/index.jsx`
  - `Dashboard`

- `src/components/ui/ProgressBar.jsx`
  - `Progress`

- `src/components/game/GamePlayView/index.jsx`
  - `Live`
  - `Single`

- `src/components/game/AutoTastingGamePreview/index.jsx`
  - `Bottles`
  - `Bottle`
  - `Question`

## API Notes

Many `src/app/api/**` files were also flagged. Those are mostly server errors or internal strings, so they should be reviewed separately from UI copy.

Common examples:
- `Missing required fields`
- `Not authenticated`
- `Unexpected error`
- `Session not found`

These are valid i18n candidates only if they are surfaced directly to the user.

## Known False Positive Patterns

Do not blindly translate these when they appear in the audit:

- HTTP methods such as `POST`
- headers such as `Content-Type`
- class strings such as `btn neutral btn-mini`
- SQL/select fragments
- `noopener,noreferrer`
- media feature strings such as `(display-mode: standalone)`
- internal status keys and event names

## Suggested Cleanup Order

1. Auth and dashboard labels
2. Profile and history pages
3. Table live and live session messages
4. Game creation flow
5. Admin area
6. API/server error strings only where surfaced to UI

## Progress

- [ ] AuthInfoFab
- [ ] Dashboard labels
- [ ] Profile ranks and partite
- [ ] Table live user messages
- [ ] Live session labels
- [ ] Game creation labels
- [ ] Admin area
- [ ] Component leftovers
- [ ] API messages review