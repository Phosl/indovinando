# AutoVision: logica semplice (OpenAI Vision -> Match catalogo -> Quiz automatico)

Questa guida spiega in modo semplice come funziona la pipeline automatica sulle etichette vino, cosi
possiamo capire bene anche come ridurre il file di import catalogo.

## 1) Obiettivo in una frase

Carichiamo una foto etichetta, OpenAI Vision estrae dati strutturati, proviamo il match sul
catalogo, e usiamo quei dati per precompilare la creazione del gioco/quiz.

## 2) Flusso completo (semplice)

1. Upload immagine bottiglia.
2. OpenAI Vision analizza l'etichetta e restituisce dati strutturati.
3. Estrazione campi base dal risultato:
   - nome vino
   - produttore
   - annata (se trovata)
4. Match con catalogo (`wine_labels` + `wine_producers` + `wine_vintages`).
5. Se match buono:
   - aumenta confidenza
   - arricchisce con regione, appellazione, tipo, vitigni, fascia prezzo, range prezzo, note.
6. Se l’utente lo chiede, parte anche il web enrichment:
   - `grapes`
   - `why_notable`
   - `short_description`
   - `body`
   - `acidity`
   - `harmony`
   - `average_price`
   - `price_min`
   - `price_max`
7. Scrive il risultato in `tasting_bottle_images` (status `recognized` o `failed`).
8. UI usa questi dati per precompilare bottiglia e suggerire domande.
9. Se l’utente conferma, il vino viene creato o aggiornato nel catalogo.

Importante: il web enrichment non e piu “sempre acceso” in modo incondizionato.

Nel flusso attuale:

- il pulsante manuale `Fai web-search` lo forza sempre
- l’analisi iniziale prova ad attivarlo automaticamente solo in alcuni casi

Regola attuale auto-enrichment:

- viene tentato se la bottiglia risulta sotto `80%` di completezza
- oppure se manca almeno un campo critico tra:
  - annata
  - paese
  - regione
  - tipo
  - primo vitigno
- la completezza oggi e calcolata su 7 campi:
  - nome vino
  - produttore
  - annata
  - paese
  - regione
  - tipo
  - primo vitigno

Questo evita il caso fastidioso in cui una bottiglia con `6 campi su 7` risulta ancora
“incompleta” per la UI ma non attiva la ricerca web automatica solo perche e gia sopra l’80%.

Questo spiega i casi in cui:

- la prima analisi batch sembra “quasi completa ma non del tutto”
- la `Fai web-search` manuale trova poi dati mancanti

Quindi oggi non e necessariamente un bug Vision: spesso e una conseguenza della soglia attuale di
auto-enrichment.

## 3) Come viene fatto il match (senza tecnicismi)

Il sistema non cerca solo "uguale identico". Fa uno score su piu segnali:

- somiglianza nome etichetta
- somiglianza produttore
- coerenza geografica (hint regione nel testo riconosciuto)
- coerenza tipo/colore (`Bianco`, `Rosso`, ecc.)
- exact label match se il nome corrisponde gia a una label canonica
- uso del `label_id` sincronizzato se la stessa bottiglia e gia stata salvata nel catalogo

Poi sceglie il candidato migliore. Se il punteggio e basso, non forza il match.

In pratica:

- score alto -> match accettato e arricchimento forte
- score basso -> resta il riconoscimento base (o fallback)

## 4) Fallback quando il riconoscimento non e perfetto

Se OpenAI non riesce a leggere bene l'etichetta:

- prova a leggere indizi da filename/path immagine
- salva warning in payload
- mette confidenza piu bassa

Quindi il flusso non si blocca: degradazione controllata, non errore totale.

## 4.1) Casi speciali tipo Idda

Per vini “brand-first” o collaborazioni ambigue, tipo `Idda`:

- il nome riconosciuto viene canonicalizzato
- suffix tipo `Sicilia DOP` possono essere rimossi prima del match
- se il vino e gia sincronizzato nel catalogo, si preferisce il `label_id` gia noto
- il pulsante `Fai web-search` resta comunque disponibile come azione manuale
- se la ricerca trova dati migliori, la UI apre una preview differenze con applicazione selettiva
  dei campi
- se non trova nulla di nuovo, mostra un esito esplicito e non aggiorna il catalogo da sola

Questo evita di ricreare varianti quasi duplicate e riduce il rischio di ricadere nel web search.

## 5) Cosa serve davvero nel catalogo per farlo funzionare bene

Per il match base, servono soprattutto:

- `wine_labels.name`
- `wine_labels.normalized_name`
- `wine_labels.producer_id`
- `wine_producers.name`
- `wine_producers.normalized_name`
- `wine_vintages.wine_label_id`
- `wine_vintages.vintage` (utile ma non sempre obbligatoria)

Per arricchimento quiz (nice-to-have):

- `wine_labels.region`
- `wine_labels.quiz_region`
- `wine_labels.appellation`
- `wine_labels.quiz_appellation`
- `wine_labels.type`
- `wine_labels.quiz_price_band`
- `wine_labels.body`
- `wine_labels.acidity`
- `wine_labels.harmonize`
- `wine_label_grapes` + `wine_grapes`
- `wine_vintages.price`, `price_min`, `price_max`, `currency`, `price_band`
- `wine_labels.notes` (per `why_notable` / `short_description`)
- `wine_sources.raw_payload` (per sorgenti e dettagli enrichment)

## 6) Come ridurre il file di import (strategia pratica)

## Regola chiave

Separare campi "core match" da campi "enrichment".

### A) Import minimo (consigliato per partire leggeri)

Tieni solo colonne necessarie al match:

- nome vino
- nome vino normalizzato
- produttore
- produttore normalizzato
- annata (opzionale ma utile)
- regione/appellazione solo se gia pulite

Vantaggi:

- file piu piccolo
- import piu veloce
- meno errori di qualita

### B) Import esteso (solo quando serve)

Aggiungi dopo (in batch separato):

- vitigni
- body/acidita/elaborate/harmonize
- price band
- metadata avanzati/sorgenti

Vantaggi:

- pipeline stabile da subito
- complessita spostata a fase 2

## 7) Piano consigliato in 2 fasi

1. Fase 1 (go-live rapido):
   - catalogo minimale per match affidabile.
2. Fase 2 (miglioramento continuo):
   - arricchimenti quiz e pricing su subset ad alta qualita.

## 8) Criterio decisionale semplice

Se una colonna non migliora direttamente uno di questi 3 punti, non metterla nel CSV iniziale:

1. accuratezza match
2. velocita import
3. robustezza pipeline

## 9) Esempio mentale

- Caso A: nome+produttore puliti, niente altri campi -> match spesso gia buono.
- Caso B: 20 colonne sporche in piu -> piu peso, ma non necessariamente piu precisione.

Meglio un catalogo piccolo ma pulito che un catalogo enorme rumoroso.

## 10) Dove si appoggia nel progetto

- API analisi: `src/app/api/auto-tasting/analyze/route.js`
- API salvataggio catalogo: `src/app/api/auto-tasting/verify-catalog/route.js`
- API applicazione differenze web: `src/app/api/auto-tasting/apply-web-diff/route.js`
- tabella risultati riconoscimento: `tasting_bottle_images`
- catalogo: `wine_labels`, `wine_producers`, `wine_vintages`, `wine_label_grapes`, `wine_grapes`

## 11) Quiz unico per tutte le bottiglie (come funziona)

Questa e la parte chiave del prodotto.

Il quiz e unico a livello gioco, non duplicato per ogni bottiglia.

In pratica:

1. Definiamo una sola lista di domande del gioco.
2. Definiamo una sola lista di opzioni per ogni domanda.
3. Per ogni bottiglia salviamo solo quale opzione e corretta per ciascuna domanda.

### Mappa mentale semplice

- `game_questions` = le domande globali del quiz
- `game_question_options` = opzioni globali delle domande
- `game_bottles` = le bottiglie della partita
- `game_bottle_answers` = chiave di correzione bottiglia per bottiglia

### Esempio rapido

Domande uniche:

- Q1: Regione?
- Q2: Vitigno principale?

Bottiglia A:

- Q1 -> Piemonte
- Q2 -> Nebbiolo

Bottiglia B:

- Q1 -> Sicilia
- Q2 -> Nero d'Avola

Le domande restano uguali per tutte le bottiglie. Cambiano solo le risposte corrette.

### Perche questa scelta e utile

- Coerenza didattica: stesso schema per tutti i vini.
- Meno duplicazione dati: non riscriviamo domande N volte.
- Editing piu veloce: cambi una domanda una sola volta.
- AutoVision piu semplice: il riconoscimento riempie dati bottiglia, poi il sistema collega la
  risposta corretta alle domande globali.

## 12) Regole quiz introdotte

- Le domande entrano solo se il dato esiste davvero.
- Il template `OpenAI` puo usare anche:
  - corpo
  - acidita
  - armonia
  - motivo di notorieta
- Le risposte narrative vengono normalizzate in categorie brevi, non in frasi lunghe.
- Esiste una domanda finale `neutra`:
  - `Che voto daresti a questo vino?`
  - senza risposta corretta
  - senza punteggio

---

Se vuoi, prossimo step posso preparare anche una versione "CSV minimo ufficiale" (con intestazioni
esatte) per avere un template unico e leggero da usare sempre.
