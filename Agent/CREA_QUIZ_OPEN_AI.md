Torniamo alla creazione automatica della degustazione.

Il flusso deve usare OpenAI Vision per analizzare la foto della bottiglia, fare match sul catalogo
e recuperare i dati utili per il quiz.

Google Vision non deve piu comparire nella pipeline runtime.

Il catalogo non va piu trattato come opzionale “futuro”: adesso e una fonte primaria del flusso.
La feature deve comunque funzionare in modo progressivo:

1. estrae i dati dalla foto
2. prova il match sul catalogo
3. opzionalmente fa web enrichment solo se richiesto
4. permette conferma/correzione manuale
5. salva o aggiorna il vino nel catalogo
6. genera il quiz con i dati strutturati delle bottiglie confermate

OpenAI deve fare due cose:

1. Analizzare la foto della bottiglia o dell’etichetta.
2. Restituire dati strutturati del vino.

Prompt da usare per OpenAI:

"Analizza questa foto di una bottiglia di vino o della sua etichetta. Estrai solo le informazioni
visibili o altamente probabili. Non inventare dati. Se un dato non è leggibile, usa null. Rispondi
esclusivamente in JSON valido secondo lo schema richiesto.

## Pipeline runtime attuale

### 1) Analisi base

`POST /api/auto-tasting/analyze`

Flusso normale:

- upload foto -> record in `tasting_bottle_images`
- `runOpenAIVisionRecognition`
- `extractFromOpenAIRecognition`
- `enrichWithWineCatalog`
- scrittura risultato in `tasting_bottle_images`

Il flusso normale **non** fa web search in automatico.

### 2) Web enrichment opzionale

Il web enrichment e disponibile solo se:

- `OPENAI_WEB_ENRICHMENT_ENABLED=true`
- e il client passa esplicitamente `useWebEnrichment: true`

Tipicamente succede con il pulsante UI `Fai web-search`.

Nota pratica:

- `Fai web-search` e una azione manuale esplicita
- se trova differenze utili, apre una preview con confronto `attuale vs proposto`
- l’utente sceglie quali campi aggiornare
- se non trova differenze visibili, la UI mostra un esito chiaro invece di aggiornare in modo
  opaco
- anche una ricerca senza differenze puo comunque consumare token `web`

Serve a recuperare o completare:

- `grapes`
- `short_description`
- `why_notable`
- `body`
- `acidity`
- `harmony`
- `average_price`
- `price_min`
- `price_max`
- `currency`
- `price_source`
- `price_confidence`

Se il vino e gia sincronizzato nel catalogo, il flusso normale deve preferire il catalogo e non
rilanciare una nuova ricerca web.

### 3) Conferma e salvataggio nel catalogo

`POST /api/auto-tasting/verify-catalog`

Quando l’utente conferma:

- crea o aggiorna `wine_producers`
- crea o aggiorna `wine_labels`
- crea o aggiorna `wine_vintages`
- sincronizza `wine_grapes` / `wine_label_grapes`
- salva le sorgenti in `wine_sources`
- marca il record immagine come verificato/sincronizzato nel `recognized_payload`

Le note narrative non hanno ancora colonne dedicate separate: vengono salvate in:

- `wine_labels.notes`
- `wine_sources.raw_payload`

con campi tipo:

- `why_notable`
- `short_description`
- `web_enrichment.sources`
- `price_min`
- `price_max`
- `average_price`

## Regola di generazione quiz

Il quiz non deve inventare dati.

Quindi:

- una domanda entra solo se tutte le bottiglie richieste hanno il dato
- per una sola bottiglia il template puo comunque generare domande, usando opzioni template
- le domande “narrative” devono essere normalizzate in risposte brevi e confrontabili
- la domanda finale di voto e una domanda `neutra`, senza risposta corretta e senza punteggio

## Dati consigliati da avere nel catalogo

Per generare quiz buoni, il catalogo dovrebbe contenere il piu possibile:

- `country`
- `region`
- `quiz_region`
- `appellation`
- `quiz_appellation`
- `type`
- `grapes`
- `price`
- `price_min`
- `price_max`
- `price_band`
- `body`
- `acidity`
- `harmonize`
- `why_notable`
- `short_description`

## UX reale attuale

1. L’utente scatta o carica la foto della bottiglia.
2. Il sistema analizza la foto con OpenAI Vision.
3. Il sistema prova il match sul catalogo.
4. Se serve, l’utente puo forzare `Fai web-search`.
5. Il sistema mostra scheda bottiglia con:
   - badge sorgente/stato
   - dati quiz rapido
   - valori usati nel quiz
   - caratteristiche
   - narrative web/catalogo
   - fonti web
   - token/costo stimato per bottiglia
6. L’utente puo fare `Salva nel catalogo`.
7. Quando ha confermato le bottiglie, apre l’anteprima quiz e sceglie:
   - `Template standard`
   - `Template OpenAI`
8. Salva il gioco generato.

## UX note aggiornate

- Errori e conferme principali del flusso create/auto-tasting usano toast in-app, non alert
  browser.
- I toast ora appaiono in alto, cosi si leggono subito anche su mobile.
- La scheda bottiglia e stata rifinita come “wine sheet”: facts in chip, box sezione piu chiari,
  badge/token/costo piu leggibili, e azione elimina spostata sopra la foto.

## Nota i18n

I valori strutturati del quiz devono seguire la lingua UI:

- `Italy` / `Italia`
- `White` / `Bianco`
- `Sicily` / `Sicilia`

Le narrative (`why_notable`, `short_description`) oggi sono localizzate in presentazione lato UI,
ma non sono ancora persistite come colonne separate multilingua nel DB.

## Dopo la risposta OpenAI

- usare i dati per arricchire il catalogo
- se la confidence di OpenAI o la confidence del match è bassa, mostrare conferma manuale
- non pubblicare automaticamente se il match è incerto

Flusso UX:

1. L’utente scatta o carica la foto della bottiglia.
2. Il sistema analizza la foto con OpenAI Vision.
3. Il sistema mostra il risultato trovato o una bozza dei dati estratti.
4. L’utente conferma o corregge.
5. Il vino confermato viene aggiunto alla degustazione corrente.
6. L’utente ripete il processo per le altre bottiglie.
7. Quando tutti i vini sono stati confermati, l’utente clicca “Genera quiz”.
8. Il sistema genera il quiz usando solo i vini confermati.

Se un vino non esiste ancora nel catalogo, il quiz può usare i dati confermati manualmente
dall’utente, ma deve evitare di inventare informazioni non disponibili. Il quiz deve essere
modificabile prima del salvataggio definitivo.

## Obiettivo finale

Foto bottiglia → analisi OpenAI Vision → match catalogo/database → conferma manuale → aggiunta alla
degustazione → generazione quiz automatico → revisione e salvataggio.
