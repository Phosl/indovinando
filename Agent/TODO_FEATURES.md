# TODO Features

Roadmap operativa da seguire step by step.

## Regole di lavoro

- Riutilizzare sempre prima i componenti esistenti.
- Usare solo colori via variabili CSS.
- Aggiornare sempre `DATABASE.md` e `APP_SUMMARY.md` quando cambia qualcosa di strutturale.
- Le classifiche devono partire solo da vini davvero degustati con punteggi reali.
- Procedere per step piccoli, verificabili e indipendenti.

## Stato attuale

- [x] Profili utente fase 1
- [x] Profili business base
- [x] Scheda partner pubblica
- [x] Branding degustazioni
- [x] Landing partner + burger menu pubblico
- [x] Crediti analisi AI v1
- [x] Classifiche pubbliche
- [x] Widget community
- [x] Statistiche globali
- [x] Multiplayer semplificato come flusso principale

---

## Blocco attuale: classifiche + community + statistiche

### Step 1 — modello dati classifiche vino

- [x] Mappare le tabelle che contengono voti reali delle degustazioni
- [x] Definire quali flussi contribuiscono alle classifiche (`enoteca`, `live`, `table-live`)
- [x] Definire un identificatore vino aggregabile stabile
- [x] Definire le metriche minime:
  - [x] miglior vino alla cieca
  - [x] miglior rapporto qualità/prezzo
  - [x] vino più sorprendente
  - [x] vino più divisivo
- [x] Definire regole minime di validità (es. numero minimo di voti)
- [x] Preparare mini-spec tecnica prima di costruire la UI

Riferimento:

- `Agent/RANKINGS_DATA_MODEL.md`

### Step 2 — seed/demo coerente

- [x] Preparare dataset iniziale coerente con il modello classifiche
- [x] Aggiungere badge `Dati iniziali` dove usiamo dati non ancora reali
- [x] Centralizzare la sorgente dati con fallback demo -> reale

### Step 3 — pagina pubblica classifiche

- [x] Creare route pubblica `/classifiche`
- [x] Aggiungere accesso da landing
- [x] Aggiungere accesso da dashboard
- [x] Aggiungere accesso da menu
- [x] Costruire header pagina con intro + statistiche globali
- [x] Costruire sezioni ranking:
  - [x] migliori vini alla cieca
  - [x] miglior rapporto qualità/prezzo
  - [x] vini più sorprendenti
  - [x] vini più divisivi

### Step 4 — widget community

- [x] Creare card riusabile `Community`
- [x] Mostrare:
  - [x] miglior vino alla cieca
  - [x] vino più sorprendente
  - [x] miglior Q/P
  - [x] CTA `Esplora`
- [x] Collegare il widget a `/classifiche`
- [x] Inserire il widget in:
  - [x] dashboard
  - [x] landing
  - [x] profilo
  - [ ] home
- [x] trasformare il widget in 3 card più leggibili

### Step 5 — statistiche globali

- [x] Definire le formule per:
  - [x] degustazioni totali
  - [x] vini analizzati da Indovinando AI
  - [x] valutazioni totali
  - [x] utenti attivi
- [x] Definire cosa significa `utente attivo`
- [x] Creare helper server-side unico per leggere queste metriche
- [x] Mostrare le statistiche in:
  - [x] landing
  - [x] pagina classifiche
  - [ ] dashboard
- [x] correggere il conteggio pubblico dei `vini analizzati da Indovinando AI`

### Step 6 — scheda vino pubblica

- [x] creare una scheda vino pubblica navigabile da `/classifiche`
- [x] rendere cliccabili le card ranking anche con fallback iniziale
- [x] aggiungere metriche e posizionamenti del vino
- [ ] arricchire la scheda con immagine bottiglia dal catalogo
- [ ] valutare vini simili / correlati

---

## Blocco attuale: semplificazione flussi di gioco

### Step 1 — multiplayer come flusso principale

- [x] Nascondere `Live` dalla pagina `Scegli modalità`
- [x] Rendere `Avvia una partita` un accesso diretto al multiplayer
- [x] Trasformare `/game/[id]/mode` in redirect verso multiplayer
- [x] Nascondere la bottom nav nella pagina multiplayer setup
- [x] Togliere lo step manuale `Titolo evento`
- [x] Usare il nome degustazione come titolo evento automatico
- [x] Creare automaticamente link e QR se l'evento non esiste
- [x] Rendere più robusta la stampa QR

### Step 2 — convergenza dei nomi e dei percorsi

- [ ] Ripulire i riferimenti residui a `Enoteca` dove il flusso è ormai “gioco solo”
- [ ] Valutare se tenere ancora il flusso solo come route nascosta o dismetterlo
- [ ] Riallineare eventuali back/entry secondari ancora pensati per `mode`

---

## Dopo questo blocco

### Monetizzazione / piani

- [ ] Stripe
- [ ] piani `Free / Pro / Business`
- [ ] limiti scansioni AI per piano
- [ ] gestione abbonamenti

### Evoluzione crediti AI

- [ ] distinguere chiaramente costo `analisi` vs `web search`
- [ ] mostrare cronologia consumi
- [ ] prevedere ricariche / bonus / reset mensile

### Evoluzione partner

- [x] mappa partner reale in landing
- [ ] filtri partner
- [ ] schede partner più ricche
- [ ] affinare marker / UX mappa partner

---

## Prossima azione concreta

- [ ] Ripulire naming e copy del flusso `gioco solo`
- [ ] Decidere se tenere o dismettere il percorso solo separato
- [ ] Valutare se la home/profilo devono mostrare il widget community anche come teaser leggero
- [ ] Valutare se aggiungere la scheda vino pubblica anche da altri punti oltre a `/classifiche`

## Next Up
- [ ] riordinare domande e bottiglie con drag&drop
