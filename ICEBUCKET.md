# 🧊 ICEBUCKET — Migliorie future

Idee buone ma non prioritarie. Da riprendere quando c'è tempo.

---

## 📱 PWA / App

- [ ] **Offline: Corso Vino** — i JSON dei corsi sono statici in `/public/corsi/`, con cache-first
      nel SW si può giocare completamente offline
- [ ] **Offline: shell app** — cachare TopBar, CSS, font per caricamento istantaneo anche senza rete
- [ ] **Pagina "Sei offline"** — invece del browser error, mostrare una schermata brandizzata con
      messaggio gentile
- [x] **Splash screen animato** — logo/icona animata durante il caricamento iniziale instead della
      schermata nera
- [ ] **Background Sync** — salvare risposte offline e sincronizzare quando si torna online
- [ ] **Notifiche Push** — avvisare giocatori di partite live in avvio (richiede backend Supabase
      Push)
- [ ] **Share Target** — condividere un link direttamente a Indovinando da altre app
- [ ] **Badging API** — mostrare un badge sull'icona home quando c'è una partita in attesa

---

## 🎮 Gioco Live

- [ ] **Live offline (modalità locale)** — fallback senza server/realtime per partite locali su un
      solo dispositivo, con sincronizzazione risultati quando torna la rete
- [ ] **Spectator mode** — seguire una partita senza giocare
- [ ] **Timer per domanda** — opzione di aggiungere un countdown visibile ai giocatori

---

## 🍷 Enoteca

- [ ] **Modalità offline** — giocare senza account e senza salvare, per demo/test
- [ ] **Enoteca offline con sync** — salvare sessioni localmente offline e inviarle a Supabase
      quando la connessione ritorna
- [ ] **Filtri per regione/vitigno** — selezionare vini per categoria
- [ ] **Storico degustazioni** — vedere le sessioni passate con dettaglio bottiglie

---

## 🎓 Corso Vino

- [ ] **Navigazione offline completa** — rendere `/corso-vino` e `/corso-vino/[levelId]` client-only
      (o prerender statico) per aprire i corsi anche offline senza visita precedente
- [ ] **Certificati** — PDF/immagine scaricabile al completamento di un livello
- [ ] **Streaks** — mantenere la serie di giorni consecutivi di studio
- [ ] **Ripasso intelligente** — riproporre domande sbagliate nelle sessioni successive

---

## 🛠️ Tech / Dev

- [ ] **Skeleton sulle transizioni client-side** — attualmente gli skeleton appaiono solo su
      navigazioni server (loading.js), non su click veloci già cached
- [ ] **Error boundary globale** — pagina di errore brandizzata invece della crash screen Next.js
- [ ] **Analytics** — tracciare eventi di gioco (risposta, combo, completamento) con Plausible o
      simile
- [ ] **Rate limiting API** — protezione anti-spam sulle route /api
- [ ] **Test E2E** — Playwright per flussi critici (login → crea partita → gioca)

- [ ] **IDEA** — potremmo salvare una versione leggera, ma non so se ha senso.. l utente nel profilo
      puo tenere traccia di tutte le bottiglie che inserisce se ha determinati parametri, es se
      inserisco bottiglia ( anche manualmente. ) la bottiglie viene salvata, magari se i dati
      combaciano con il template standard li machiamo e salvimo anche quelli, non so se mi sono
      spiegato

- [x] **DB VINI - WINE CATALOG** Sistemare Vini con piu uvaggi... es idda bianco è Carricante ma ho
      Nerello Mascalese, Carricante, Nerello Cappuccio cosi poi mi da associazione sbagliata. Valori
      usati nel quiz: Italy | Sicilia | Nerello Mascalese | - Forse script di verifica del solo
      uvaggio, anno, etc.. Lista vini, prende nome e produttore, aggiunge uvaggio come opzionale
      prendendo i primi 3/5 risultati di google, aprire pagina e prendere valori

- [ ] **Partita con codice** - Admin crea QR code utenti vanno su QR code, utente vede schermata con
      Numero 1545, altri utenti partecipano a 1545. Parte partita Live
      Specifica step 1: `LIVE_TABLE_GROUPS_STEP1.md`
