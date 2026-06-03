# AutoVision: logica semplice (OCR -> Match catalogo -> Creazione quiz)

Questa guida spiega in modo semplice come funziona la pipeline automatica sulle etichette vino, cosi
possiamo capire bene anche come ridurre il file di import catalogo.

## 1) Obiettivo in una frase

Carichiamo una foto etichetta, estraiamo testo, troviamo il vino piu probabile nel catalogo, e
usiamo quei dati per precompilare la creazione del gioco/quiz.

## 2) Flusso completo (semplice)

1. Upload immagine bottiglia.
2. OCR (Google Vision) prova a leggere testo da etichetta.
3. Estrazione campi base dal testo:
   - nome vino
   - produttore
   - annata (se trovata)
4. Match con catalogo (`wine_labels` + `wine_producers` + `wine_vintages`).
5. Se match buono:
   - aumenta confidenza
   - arricchisce con regione, appellazione, tipo, vitigni, fascia prezzo.
6. Scrive il risultato in `tasting_bottle_images` (status `recognized` o `failed`).
7. UI usa questi dati per precompilare bottiglia e suggerire domande.

## 3) Come viene fatto il match (senza tecnicismi)

Il sistema non cerca solo "uguale identico". Fa uno score su piu segnali:

- somiglianza nome etichetta
- somiglianza produttore
- coerenza geografica (hint regione nel testo OCR)

Poi sceglie il candidato migliore. Se il punteggio e basso, non forza il match.

In pratica:

- score alto -> match accettato e arricchimento forte
- score basso -> resta il riconoscimento base (o fallback)

## 4) Fallback quando OCR non e perfetto

Se OCR fallisce o e sporco:

- prova a leggere indizi da filename/path immagine
- salva warning in payload
- mette confidenza piu bassa

Quindi il flusso non si blocca: degradazione controllata, non errore totale.

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
- `wine_label_grapes` + `wine_grapes`
- `wine_vintages.price`, `currency`, `price_band`

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

---

Se vuoi, prossimo step posso preparare anche una versione "CSV minimo ufficiale" (con intestazioni
esatte) per avere un template unico e leggero da usare sempre.
