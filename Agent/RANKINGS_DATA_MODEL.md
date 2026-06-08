# Public Rankings - data model v1

Mini-spec tecnica per trasformare le classifiche pubbliche da `Dati iniziali` a dati reali.

## Obiettivo

Le classifiche pubbliche devono usare solo:

- vini davvero degustati
- voti reali dei partecipanti
- sessioni concluse

Non devono usare:

- catalogo vini non ancora giocato
- auto-tasting non trasformato in degustazione reale
- dati stimati senza risposte community

## Sorgenti dati attuali

### 1. `enoteca_answers` + `enoteca_tasting_sessions`

Stato: **utilizzabile**

Punti forti:

- ogni risposta resta salvata
- ogni risposta conosce `bottle_id`
- le sessioni hanno `completed_at` e `status`

Uso consigliato:

- includere solo sessioni con `completed_at IS NOT NULL`
- leggere le domande `rating` da `game_questions.kind = 'rating'`
- leggere correttezza e punti dalle risposte non neutrali

### 2. `table_live_round_answers` + `table_live_sessions`

Stato: **utilizzabile**

Punti forti:

- le risposte tengono `bottle_index`
- le risposte non vengono cancellate round dopo round
- le sessioni finiscono con `status = 'finished'`

Uso consigliato:

- includere solo sessioni `finished`
- ricostruire il `bottle_id` tramite:
  - `table_live_sessions.game_id`
  - `table_live_round_answers.bottle_index`
  - `game_bottles.bottle_order`

### 3. `live_round_answers` + `live_sessions`

Stato: **non ancora utilizzabile per ranking reali**

Blocco attuale:

- le risposte di round vengono cancellate a ogni avanzamento bottiglia
- resta il punteggio finale giocatore, ma non resta il dettaglio per vino

Conseguenza:

- il `live` classico oggi **non può contribuire** alle classifiche vino pubbliche

Per includerlo servirà:

- tabella storico tipo `live_bottle_answer_history`
- oppure snapshot round-by-round salvato prima del delete

## Identificatore vino aggregabile

Per aggregare lo stesso vino tra partite diverse serve una chiave stabile.

### Scelta v1

Usare su `game_bottles` questi campi persistiti:

- `canonical_wine_key`
- `wine_vintage_id` nullable
- `price_value` nullable
- `price_min` nullable
- `price_max` nullable
- `price_currency` nullable
- `price_band` nullable

### Regole

- se il vino arriva dal catalogo, usare `wine_vintage_id`
- se il vino non ha match catalogo, usare `canonical_wine_key`
- `canonical_wine_key` nasce da:
  - `name`
  - `producer`
  - `year`
  - normalizzati in formato slug

Esempio:

- `barolo-riserva-xyz__cantina-delle-colline__2019`

## Problema attuale da risolvere

Oggi `game_bottles` salva solo:

- nome
- produttore
- anno
- tipo

Non salva:

- riferimento stabile al catalogo
- snapshot prezzo
- fascia prezzo

Quindi:

- `migliori vini alla cieca` si può costruire
- `vini più divisivi` si può costruire
- `vini più sorprendenti` si può costruire con formula base
- `miglior rapporto qualità/prezzo` **non è affidabile** finché non persistiamo il prezzo sul vino giocato

## Metriche v1 consigliate

### 1. Migliori vini alla cieca

Formula base:

- media dei voti della domanda `rating`

Dove il voto deriva da:

- `game_questions.kind = 'rating'`
- `game_question_options.text` numerico da `1` a `10`

### 2. Miglior rapporto qualità/prezzo

Formula base:

- `avg_rating / ln(price_value + 1)`

Note:

- richiede `price_value`
- usa il prezzo persistito sul vino giocato, non il catalogo live al momento della query

### 3. Vini più sorprendenti

Formula base:

- `avg_rating - (correctness_ratio * 10)`

Interpretazione:

- vino molto apprezzato
- ma poco riconosciuto / poco indovinato nelle domande oggettive

`correctness_ratio`:

- media di `is_correct`
- solo su domande non `rating`
- solo su domande non neutrali

### 4. Vini più divisivi

Formula base:

- deviazione standard dei voti `rating`

Interpretazione:

- voti molto distanti tra loro
- vino che divide davvero la community

## Regole minime di validità

Per evitare classifiche rumorose:

- almeno `5` voti `rating` per entrare in classifica
- almeno `3` sessioni concluse distinte

Per `divisivi`:

- almeno `8` voti `rating`

Per `qualità/prezzo`:

- prezzo presente
- almeno `5` voti

## Strato dati consigliato

### Vista normalizzata eventi

Creare una vista o tabella materializzata tipo:

- `public_wine_rating_events`

Campi minimi:

- `source_flow` (`enoteca`, `table_live`, poi `live`)
- `session_id`
- `game_id`
- `bottle_id`
- `canonical_wine_key`
- `wine_vintage_id`
- `rating_value`
- `is_correct`
- `is_rating_question`
- `price_value`
- `created_at`

### Vista aggregata ranking

Creare una vista o tabella materializzata tipo:

- `public_wine_rankings`

Campi minimi:

- `canonical_wine_key`
- `wine_vintage_id`
- `display_name`
- `producer`
- `region`
- `rating_avg`
- `rating_count`
- `session_count`
- `blind_score`
- `quality_price_score`
- `surprise_score`
- `divisive_score`

## Ordine implementativo consigliato

### Step A

Persistenza dati vino dentro `game_bottles`:

- chiave canonica
- riferimento catalogo
- snapshot prezzo

### Step B

Vista normalizzata da:

- `enoteca`
- `table-live`

### Step C

Vista aggregata rankings reali

### Step D

Patch live classico per non perdere storico round

### Step E

Sostituzione graduale dei `Dati iniziali` nella pagina `/classifiche`

## Decisioni fissate

- le classifiche useranno solo vini degustati con voti reali
- `enoteca` entra subito
- `table-live` entra subito
- `live` classico entra solo dopo storico risposte
- il ranking `qualità/prezzo` richiede snapshot prezzo persistito sul vino giocato
