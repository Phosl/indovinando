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
- [ ] Classifiche pubbliche
- [ ] Widget community
- [ ] Statistiche globali

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

- [ ] Creare card riusabile `Community`
- [ ] Mostrare:
  - [ ] miglior vino alla cieca
  - [ ] vino più sorprendente
  - [ ] miglior Q/P
  - [ ] CTA `Esplora`
- [ ] Collegare il widget a `/classifiche`
- [ ] Inserire il widget in:
  - [ ] dashboard
  - [ ] landing
  - [ ] profilo
  - [ ] home

### Step 5 — statistiche globali

- [ ] Definire le formule per:
  - [ ] degustazioni totali
  - [ ] vini degustati
  - [ ] valutazioni totali
  - [ ] utenti attivi
- [ ] Definire cosa significa `utente attivo`
- [ ] Creare helper server-side unico per leggere queste metriche
- [ ] Mostrare le statistiche in:
  - [ ] landing
  - [ ] pagina classifiche
  - [ ] dashboard

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

- [ ] mappa partner reale
- [ ] filtri partner
- [ ] schede partner più ricche

---

## Prossima azione concreta

- [x] Definire e collegare le statistiche globali reali a landing, `/classifiche` e dashboard
- [x] Rifinire copy e note della pagina `/classifiche` sui dati reali
- [x] Alleggerita la dashboard: i numeri community restano su landing e `/classifiche`
