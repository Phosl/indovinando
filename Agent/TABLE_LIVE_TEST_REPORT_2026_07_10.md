# Report test table-live — 10 luglio 2026

## Esito

Il flusso table-live passa i test end-to-end nelle modalità `instant` e `end` con host e guest separati.

- Smoke test API: superato.
- Lint dei file table-live modificati: superato.
- Build Next.js produzione: superata.
- Sessioni QA: cleanup automatico completato.

## Test automatico eseguito

```bash
npm run check:table-live -- degustazione-automatica-09072026-487 http://localhost:3001
```

Risultato:

```json
{
  "ok": true,
  "results": [
    {"hostLeaveClosedSession": true},
    {"mode": "instant", "rounds": 1, "players": 2},
    {"mode": "end", "rounds": 1, "players": 2}
  ]
}
```

## Scenari verificati

- Creazione sessione host.
- Join guest con codice partita.
- Link diretto senza token giocatore reindirizzato al join sicuro.
- Guest uscito volontariamente escluso dai partecipanti attivi.
- Uscita host con chiusura della sessione.
- Avvio consentito solo all'host.
- Late join rifiutato dopo l'avvio.
- Domande e opzioni validate rispetto al gioco corrente.
- Retry della stessa risposta idempotente.
- Cambio risposta dopo la conferma rifiutato con `409`.
- Avanzamento round rifiutato al guest.
- Avanzamento host protetto contro retry e chiamate concorrenti.
- Ripristino risposte dopo un nuovo caricamento dello stato.
- Classifica finale senza doppia somma dei punti dell'ultimo round.
- Cleanup delle sessioni create dal test.

## Modalità risposte

### `instant`

- Prima della risposta non viene esposta la soluzione.
- Dopo la risposta il giocatore riceve esito, punti e soluzione della sola domanda confermata.
- Le risposte degli altri giocatori non espongono scelta o correttezza.

### `end`

- Durante il questionario l'API restituisce `isCorrect: null`, `points: 0` e nessuna soluzione.
- Dopo una risposta parziale, anche un refresh mantiene nascosti esito e soluzione.
- Le soluzioni vengono rese disponibili solo dopo il completamento di tutte le domande del round.

## Correzioni emerse dai test

- QR e condivisione ora puntano al join dell'evento con codice precompilato.
- Lo stato sessione richiede un token giocatore valido.
- Il client ripristina risposte e posizione dopo refresh.
- Il riepilogo table-live usa l'endpoint classifiche corretto.
- La classifica non proietta nuovamente l'ultimo round dopo `finished`.
- Le risposte confermate non possono essere modificate.
- L'avanzamento richiede le credenziali host ed è bloccato atomicamente.
- Uscita guest e host aggiornano correttamente lo stato della sessione.

## Verifica manuale residua

Il browser visuale integrato non era disponibile durante il test. Restano quindi da confermare su iPhone/PWA reale:

- scansione del QR con un secondo dispositivo;
- dimensione e tap dei pulsanti Copia, Condividi e QR;
- ritorno da background e refresh durante una domanda;
- safe-area, modale QR e bottom panel;
- chiusura forzata della PWA senza usare il comando Esci.

L'ultimo caso non equivale all'uscita volontaria: un'app chiusa forzatamente non può sempre notificare il server. Se diventa un problema reale, il prossimo hardening consigliato è heartbeat giocatore più azione host per rimuovere un partecipante inattivo.
