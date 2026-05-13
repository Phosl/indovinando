# 🧊 ICEBUCKET — Migliorie future

Idee buone ma non prioritarie. Da riprendere quando c'è tempo.

---

## 📱 PWA / App

- [ ] **Offline: Corso Vino** — i JSON dei corsi sono statici in `/public/corsi/`, con cache-first nel SW si può giocare completamente offline
- [ ] **Offline: shell app** — cachare TopBar, CSS, font per caricamento istantaneo anche senza rete
- [ ] **Pagina "Sei offline"** — invece del browser error, mostrare una schermata brandizzata con messaggio gentile
- [ ] **Splash screen animato** — logo/icona animata durante il caricamento iniziale instead della schermata nera
- [ ] **Background Sync** — salvare risposte offline e sincronizzare quando si torna online
- [ ] **Notifiche Push** — avvisare giocatori di partite live in avvio (richiede backend Supabase Push)
- [ ] **Share Target** — condividere un link direttamente a Indovinando da altre app
- [ ] **Badging API** — mostrare un badge sull'icona home quando c'è una partita in attesa

---

## 🎮 Gioco Live

- [ ] **Chat/Emoji reactions** — giocatori possono mandare emoji durante il gioco
- [ ] **Spectator mode** — seguire una partita senza giocare
- [ ] **Timer per domanda** — opzione di aggiungere un countdown visibile ai giocatori
- [ ] **Modalità turni** — ogni giocatore risponde a turno (alternativa al live simultaneo)
- [ ] **Rematch** — pulsante "Rivincita" a fine partita per ricreare stessa sessione

---

## 🍷 Enoteca

- [ ] **Modalità offline** — giocare senza account e senza salvare, per demo/test
- [ ] **Filtri per regione/vitigno** — selezionare vini per categoria
- [ ] **Storico degustazioni** — vedere le sessioni passate con dettaglio bottiglie

---

## 🎓 Corso Vino

- [ ] **Certificati** — PDF/immagine scaricabile al completamento di un livello
- [ ] **Streaks** — mantenere la serie di giorni consecutivi di studio
- [ ] **Ripasso intelligente** — riproporre domande sbagliate nelle sessioni successive

---

## 🛠️ Tech / Dev

- [ ] **Skeleton sulle transizioni client-side** — attualmente gli skeleton appaiono solo su navigazioni server (loading.js), non su click veloci già cached
- [ ] **Error boundary globale** — pagina di errore brandizzata invece della crash screen Next.js
- [ ] **Analytics** — tracciare eventi di gioco (risposta, combo, completamento) con Plausible o simile
- [ ] **Rate limiting API** — protezione anti-spam sulle route /api
- [ ] **Test E2E** — Playwright per flussi critici (login → crea partita → gioca)
