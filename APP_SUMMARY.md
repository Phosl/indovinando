# Indovinando - App Summary

## 1) Idea in one line

Indovinando is a wine tasting game platform: users create tasting games, play solo or multiplayer,
and score points by guessing bottle-related questions.

## 2) What problem it solves

- Makes wine tastings interactive and easy to run.
- Turns tasting knowledge into a game with instant scoring.
- Supports different contexts: private sessions, public events, table-based live events, and guided
  course/training modes.

## 3) Core user flow

1. Create or choose a game.
2. Configure bottles and questions (manual or automatic mode).
3. Start a play mode (solo, live, table live, enoteca, course).
4. Players answer questions per bottle.
5. Scores and rankings are computed in real time.
6. Final results are saved and shown in history/profile areas.

## 4) Main modes

### Solo / Standard game

- Single-user play.
- Useful for training and self-practice.

### Live session

- Host creates a live session.
- Players join and compete in real time.
- Final leaderboard and session history are stored.

### Table Live mode

- Host creates one event with a shareable link/QR.
- Multiple tables can run separate sessions in parallel.
- Each table has its own join code, players, score, and final ranking.
- Finished table sessions are persisted and can be shown in profile/history.

### Enoteca mode

- Fast tasting sessions oriented to wine-shop/service scenarios.

### Course mode

- Structured progression and learning path.
- Tracks progress and completion over time.

## 5) Key functions

- Game creation and editing.
- Bottle/question management.
- Automatic extraction/enrichment from uploaded bottle photos.
- Multiplayer session lifecycle: create, join, start, answer, advance, finish.
- Real-time leaderboard updates.
- Persistent history and profile match lists.
- Admin catalog and producer tools for wine data management.
- Internationalization (Italian/English).

## 6) App structure (high level)

### Frontend

- Built with Next.js (App Router) and React.
- Pages and mode-specific clients under src/app.
- Reusable UI components under src/components.
- Styling via module SCSS/CSS.

### Backend/API

- Route handlers under src/app/api.
- Dedicated endpoints for each mode (live, table-live, auto-tasting, enoteca).
- Session logic, score updates, and finish routines handled server-side.

### Data layer

- Supabase/Postgres as main persistence layer.
- Core entities include games, bottles, questions, players, sessions, answers, and results.
- Separate tables for standard live and table-live flows.

### Supporting assets

- Static assets in public.
- SQL and operational docs in Agent.
- Utility scripts in scripts.

## 7) How to explain it quickly

Indovinando is a modular wine-game platform: one core game model, multiple play modes, real-time
multiplayer features, and a catalog-backed content system. It works both as a fun tasting experience
and as a training/event tool, with persistent results and admin controls.

## 8) Current product shape

- Consumer-facing game experience.
- Event-friendly live operations (including table-based events).
- Admin/data tooling for catalog quality and scalability.
- Growing architecture designed to support new modes without changing the core concept.

## 9) Latest delivered areas

### Profiles and business

- User profile phase 1 is live with profile type, experience, preferences, newsletter, and completion
  flow.
- Business profiles now support activity details, address/geolocation, public visibility, and logo.
- Public partner pages are live, with landing-aware navigation for logged-out visitors and in-app
  back navigation for logged-in users.

### Community and rankings

- Public rankings are live on `/classifiche`.
- Community widgets and global stats are connected to landing, profile, and dashboard entry points.
- Wine rankings now read from real completed tasting data when enough data exists, with safe demo
  fallback.
- Public wine detail pages are available from the rankings flow.

### Automatic tasting

- Automatic tasting is now a 3-step flow: photo upload, bottle review, questionnaire generation.
- Users can upload bottle photos, review detected bottle cards, enrich missing data, and generate a
  tasting quiz from the reviewed list.
- Scan credits are active and visible in UI.
- Draft recovery is more resilient if the user leaves the wizard accidentally.
- Batch analysis feedback is clearer, with explicit loading progress and better delete/upload
  feedback.

### Multiplayer direction

- Multiplayer/table flow is now the main tasting start path.
- Event creation is simplified: the tasting name becomes the event title automatically, and link/QR
  are prepared earlier in the flow.
- Older `live` and `enoteca` flows are being treated as legacy hidden paths to retire gradually.

# Indovinando - Panoramica dell'App

## 1) L'idea in una frase

Indovinando è una piattaforma di giochi di degustazione del vino: gli utenti creano giochi di
degustazione, giocano in modalità singola o multiplayer e guadagnano punti rispondendo correttamente
a domande relative alle bottiglie.

## 2) Quale problema risolve

- Rende le degustazioni di vino interattive e semplici da organizzare.
- Trasforma la conoscenza enologica in un gioco con punteggi immediati.
- Supporta diversi contesti d'uso: sessioni private, eventi pubblici, eventi live con tavoli
  multipli e percorsi formativi guidati.

## 3) Flusso principale dell'utente

1. Creare o scegliere un gioco.
2. Configurare bottiglie e domande (manualmente o in modalità automatica).
3. Avviare una modalità di gioco (solo, live, table live, enoteca, corso).
4. I giocatori rispondono alle domande associate a ciascuna bottiglia.
5. Punteggi e classifiche vengono calcolati in tempo reale.
6. I risultati finali vengono salvati e mostrati nelle sezioni storico e profilo.

## 4) Modalità principali

### Modalità Solo / Gioco Standard

- Gioco per un singolo utente.
- Ideale per allenamento e pratica individuale.

### Sessione Live

- Un host crea una sessione live.
- I giocatori si uniscono e competono in tempo reale.
- Classifica finale e cronologia della sessione vengono salvate.

### Modalità Table Live

- L'host crea un evento con un link condivisibile o un QR code.
- Più tavoli possono eseguire sessioni separate in parallelo.
- Ogni tavolo dispone di un proprio codice di accesso, giocatori, punteggio e classifica finale.
- Le sessioni concluse vengono salvate e possono essere visualizzate nel profilo e nello storico.

### Modalità Enoteca

- Sessioni di degustazione rapide pensate per contesti di enoteca e servizio.

### Modalità Corso

- Percorso di apprendimento strutturato e progressivo.
- Tiene traccia dei progressi e del completamento nel tempo.

## 5) Funzionalità principali

- Creazione e modifica dei giochi.
- Gestione di bottiglie e domande.
- Estrazione automatica e arricchimento dei dati a partire da foto delle bottiglie caricate.
- Gestione completa del ciclo di vita delle sessioni multiplayer: creazione, partecipazione, avvio,
  risposta, avanzamento e conclusione.
- Aggiornamento delle classifiche in tempo reale.
- Storico persistente e liste delle partite nel profilo.
- Strumenti amministrativi e per i produttori per la gestione del catalogo vini.
- Internazionalizzazione (Italiano/Inglese).

## 6) Struttura dell'applicazione (alto livello)

### Frontend

- Sviluppato con Next.js (App Router) e React.
- Pagine e client specifici per modalità sotto src/app.
- Componenti UI riutilizzabili sotto src/components.
- Stili gestiti tramite SCSS/CSS Modules.

### Backend / API

- Route handler sotto src/app/api.
- Endpoint dedicati per ogni modalità (live, table-live, auto-tasting, enoteca).
- Logica delle sessioni, aggiornamento dei punteggi e gestione della conclusione delle partite
  eseguiti lato server.

### Livello Dati

- Supabase/Postgres come sistema principale di persistenza.
- Entità principali: giochi, bottiglie, domande, giocatori, sessioni, risposte e risultati.
- Tabelle separate per i flussi live standard e table-live.

### Asset di supporto

- Asset statici nella cartella public.
- Documentazione SQL e operativa nella cartella Agent.
- Script di utilità nella cartella scripts.

## 7) Come spiegarlo rapidamente

Indovinando è una piattaforma modulare di giochi sul vino: un unico modello di gioco, molteplici
modalità di utilizzo, funzionalità multiplayer in tempo reale e un sistema di contenuti basato su
catalogo. Funziona sia come esperienza ludica per le degustazioni sia come strumento per formazione
ed eventi, con risultati persistenti e controlli amministrativi.

## 8) Stato attuale del prodotto

- Esperienza di gioco orientata ai consumatori finali.
- Operatività live adatta agli eventi (incluse modalità con tavoli multipli).
- Strumenti amministrativi e di gestione dati per garantire qualità e scalabilità del catalogo.
- Architettura in crescita progettata per supportare nuove modalità senza modificare il concetto di
  base.
