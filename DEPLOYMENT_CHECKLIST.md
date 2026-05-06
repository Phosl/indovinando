# ✅ CHECKLIST SETUP SUPABASE - LIVE MULTIPLAYER

## 1️⃣ MIGRAZIONE DATABASE

### Step 1: Aprire Supabase SQL Editor

- [ ] Accedi a [https://app.supabase.com](https://app.supabase.com)
- [ ] Seleziona il progetto "indovinando"
- [ ] Vai a **SQL Editor** dal menu sinistro
- [ ] Clicca **New Query**

### Step 2: Eseguire SQL Migration

- [ ] Apri il file **SUPABASE_LIVE_SESSIONS.sql** nel tuo editor
- [ ] Copia **TUTTO il contenuto**
- [ ] Incolla nella query Supabase
- [ ] Clicca **RUN** (in alto a destra)

### Cosa verificare dopo RUN:

- [ ] ✅ Tabella `live_sessions` creata
- [ ] ✅ Tabella `live_players` creata
- [ ] ✅ Tabella `live_round_answers` creata
- [ ] ✅ Tabella `live_round_status` creata
- [ ] ✅ RLS policies applicate
- [ ] ✅ Indexes creati

Se vedi errori, controlla:

- Foreign keys correct (game_id, user_id, ecc.)
- `auth.users` table esiste
- `games` table esiste da prima

---

## 2️⃣ VERIFICA IN SUPABASE DASHBOARD

### Controlla Tabelle

- [ ] Vai a **Table Editor**
- [ ] Verifica che vedi:
  - `live_sessions`
  - `live_players`
  - `live_round_answers`
  - `live_round_status`

### Controlla RLS Policies

- [ ] Clicca su `live_sessions` → **Authentication**
- [ ] Verifica policies:
  - ✅ "Host can view own live sessions"
  - ✅ "Host can create live sessions for own games"
  - ✅ "Host can update own session status"
  - ✅ "Players can view session they joined"

Ripeti per altre tabelle.

### Controlla Indexes

- [ ] Va a `live_sessions` → **Indexes**
- [ ] Verifica:
  - `idx_live_sessions_host`
  - `idx_live_sessions_game`
  - `idx_live_sessions_status`

---

## 3️⃣ TEST LOCALE

### Start Dev Server

```bash
cd /Users/filippodegennaro/siti/indovinando
npm run dev
```

### Test Scenario: Master + 2 Giocatori

#### 1. Master: Crea Game

- [ ] Accedi a http://localhost:3000
- [ ] Login / Signup
- [ ] Dashboard → "+ Crea Nuovo Gioco"
- [ ] Step 1: Nome: "Test Wine Game"
- [ ] Step 2: Aggiungi 2 domande (Es: "Quale è il vitigno?")
- [ ] Step 3: Aggiungi 2 bottiglie, mappa risposte
- [ ] Publish

#### 2. Master: Avvia Sessione Live

- [ ] Dashboard → Game "Test Wine Game"
- [ ] Click "🎮 Gioca Live"
- [ ] **COPIA IL LINK**
- [ ] Vedi: Link box + bottone "Inizia Gioco" (disabilitato)

#### 3. Giocatore 1: Accede

- [ ] Apri **nuova finestra privata/incognito**
- [ ] Incolla link
- [ ] Scegli avatar #1 (👨‍💼)
- [ ] Nickname: "Marco"
- [ ] Click "Accedi al Gioco"
- [ ] Aspetta nel lobby

#### 4. Giocatore 2: Accede

- [ ] Apri **altro browser/finestra privata**
- [ ] Incolla link
- [ ] Scegli avatar #2 (👩‍💼)
- [ ] Nickname: "Giulia"
- [ ] Click "Accedi al Gioco"
- [ ] Aspetta nel lobby

#### 5. Master: Avvia Gioco

- [ ] Nella finestra master vedi: "2 giocatori"
- [ ] Click "Inizia Gioco"
- [ ] Dovrebbe reindirizzare a `/live/session/[id]/host`

#### 6. Giocatori: Vedono Domanda

- [ ] Sia Marco che Giulia vedono:
  - Numero domanda (1/2)
  - Nome bottiglia
  - Testo domanda
  - 2-4 bottoni risposta

#### 7. Giocatori: Rispondono

- [ ] Marco: Clicca un'opzione, click "Invia Risposta"
- [ ] Giulia: Clicca un'opzione, click "Invia Risposta"
- [ ] Entrambi vedono "✓ Risposta Inviata"

#### 8. Master: Vede Risposte

- [ ] Master Dashboard mostra: "Risposte ricevute: 2/2"
- [ ] Vede card per Marco + Giulia con ✓ (answered)

#### 9. Master: Mostra Risultati

- [ ] Click "Mostra Risultati"
- [ ] Cambio a vista "Showing Results"

#### 10. Giocatori: Vedono Risultati

- [ ] Marco: Vede sua risposta + ✓ o ✗ + punti
- [ ] Giulia: Vede sua risposta + ✓ o ✗ + punti
- [ ] Vedi "Top Giocatori" interim

#### 11. Master: Prossima Domanda

- [ ] Click "Prossima Domanda" (Domanda 2)
- [ ] Giocatori redirected automaticamente
- [ ] Vedono domanda 2

#### 12. Ripeti per Domanda 2

- [ ] Marco e Giulia rispondono
- [ ] Master mostra risultati
- [ ] Master clicca "Termina Gioco" (è ultimo)

#### 13. Leaderboard Finale

- [ ] Tutti redirected a `/live/session/[id]/leaderboard`
- [ ] Vedono:
  - Podio con 🥇🥈 (top 2)
  - Punteggi totali
  - Bottone "Torna a Dashboard"
- [ ] Click "Torna a Dashboard"

---

## 4️⃣ DEBUG CHECKLIST

Se qualcosa non funziona:

### Link Share non funziona

- [ ] Controlla che `NEXT_PUBLIC_APP_URL` sia set in `.env.local`
- [ ] Oppure usa `window.location.origin`
- [ ] Test: Copia link da browser, incollalo in nuova finestra

### Giocatori non vedono inizio gioco

- [ ] Controlla `live_sessions.status` in Supabase
- [ ] Dovrebbe essere 'playing' dopo click "Inizia Gioco"
- [ ] Verifica polling in PlayerJoinClient (ogni 1s)

### Risposte non salvate

- [ ] Controlla `live_round_answers` table in Supabase
- [ ] Dovrebbe avere righe dopo che giocatore clicca "Invia"
- [ ] Verifica RLS policy: player_id deve matchare live_players.id

### Punteggi a 0

- [ ] Controlla `game_bottle_answers` table
- [ ] Verifica che correct answers siano mappate
- [ ] Verifica `total_score` aggiornato su live_players

### Avatar non mostra

- [ ] Controlla che avatar_id sia 1-10
- [ ] Verifica APPLE_AVATARS array in componenti

---

## 5️⃣ PRIMA DI DEPLOY

### Code Quality

- [ ] `npm run lint` passa
- [ ] `npm run build` passa
- [ ] No console errors in dev tools

### Testing

- [ ] ✅ Game creation works
- [ ] ✅ Live session link shares
- [ ] ✅ Player joins with nickname
- [ ] ✅ Responses save
- [ ] ✅ Scoring calculates
- [ ] ✅ Leaderboard shows
- [ ] ✅ Return to dashboard works

### Security Check

- [ ] Auth required on protected routes
- [ ] Only game owner can host
- [ ] Players can't modify other players' data
- [ ] RLS policies enforced

---

## 6️⃣ DEPLOY A VERCEL

```bash
# 1. Commit changes
git add .
git commit -m "feat: add live multiplayer system with polling"

# 2. Push to main
git push origin main

# 3. Vercel auto-deploys (or manual):
vercel

# 4. Configure env vars in Vercel Dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_APP_URL (prod URL)
```

---

## 7️⃣ POST-DEPLOYMENT VERIFICATION

### Test in Production

- [ ] Accedi con prod URL
- [ ] Create game
- [ ] Generate live session
- [ ] Test link sharing
- [ ] Complete full game flow

### Monitor Errors

- [ ] Check Vercel logs for errors
- [ ] Check Supabase queries for slow operations
- [ ] Monitor RLS policy enforcement

---

## 📋 NOTES

- **Polling Interval**: 1-1.5 secondi (configurable in componenti)
- **Max Players**: ~50-100 prima di lag notevole
- **Avatar Count**: 10 opzioni (modifica se necessario)
- **Points per Answer**: 10 (modifica se necessario)
- **Session Timeout**: Nessuno attualmente (aggiungi se vuoi)

---

## 🎯 SUCCESS CRITERIA

Tutte le seguenti devono essere TRUE per production:

- [ ] Master può creare e publishare giochi
- [ ] Master può generare link di sessione live
- [ ] Giocatori possono joinare con link
- [ ] Giocatori scelgono avatar unico + nickname
- [ ] Sistema controlla nickname duplicati
- [ ] Master vede lista giocatori aggiornata
- [ ] Master può iniziare quiz
- [ ] Giocatori vedono domande + bottoni risposta
- [ ] Risposte sono salvate in Supabase
- [ ] Master vede conteggio risposte
- [ ] Master può mostrare risultati
- [ ] Sistema calcola correct/incorrect
- [ ] Giocatori vedono punti guadagnati
- [ ] Classifica interim mostra top 3
- [ ] Master può avanzare domande
- [ ] Ultimo round termina gioco automaticamente
- [ ] Leaderboard finale mostra podio + ranking
- [ ] Bottone "Torna a Dashboard" funziona
- [ ] Build passa senza errori
- [ ] Deployment su Vercel success

---

**Data**: 4 Marzo 2026 **Version**: 1.0 **Status**: Ready for Production ✅
