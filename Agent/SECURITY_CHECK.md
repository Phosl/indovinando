# Security check

Data: 2026-05-30

## Scope

Controllo rapido su:

- route API in `src/app/api`
- pagine admin in `src/app/admin`
- uso di `SUPABASE_SERVICE_ROLE_KEY` e `OPENAI_API_KEY`
- presenza accidentale di secret nel repository
- flussi live anonimi e upload immagini degustazione

## Esito sintetico

Non ho trovato secret reali committati nel repository. Le chiavi sensibili risultano lette da `process.env` lato server.

Ho applicato tre hardening:

- `/api/auto-tasting/vision-health` ora richiede `super_admin`, quindi non espone piu un endpoint pubblico che chiama OpenAI Vision.
- `/api/game/save` ora verifica che l'update del gioco abbia davvero trovato un gioco dell'utente prima di cancellare e reinserire bottiglie/domande.
- le pagine `/admin/*` usano `requireSuperAdmin()` oltre al controllo gia presente nel layout admin.

## Dati e API key

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` sono pubbliche per natura.
- `SUPABASE_SERVICE_ROLE_KEY` viene usata solo in route server-side. Va tenuta solo in `.env.local` / env di deploy, mai nel client.
- `OPENAI_API_KEY` viene usata solo server-side nelle route auto tasting.
- La scansione non ha trovato pattern evidenti di chiavi API reali o JWT committati.

## Rischi rimasti da decidere

### Live game anonimo

Alcune route live sono volutamente usabili senza login per permettere ai giocatori ospiti di partecipare:

- `GET /api/live/round-answers?sessionId=...`
- `POST /api/live/round-answer`
- `GET /api/live/session/standings?sessionId=...`

Oggi `sessionId` e `playerId` funzionano di fatto come identificativi segreti. Se qualcuno li ottiene, puo leggere risultati live o inviare una risposta per quel player.

Mitigazione consigliata quando vuoi stringere:

- aggiungere un `player_token` casuale salvato al join
- richiedere `playerId + playerToken` sulle route player
- rendere `round-answers` host-only o limitarla alla fase risultati

### Risposte corrette

`POST /api/live/round-answer` restituisce `correctOptionId` dopo il submit. Serve per feedback immediato, ma e un dato sensibile durante la partita. Se vuoi una modalita piu competitiva, restituiamo solo `ok`, `isCorrect` e punteggio, oppure mostriamo la risposta corretta solo a round chiuso.

### Immagini bottiglie

Le immagini caricate per l'analisi non vengono salvate nel DB come blob. Il DB conserva eventuali URL/path e metadati. Il file resta nello storage finche non viene cancellato dalla route delete o da una policy di cleanup.

Mitigazione consigliata:

- bucket privato
- path con user id
- policy RLS/storage gia coerente con cartelle per utente
- job futuro di cleanup per immagini vecchie o non usate

## Checklist operativa

- Tenere `.env.local` fuori da git.
- Limitare la OpenAI API key all'ambiente server e a permessi coerenti col deployment.
- Verificare in Supabase che le policy RLS blocchino letture/scritture non previste sulle tabelle admin e wine catalog.
- Se una route usa `SUPABASE_SERVICE_ROLE_KEY`, fare sempre prima un controllo esplicito su utente, owner o host.
- Per i live game pubblici, trattare `sessionId` e `playerId` come bearer token finche non introduciamo `player_token`.
