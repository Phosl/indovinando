# 🎮 Guida Setup Live Multiplayer - Indovinando

## 📋 Sommario Architettura Live

Il sistema live multiplayer è basato su **POLLING** (non WebSocket). Ogni client si aggiorna ogni
1-1.5 secondi verificando:

- Lo stato della sessione
- Le risposte degli altri giocatori
- I risultati del round
- La fine del gioco

---

## 🗄️ **Step 1: Aggiornare Supabase**

### File da eseguire in Supabase SQL Editor:

📄 **SUPABASE_LIVE_SESSIONS.sql**

**Azioni:**

1. Vai su [Supabase Dashboard](https://app.supabase.com) → Scegli il tuo progetto
2. **SQL Editor** → **New query**
3. Copia il contenuto di `SUPABASE_LIVE_SESSIONS.sql`
4. Incolla e premi **RUN**

**Cosa crea:**

- ✅ `live_sessions` - sessioni di gioco live
- ✅ `live_players` - giocatori connessi
- ✅ `live_round_answers` - risposte dei giocatori
- ✅ `live_round_status` - stato di ogni round
- ✅ **RLS Policies** - sicurezza multi-tenant
- ✅ **Indexes** - performance

---

## 🎯 **Step 2: Flusso del Gioco Live**

### **Fase 1: Master crea sessione**

```
Dashboard → Gioco → 🎮 Gioca Live
↓
/game/[id]/live
- Genera UUID sessione
- Crea record in `live_sessions`
- Mostra LINK da condividere
- Polling aggiorna conta giocatori
```

### **Fase 2: Giocatori si connettono**

```
Ricevono link → /live/session/[sessionId]
- Scelgono Avatar (10 opzioni Apple style)
- Scelgono Nickname
- Check duplicati nickname
- Join → record in `live_players`
- Polling aspetta inizio gioco
```

### **Fase 3: Master inizia gioco**

```
Click "Inizia Gioco" → /live/session/[sessionId]/host
- Session cambia status: 'lobby' → 'playing'
- Giocatori redirected → /live/session/[sessionId]/play
```

### **Fase 4: Round Domanda-Risposta (Flusso Completo)**

**Nessuno è interrotto**: Giocatori completano le domande al proprio ritmo.

```
PLAYER: Vede slide con domanda
- Seleziona risposta
- Clicca "Controlla"
- Ottiene feedback immediato (Corretto! / Sbagliato: risposta giusta è...)
- Clicca "Continua" per prossima domanda
↓
ULTIMO GIOCATORE A FINIRE:
- Segna tutte le domande come finito
- Continua a leggere i risultati finché non va ai risultati
↓
HOST (dopo aver finito):
- Vede schermata "✅ Hai finito!"
- Lista mostra quali giocatori stanno ancora ottenendo risposte
- ASPETTA che tutti gli altri finiscano
↓
TUTTI I GIOCATORI (quando finiscono):
- Automaticamente vedono "Bottiglia completata!" (risultati)
- Mostrati: domanda, tua risposta, risposta corretta, punti
↓
HOST (vede bottone "Prossima bottiglia"):
- Clicca "Prossima bottiglia"
- Appare schermata transizione "🍾 Bottiglia N"
- Clicca "Iniziamo" per partire con nuove domande
↓
ALTRI GIOCATORI (da risultati):
- Vedono "In attesa dell'host..."
- Quando host clicca "Iniziamo", partono le nuove domande
```

**Vantaggi:** ✅ Nessun giocatore è interrotto ✅ Tutti possono rivedere i risultati a proprio tempo
✅ Host comanda il ritmo senza pressione

### **Fase 5: Classifica Finale**

```
Ultimo round completato
↓
HOST: Clicca "Termina Gioco"
- Session status: 'finished'
↓
Tutti redirected → /live/session/[sessionId]/leaderboard
- Podio (🥇🥈🥉)
- Classifica completa
- Bottone "Torna a Dashboard"
```

---

## 📁 **Struttura File Creati**

```
src/app/
├── game/[id]/
│   └── live/
│       ├── page.js (Server)
│       ├── LiveSessionClient.jsx
│       └── liveSessions.module.scss
│
├── live/session/[sessionId]/
│   ├── page.js (Player Join)
│   ├── PlayerJoinClient.jsx
│   ├── playerJoin.module.scss
│   │
│   ├── host/
│   │   ├── page.js (Server)
│   │   ├── HostLiveClient.jsx
│   │   └── hostLive.module.scss
│   │
│   ├── play/
│   │   ├── page.js (Server)
│   │   ├── PlayerLiveClient.jsx
│   │   └── playerLive.module.scss
│   │
│   └── leaderboard/
│       ├── page.js (Server)
│       ├── LeaderboardClient.jsx
│       └── leaderboard.module.scss

src/app/dashboard/
├── page.js (+ 🎮 Gioca Live button)
└── dashboard.module.scss (+ .liveButton style)

SUPABASE_LIVE_SESSIONS.sql (Migration file)
```

---

## 🔄 **Polling Intervals**

- **LiveSessionClient**: 1s - aggiorna conta giocatori
- **PlayerJoinClient**: 1s - check inizio gioco + 1.5s - aggiorna lista giocatori
- **HostLiveClient**: 1s - carica giocatori + risposte
- **PlayerLiveClient**: 1s - check stato domanda + session

---

## 🎨 **Avatar Apple Style (10 opzioni)**

```javascript
;[
  {id: 1, emoji: '👨‍💼'}, // Business man
  {id: 2, emoji: '👩‍💼'}, // Business woman
  {id: 3, emoji: '👨‍🎓'}, // Student man
  {id: 4, emoji: '👩‍🎓'}, // Student woman
  {id: 5, emoji: '👨‍🎨'}, // Artist man
  {id: 6, emoji: '👩‍🎨'}, // Artist woman
  {id: 7, emoji: '👨‍🚀'}, // Astronaut man
  {id: 8, emoji: '👩‍🚀'}, // Astronaut woman
  {id: 9, emoji: '🧑‍🍳'}, // Chef
  {id: 10, emoji: '👨‍⚕️'}, // Doctor
]
```

---

## 📊 **Sistema Punteggio**

```
Per ogni domanda:
- Risposta corretta: +10 punti
- Risposta sbagliata: +0 punti

Totale = Sum di tutti i round

Leaderboard ordinata per total_score DESC
```

---

## 🔐 **Sicurezza RLS**

| Table                | Policy                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------- |
| `live_sessions`      | Host vede/crea/aggiorna proprie sessioni; Players leggono sessione a cui sono iscritti |
| `live_players`       | Chiunque legge (per lobby); Players si aggiungono a se stessi                          |
| `live_round_answers` | Players inviano proprie risposte; Leggono dopo che round mostra risultati              |
| `live_round_status`  | Participants leggono; Host aggiorna                                                    |

---

## 🧪 **Test Manuale**

### Scenario 1: Master crea e 2 giocatori partecipano

1. **Master** → `/dashboard` → Gioco → 🎮 **Gioca Live**
2. **Copia link** → Condividi a 2 amici via WhatsApp
3. **Giocatore 1** → Clicca link → Scegli avatar + nickname → Join
4. **Giocatore 2** → Clicca link → Scegli avatar + nickname → Join
5. **Master** → Vede 2 giocatori → Click "Inizia Gioco"
6. **Entrambi redirected** a `/live/session/[id]/play`
7. **Giocatore 1** → Risponde domanda 1 → "Invia Risposta"
8. **Giocatore 2** → Risponde domanda 1 → "Invia Risposta"
9. **Master** → Vede 2/2 risposte → "Mostra Risultati"
10. **Entrambi** → Vedono correttezza + punti
11. **Master** → "Prossima Domanda"
12. **Ripeti per tutte le domande**
13. **Ultimo round** → Master click "Termina Gioco"
14. **Tutti** → Leaderboard con podio 🥇🥈🥉

---

## ⚠️ **Limitazioni Polling**

- **Latenza**: Massimo 1.5s di delay (vs WebSocket real-time)
- **Scalabilità**: Ok per 50-100 giocatori, oltre può avere lag
- **Bandwidth**: Basso (1 query DB ogni 1s vs constant connection)
- **Semplice da manutenere**: No infra WebSocket complessa

### Se vuoi WebSocket live in futuro:

- Switch a `supabase.realtime()` per sostituire polling
- No code changes needed (stessa logica)

---

## 🚀 **Prossimi Passaggi (Opzionali)**

- [ ] Share link con QR code
- [ ] Timer countdown per rispondere
- [ ] Animazione corretta/scorretta in tempo reale
- [ ] Chat tra giocatori durante la partita
- [ ] Statistiche avanzate (media punteggi, round più difficile)
- [ ] Replay della partita
- [ ] Modalità squadra (team points)
- [ ] Badge/achievements per bravi giocatori

---

## 📞 Debug Tips

Se qualcosa non funziona:

1. **Players non vedono domanda**: Check `current_question_index` in `live_sessions`
2. **Risposte non salvate**: Verifica RLS policy su `live_round_answers` per il player
3. **Classifica non mostra**: Check `total_score` aggiornato su `live_players`
4. **Link non funziona**: Assicurati `NEXT_PUBLIC_APP_URL` .env o default a `window.location.origin`
5. **Avatar non visualizza**: Check mapping tra `avatar_id` (1-10) e `APPLE_AVATARS` array

---

**Ultimo aggiornamento**: 4 Marzo 2026 **Versione**: 1.0 **Status**: ✅ Pronto per produzione
