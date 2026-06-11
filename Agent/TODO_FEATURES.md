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
- [ ] Classifiche utenti pubbliche
- [x] Widget community
- [x] Statistiche globali
- [x] Multiplayer semplificato come flusso principale
- [x] Wizard automatico più robusto con review bottiglie e recovery draft
- [x] Drag&drop per riordinare domande e bottiglie

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

### Step 7 — classifica utenti pubblica

- [ ] definire metrica utenti più precisi
- [ ] usare solo utenti registrati con identità stabile
- [ ] creare vista `public_user_rankings`
- [ ] mostrare top utenti in `/classifiche`
- [ ] valutare teaser dashboard / landing in un secondo step

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
- [ ] Annotare e poi rimuovere `enoteca` e `live` classici come flussi legacy nascosti

---

## Dopo questo blocco

### Monetizzazione / piani

- [ ] vendere pacchetti crediti AI una tantum
- [x] scaffold Stripe Checkout + webhook conferma pagamento
- [x] storico ricariche base nel profilo
- [x] pannello super admin con transazioni, totale e grafico
- [ ] ledger acquisti / ricariche crediti rifinito
- [x] pagina profilo con CTA `Compra crediti`
- [ ] Apple Pay / Google Pay via Stripe
- [ ] valutare poi piani `Pro / Business` solo dopo validazione uso crediti

### Evoluzione crediti AI

- [x] distinguere chiaramente costo `analisi` vs `web search`
- [ ] mostrare cronologia consumi
- [ ] introdurre acquisti reali e bonus promo separati
- [ ] valutare reset mensile solo se nasceranno piani in abbonamento

### Evoluzione partner

- [x] mappa partner reale in landing
- [ ] filtri partner
- [ ] schede partner più ricche
- [ ] affinare marker / UX mappa partner

---

## Prossima azione concreta

- [ ] Definire pack crediti (`10 / 30 / 100` o simili)
- [ ] Creare schema DB per ordini + ledger crediti
- [ ] Implementare checkout Stripe in test mode
- [ ] Implementare webhook server-side che accredita i crediti
- [ ] Aggiungere storico ricariche nel profilo

## Next Up
- [ ] affinare copy e naming dei flussi legacy nascosti
