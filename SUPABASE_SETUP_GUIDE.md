# 🗄️ Setup Database Supabase - Super Semplice

## Step 1️⃣: Crea Account Supabase (se non lo hai)

1. Vai su https://supabase.com
2. Clicca "Sign Up"
3. Registrati con GitHub o email
4. Crea un nuovo progetto
5. Scegli una region vicina (es. Europe)
6. Nota le credenziali (le vedrai dopo)

## Step 2️⃣: Prendi le Credenziali

Dopo aver creato il progetto:

1. Vai a **Settings → API**
2. Copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 3️⃣: Configura il file `.env.local`

Crea/modifica il file `.env.local` nella root del progetto:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4️⃣: Crea il Database

1. Vai a **SQL Editor** in Supabase
2. Clicca **+ New Query**
3. Copia tutto da `DATABASE_SETUP.sql` di questo progetto
4. Incollalo nel SQL Editor
5. Clicca **RUN** (bottone blu in alto a destra)
6. ✅ Done! Le tabelle sono create

## Step 5️⃣: Configura l'Autenticazione (opzionale, se non fatto)

1. Vai a **Authentication → Providers**
2. Abilita "Email" (dovrebbe già essere abilitato)
3. Configura il dominio autorizzato se necessario

## Step 6️⃣: Test l'App

1. Ferma il dev server: `Ctrl+C`
2. Avvia di nuovo: `npm run dev`
3. Vai su `http://localhost:3000`
4. Prova a fare login
5. Crea un gioco di test

## ✅ Fatto!

Il database è connesso e pronto a ricevere dati! 🚀

---

## 🆘 Problemi Comuni?

**Errore di autenticazione?**

- Verifica che `.env.local` abbia i valori corretti
- Riavvia il dev server dopo aver messo le env variables

**Errore nelle tabelle SQL?**

- Controlla che le tabelle non esistessero già
- Se esiste un errore, elimina le tabelle dalla UI di Supabase e riprova

**Le query non vanno?**

- Verifica di avere i **Row Level Security (RLS) policies** corretti
- Se non funziona, vai a **Authentication → Policies** e controlla

---

## 📁 File Importante

- **DATABASE_SETUP.sql** - SQL per creare tutto il database
- **.env.local** - Credenziali (NON commitarlo su Git!)
- **src/lib/supabaseClient.js** - Client Supabase (già configurato)
- **src/lib/supabaseServer.js** - Server Supabase per server components

---

**Domande? Il tuo database è ora collegato e pronto! 🎉**
