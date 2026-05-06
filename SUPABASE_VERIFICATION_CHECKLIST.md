# ✅ Supabase Integration Checklist

## Fase 1: Setup Iniziale

- [ ] Account Supabase creato
- [ ] Nuovo progetto creato
- [ ] Region selezionato (consigliato: Europe)
- [ ] Database creato automaticamente

## Fase 2: Credenziali

- [ ] Presi i valori da Settings → API
- [ ] `Project URL` copiato
- [ ] `anon public key` copiato
- [ ] Messi in `.env.local`
  ```
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  ```
- [ ] `.env.local` NON è stato committato (.gitignore controllato)

## Fase 3: Database Tables

- [ ] SQL di `DATABASE_SETUP.sql` copiato
- [ ] Eseguito in Supabase SQL Editor
- [ ] ✅ Tutte le tabelle create:
  - [ ] `games`
  - [ ] `game_questions`
  - [ ] `game_question_options`
  - [ ] `game_bottles`
  - [ ] `game_bottle_answers`
- [ ] Indici creati per performance
- [ ] Row Level Security (RLS) policies applicate

## Fase 4: Autenticazione

- [ ] Provider "Email" abilitato
- [ ] (Opzionale) Provider GitHub abilitato
- [ ] (Opzionale) Provider Google abilitato
- [ ] Redirect URLs configurati

## Fase 5: Test

- [ ] Dev server avviato: `npm run dev`
- [ ] Vai su `http://localhost:3000`
- [ ] Prova login/registrazione
- [ ] Vai a dashboard
- [ ] Clicca "Crea Nuovo Gioco"
- [ ] Vedi l'onboarding
- [ ] Crea un gioco di test:
  - [ ] Inserisci nome gioco
  - [ ] Aggiungi almeno 2 domande
  - [ ] Salva questionario
  - [ ] Aggiungi una bottiglia
  - [ ] Compila tutti i campi
  - [ ] Clicca "Pubblica Gioco"
- [ ] ✅ Gioco salvato su Supabase

## Fase 6: Verifica Database

1. Vai a Supabase → **Table Editor**
2. Controlla che i dati siano presenti:
   - [ ] Tabella `games` ha 1 riga
   - [ ] Tabella `game_questions` ha righe (le tue domande)
   - [ ] Tabella `game_bottles` ha 1 riga
   - [ ] Tabella `game_bottle_answers` ha righe

## Fase 7: Test Avanzati

- [ ] Crea un secondo gioco
- [ ] Modifica il primo gioco (aggiungi/elimina domande)
- [ ] Verifica che le risposte delle bottiglie si riallineino
- [ ] Elimina una domanda
- [ ] Verifica che le risposte corrispondenti siano eliminate
- [ ] Crea più bottiglie
- [ ] Eliminane una

## 🆘 Se Qualcosa Non Funziona

### Errore: "Autenticazione fallita"

- [ ] Verifica `.env.local` nel file system (non nel git)
- [ ] Riavvia il dev server: `Ctrl+C` e `npm run dev`
- [ ] Controlla che i valori siano esatti (senza spazi)

### Errore: "Tabelle non trovate"

- [ ] Vai a Supabase SQL Editor
- [ ] Controlla che le tabelle siano state create
- [ ] Se non ci sono, copia/incolla `DATABASE_SETUP.sql` di nuovo
- [ ] Clicca RUN

### Errore: "Permessi insufficienti"

- [ ] Vai a Supabase → Authentication → Policies
- [ ] Verifica che le policies siano abilitate
- [ ] Controlla che l'utente sia autenticato

### Dati Non Salvati

- [ ] Controlla la console del browser (F12) per errori
- [ ] Verifica la console del server (dove hai `npm run dev`)
- [ ] Vai a Supabase SQL Editor e fai una query manuale:
  ```sql
  SELECT * FROM games;
  ```

## ✅ Tutto Funziona?

Se tutti i checkbox sono ✅, il tuo Supabase è perfettamente integrato!

Prossimi step:

- [ ] Aggiungere il gameplay (giocatori rispondono alle domande)
- [ ] Aggiungere condivisione dei giochi
- [ ] Aggiungere leaderboard

🎉 **Complimenti! Il tuo database è online!**
