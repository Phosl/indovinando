# 📚 Guida Next.js + Supabase per Principianti

Scritto per chi inizia adesso con Next.js e Supabase. Spiegazione semplice di concetti usati in
INDOVINANDO.

---

## 🌍 Capitolo 1: Cos'è Next.js?

### La Confusione

Molti confondono React (componenti) con Next.js (framework).

- **React** = "Come disegno l'interfaccia?"
- **Next.js** = "Come faccio funzionare un app completa?" (routing, server, database, etc.)

### Analogia Reale

Immagina una **restaurant app**:

- **React** = "Come disegno il piatto?"
- **Next.js** = "Come prendo l'ordine, lo cucino, e lo consegno?"

### Server Component vs Client Component

**Server Component (default):**

```javascript
// app/menu/page.js - Questo esegue SUL SERVER
export default async function MenuPage() {
  const meals = await db.query('SELECT * FROM meals')
  return (
    <ul>
      {meals.map((m) => (
        <li>{m.name}</li>
      ))}
    </ul>
  )
}
```

**Server Benefits:** ✅ Accedi database direttamente (niente credenziali sul client) ✅ Leggi file
privati ✅ Usa API keys segrete ✅ Caricamento automatico

**Client Component ('use client'):**

```javascript
// app/counter.jsx - Questo esegue NEL BROWSER
'use client'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

**Client Benefits:** ✅ onClick, onChange (user interaction) ✅ useState, useEffect (client state)
✅ LocalStorage ✅ Console.log nel browser

### Pattern: Server → Client Bridge

In INDOVINANDO usi spesso:

```javascript
// 1. Server Page - Carica dati sicuri
async function GameEditPage({ params }) {
  const user = await getUser()  // ← Server
  const game = await db.query()  // ← Server, secure

  return <GameEditClient initialData={game} user={user} />  // ← Passa al client
}

// 2. Client Component - Permette editing
'use client'
function GameEditClient({ initialData, user }) {
  const [game, setGame] = useState(initialData)  // ← Client, interactive

  return <GameEditor game={game} onSave={(new) => {
    // Chiama server action per salvare
    saveGameToDatabase(new)
  }} />
}
```

**Flusso:**

1. Server carica dati sicuri
2. Passa al Client via props
3. Client permette user a interagire
4. Client chiama server action per salvare
5. Server salva + revalidate cache

---

## 🔐 Capitolo 2: Cos'è Supabase?

### La Confusione

Molti dicono "database". Supabase è di più.

```
Supabase = PostgreSQL + Auth + Easy API
```

### 3 Componenti

#### 1. PostgreSQL Database

```sql
CREATE TABLE games (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Scritto in SQL (linguaggio database).

#### 2. Authentication (Login/Signup)

```javascript
// Supabase gestisce:
// - Hashing passwords
// - Sending verification emails
// - Session management
// - OAuth (Google, GitHub, etc.)

const {data, error} = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secret123',
})
```

#### 3. Row-Level Security (RLS)

Questo è il **GAME CHANGER** per app reali.

```sql
-- Politica in Supabase:
-- Only owner can see/edit their game
CREATE POLICY "Users see own games"
  ON games FOR SELECT
  USING (auth.uid() = created_by);
```

**Cosa significa:**

```javascript
// User 1:
const games = await supabase.from('games').select('*')
// Risultato: solo i giochi di User 1

// User 2:
const games = await supabase.from('games').select('*')
// Risultato: solo i giochi di User 2
// User 2 NON vede i giochi di User 1! ← RLS lo blocca
```

**Senza RLS (❌ PERICOLOSO):**

```javascript
const games = await db.query('SELECT * FROM games')
// Chiunque vede TUTTI i giochi di TUTTI!
```

### Come Supabase Conosce Chi Sei?

```javascript
// 1. Login
const {data} = await supabase.auth.signInWithPassword({email, password})
// Supabase ti da un JWT token (codice segreto)

// 2. Ogni richiesta al database
const games = await supabase.from('games').select('*')
// Supabase legge il token → "Sei l'utente con ID: xyz"
// ↓
// RLS policy: `auth.uid() = created_by`
// ↓
// SELECT * FROM games WHERE created_by = 'xyz'  ← Automatico!
```

---

## 🔀 Capitolo 3: Come Funziona Supabase + Next.js?

### Cookieless Approach (Quello che usi)

**Passo 1: User login in browser**

```javascript
// Client
const {data} = await supabase.auth.signUp({email, password})
// Supabase dice: "Ok, eccoti il token!"
// Token salvato in cookie dal browser
```

**Passo 2: Browser manda cookie con ogni richiesta**

```
GET /api/games HTTP/1.1
Cookie: sb-token=jwt123...xyz
```

**Passo 3: Server legge il cookie e sa chi sei**

```javascript
// Server (pages/api/games.js o app/api/...)
const token = request.cookies.get('sb-token') // ← Legge il token
const {
  data: {user},
} = await supabase.auth.getUser()
// Supabase: "Il token appartiene a: userid_xyz"
```

**Passo 4: RLS blocca accessi non autorizzati**

```javascript
// Anche se chiami:
.from('games').select('*')

// Supabase applica automaticamente:
// SELECT * FROM games WHERE created_by = auth.uid()
```

---

## 🏗️ Capitolo 4: App Router vs Pages Router

### App Router (Quello che usi - più nuovo)

```
app/
├── page.js                  ← / (home)
├── auth/
│   └── page.js             ← /auth
├── dashboard/
│   └── page.js             ← /dashboard
└── game/
    ├── [id]/
    │   └── page.js         ← /game/123
    └── [id]/
        └── edit/
            └── page.js     ← /game/123/edit
```

**File naming:**

- `page.js` = La pagina che vedi
- `layout.js` = Wrapper attorno alle pagine
- `route.js` = API endpoint (raro con Supabase)

### Dynamic Routes con `[id]`

```javascript
// app/game/[id]/page.js
export default function GamePage({params}) {
  const {id} = params // ← id = 123 da /game/123

  return <h1>Game {id}</h1>
}
```

**Come funziona:**

- Utente va a `/game/123`
- Next.js: "Il parametro è `id = '123'`"
- Passa a component via `params.id`
- Component mostra "Game 123"

---

## 🚀 Capitolo 5: Flusso Completo di Un'Azione

Facciamo il flusso di **"Utente crea un gioco"** in INDOVINANDO:

### Step 1: Browser → Server Page

```javascript
// URL: /game/create
// user clicca "Crea Nuovo Gioco"
```

### Step 2: Server carica la pagina

```javascript
// app/game/create/page.js (Server Component)
export default async function GameCreatePage() {
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth') // ← Non loggato? Via!

  return (
    <main>
      <GameCreateClient userId={user.id} />
    </main>
  )
}
```

**Cosa succede:**

1. Next.js esegue questo codice sul SERVER (privato!)
2. Controlla se user è loggato (RLS lo protegge)
3. Passa `userId` al client component

### Step 3: Client (Browser) prende il form

```javascript
// app/game/create/GameCreateClient.jsx
'use client'

export default function GameCreateClient({userId}) {
  const [gameName, setGameName] = useState('')

  async function handleCreate() {
    // Clicca bottone "Salva"
    // Chiama una AZIONE SUL SERVER per salvare
    await publishGame({
      name: gameName,
      created_by: userId, // ← Passato dal server!
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleCreate()
      }}>
      <input value={gameName} onChange={(e) => setGameName(e.target.value)} />
      <button type="submit">Salva</button>
    </form>
  )
}
```

### Step 4: Server Action (ponte server-client)

```javascript
// Definito in app/game/create/page.js (o file condiviso)
async function publishGame(gameData) {
  'use server' // ← Questo fuori dal browser!

  const supabase = await createServerSupabase()

  const {error} = await supabase.from('games').insert({
    name: gameData.name,
    created_by: gameData.created_by,
    status: 'draft',
  })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard') // ← Ricalcola la dashboard
  redirect('/dashboard') // ← Manda l'utente
}
```

**Cosa succede:**

1. Client chiama `publishGame()`
2. Next.js: "Questa è 'use server', eseguo sul server!"
3. Server inserisce nel database (con RLS che protegge)
4. `revalidatePath()` dice a Next.js: "La /dashboard è cambiata, ricalcola!"
5. `redirect()` manda utente alla dashboard

### Step 5: Browser vede il risultato

```
Browser: "Ok, l'utente è stato reindirizzato a /dashboard"
Server: "Carica /dashboard di nuovo"
  ↓
  SELECT * FROM games WHERE created_by = auth.uid()
  ↓
  Ritorna il nuovo gioco!
```

---

## 💾 Capitolo 6: RLS - La Magia della Sicurezza

### Senza RLS (❌ Insicuro)

```javascript
// Browser User 1
const games = await supabase.from('games').select('*')
// Risultato: TUTTI i giochi di TUTTI gli utenti
// 🔴 Vede giochi privati di altri utenti!
```

### Con RLS (✅ Sicuro)

```sql
-- Politica in Supabase:
CREATE POLICY "Users see own games"
  ON games FOR SELECT
  USING (auth.uid() = created_by);
```

**Cosa significa:**

- `FOR SELECT` = Quando leggi
- `USING (...)` = Condizione invisibile automatica

**Trasformazione:**

```javascript
// Codice client
.select('*')

// Diventa (automaticamente):
.select('*').eq('created_by', auth.uid())
// ↑ RLS lo aggiunge da solo!
```

### 3 Livelli di RLS

#### 1. SELECT (Chi può leggere?)

```sql
CREATE POLICY "Users see own games"
  ON games FOR SELECT
  USING (auth.uid() = created_by);
```

**Risultato:**

- User X vede solo giochi WHERE created_by = X

#### 2. INSERT (Chi può creare?)

```sql
CREATE POLICY "Users create own games"
  ON games FOR INSERT
  WITH CHECK (auth.uid() = created_by);
```

**Risultato:**

- User X può INSERT solo se created_by = X
- Anche se tenta di imbrogliare il client, il server rifiuta!

```javascript
// Attacco: User X tenta di creare gioco per User Y
await supabase.from('games').insert({
  name: 'Tricked!',
  created_by: 'user-Y-id', // ← Tentano di imbrogliare
})
// Supabase: "No! created_by non è auth.uid()"
// ← Request rifiutato!
```

#### 3. UPDATE (Chi può modificare?)

```sql
CREATE POLICY "Users update own games"
  ON games FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
```

**Risultato:**

- User X può UPDATE solo se possedeva il gioco prima E dopo

---

## 🔄 Capitolo 7: Sincronizzazione Client-Server

### Il Problema

```javascript
// Server ha i dati nuovi dopo INSERT
await supabase.from('games').insert({name: 'Mario'})

// Client vede ancora i vecchi dati
// (Perché usa cache)
```

### La Soluzione: `revalidatePath()`

```javascript
// Server Action
async function createGame(data) {
  'use server'

  // 1. Salva nel database
  await supabase.from('games').insert(data)

  // 2. Invalida la cache
  revalidatePath('/dashboard') // ← "Ricalcola questa pagina!"

  // 3. Manda utente
  redirect('/dashboard')
}
```

**Timeline:**

```
t=0  User clicca "Salva"
t=1  Server salva in DB
t=2  revalidatePath() invalida cache
t=3  redirect() manda utente a /dashboard
t=4  Server ricrea /dashboard con dati NUOVI
t=5  Browser vede dati freschi!
```

### Caso Edge: Modifica Rapida

```javascript
// Utente modifica il titolo 10 volte al secondo
// Ogni volta chiama handleSave()
// Potrebbe causare 10 debounce + 10 revalidate!

// Soluzione: usare useTransition (React 18)
const [isPending, startTransition] = useTransition()

function handleSave() {
  startTransition(async () => {
    await saveGameAction(updatedGame)
    // React automaticamente disabilita input durante save
    // E aggiorna il UI quando finito
  })
}
```

---

## 🎁 Capitolo 8: Patterns Pratici

### Pattern 1: Fetch con Suspense

```javascript
// app/dashboard/page.js
import {Suspense} from 'react'

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Caricamento...</div>}>
      <GamesList /> // ← Questo async carica dati
    </Suspense>
  )
}

async function GamesList() {
  const games = await db.query('SELECT * FROM games')
  return (
    <ul>
      {games.map((g) => (
        <li>{g.name}</li>
      ))}
    </ul>
  )
}
```

**Benefit:**

- Page mostra "Caricamento..." mentre GamesList passa i dati
- Quando pronto, mostra giochi

### Pattern 2: URL as Source of Truth

```javascript
// app/game/[id]/edit/page.js?step=2
// URL contiene lo "step corrente"

export default function GameEditPage({searchParams}) {
  const currentStep = parseInt(searchParams.step || '1')

  return <GameEditor initialStep={currentStep} />
}
```

**Benefit:**

- Utente copia URL → amico vede lo stesso step
- Refresh pagina mantiene step
- Cronologia browser funziona

### Pattern 3: Server Action + optimistic Update

```javascript
'use client'

const [games, setGames] = useState(initialGames)

async function handleDelete(gameId) {
  // Optimistic: rimuovi dal UI subito
  setGames((prev) => prev.filter((g) => g.id !== gameId))

  try {
    // Poi chiama server
    await deleteGameAction(gameId)
  } catch (error) {
    // Se errore, riporta l'UI indietro
    setGames(initialGames)
    alert('Errore eliminazione')
  }
}
```

---

## 🐛 Capitolo 9: Debugging

### Browser Console

```javascript
// Aggiungi console.log nel client
'use client'

export default function MyComponent() {
  console.log('Componente montato!') // ← Vedi nel tab "Console"

  return <div>Ciao</div>
}
```

### Server Logs

```javascript
// Per vedere output del server:
// 1. Apri terminal dove gira `npm run dev`
// 2. Vedi output del server là

async function gameEditPage() {
  console.log('Page loaded') // ← Vedi nel terminal
}
```

### Supabase Studio

```
https://supabase.com/dashboard
├─ SQL Editor         ← Scrivi query dirette
├─ Tables             ← Vedi dati live
├─ Policies           ← Vedi RLS policies
└─ Logs               ← Vedi errori database
```

### Network Tab (Avanzato)

```
F12 → Network → vedi tutte le richieste
├─ POST /api/...    ← Server action
├─ GET /game/123    ← Pagina
└─ ... Supabase API calls
```

---

## 📋 Capitolo 10: Checklist per Nuovi File

Quando crei una pagina nuova:

```
☐ E' un page.js o un component?
  ├─ Se page.js: può avere 'use client' e RSC miste
  └─ Se component: decidi server vs client

☐ Ha dati dal database?
  ├─ Sì → Server Component (page.js o async component)
  └─ No → Client Component ('use client')

☐ Ha form/input?
  ├─ Sì → 'use client' (useState, onClick, etc.)
  └─ No → Server Component ok

☐ Salva nel database?
  ├─ Sì → Usa Server Action ('use server')
  └─ No → Direct client code

☐ Deve essere privato (solo owner)?
  ├─ Sì → Aggiungi RLS POLICY
  ├─ RLS POLICY: USING (auth.uid() = owner_id)
  └─ No → Public policy

☐ Dopoaver salvato, UI deve aggiornare?
  ├─ Sì → Chiama revalidatePath() / redirect()
  └─ No → Direct mutation ok
```

---

## 🎓 Risorse Esterne

**Next.js Official:**

- [nextjs.org/docs](https://nextjs.org/docs) - Documentazione ufficiale
- App Router vs Pages Router: https://nextjs.org/docs/app

**Supabase Official:**

- [supabase.com/docs](https://supabase.com/docs) - Docs Supabase
- RLS Policies: https://supabase.com/docs/guides/auth/row-level-security
- Supabase + Next.js: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs

**React Official:**

- [react.dev](https://react.dev) - Nuova docs React 18+
- Server Components: https://react.dev/reference/react/use-server

**YouTube Channels:**

- "Next.js for Beginners" - Lee Robinson
- "Supabase Tutorials" - Supabase ufficiale

---

## 💬 FAQ per Principianti

### D: Quando uso Server vs Client Component?

```
Server (default):
  ✅ Leggo database
  ✅ Proteggo API keys
  ✅ Carico dati grandi
  ❌ Non posso fare onClick

Client ('use client'):
  ✅ User interaction (input, click)
  ✅ useState, useEffect
  ✅ localStorage / cookies del browser
  ❌ Non posso leggere DB direttamente
```

### D: RLS mi rende completamente sicuro?

```
RLS protegge il DATABASE. Ma devi anche:
  ✅ Validare input sul server
  ✅ Usare HTTPS (non HTTP)
  ✅ Proteggere API keys
  ✅ Rate limiting sulle azioni

RLS è strato 1. Sicurezza è strati multipli.
```

### D: Come faccio routing dinamico?

```
// URL: /game/123
// File: app/game/[id]/page.js

export default function Page({ params }) {
  const { id } = params  // id = '123'
  return <h1>Game: {id}</h1>
}
```

### D: Come posso testare in locale?

```bash
npm run dev  # Avvia dev server

# Apri http://localhost:3000
# Cambien il codice → pagina si aggiorna automatico
# Errori appaiono nel terminal + console browser
```

---

## 🎯 Prossimi Step

1. **Leggi:** CODE_ANALYSIS.md (analisi del tuo codice)
2. **Considerate:** REFACTORING_PROPOSAL.md (come migliorare)
3. **Esplora:** Prova a creare una nuova feature (es: Comments sul gioco)
4. **Debugga:** Metti console.log in placed strategici, osserva flow

---

**Autore:** Generated for understanding INDOVINANDO codebase **Livello:** Principiante - Intermedio
**Tempo di lettura:** 30 minuti
