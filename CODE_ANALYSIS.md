# Analisi Completa del Codice - INDOVINANDO

## 📊 Panoramica Architetturale

### Stack Tecnologico

- **Framework:** Next.js 16.1.6 con Turbopack
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Authentication
- **Styling:** CSS Modules + SCSS
- **State Management:** React Hooks (useState, useEffect, useRef, useCallback)

---

## 🏗️ Struttura Progetto

```
src/
├── app/                          # Next.js App Router
│   ├── auth/                     # Auth page (login/signup)
│   ├── dashboard/                # Game list + create
│   ├── game/
│   │   ├── create/              # Game creation flow
│   │   ├── [id]/                # Game detail + play
│   │   │   ├── edit/            # Edit game
│   │   │   └── live/            # Live multiplayer
│   │   └── layout.js
│   └── live/                     # Live session routes
│
├── components/
│   └── game/                     # Game editor components
│       ├── GameEditor.jsx        # Main orchestrator
│       ├── QuestionsList/Modal   # Q&A creation
│       ├── BottlesList/Modal     # Bottle + answers
│       ├── GamePlayView.jsx      # Game playback
│       └── utils/                # Validations + constants
│
├── lib/
│   ├── supabaseClient.js         # Browser Supabase client
│   └── supabaseServer.js         # Server-side Supabase client
│
└── styles/                       # Global SCSS utilities
```

---

## 🔄 Flussi Principali

### 1️⃣ CREAZIONE GIOCO (Create Flow)

```
/game/create/page.js
    ↓ (server RSC)
    → Carica user auth
    ↓
/game/create/GameCreateClient.jsx
    ↓ (use client)
    → Passa userId a GameEditor
    ↓
GameEditor (isEditMode=false)
    ├─ Step 1: Nome gioco
    ├─ Step 2: Domande (Q&A)
    ├─ Step 3: Bottiglie + risposte
    └─ publishGame()
        ├─ INSERT games + game_questions + game_question_options
        ├─ INSERT game_bottles + game_bottle_answers
        └─ redirect(/dashboard)
```

**Key Points:**

- `userId` usato per `created_by` durante INSERT
- Step navigation tracciato via URL `?step=X`
- Validazione prima di ogni step
- Redirect finale a dashboard

### 2️⃣ MODIFICA GIOCO (Edit Flow)

```
/game/[id]/edit/page.js
    ↓ (server RSC)
    ├─ Auth check (user must be owner)
    ├─ Load: games, game_questions, game_bottles
    └─ Pass props to GameEditClient
    ↓
GameEditClient (acts as 'use client' bridge)
    ↓
GameEditor (isEditMode=true)
    ├─ Initialization: useRef to prevent re-init
    ├─ onEditMode: Sync data from initialQuestions/Bottles
    └─ publishGame()
        ├─ DELETE old: game_bottle_answers → game_bottles → game_questions
        ├─ INSERT fresh: games.name UPDATE + INSERT all new data
        ├─ Call onGameSaved (revalidatePath in server action)
        └─ Hard refresh: window.location.href = `/game/[id]`
```

**Key Points:**

- `useRef(initializationDoneRef)` previene reset su deps change
- DELETE + INSERT pattern garantisce coerenza (no partial updates)
- `revalidatePath()` invalida cache del server
- Hard refresh con `window.location.href` forza ricaricamento

### 3️⃣ GIOCO LIVE MULTIPLAYER

```
/live/session/[sessionId]/page.js
    ↓ (Per join lobby)
    └─ Non-owner view, opzionale auth

/live/session/[sessionId]/PlayerJoinClient.jsx
    ├─ localStorage: live_player_id_${sessionId}, nickname
    ├─ Guest-first: join senza auth
    ├─ Optional CTA: "Registrati/Accedi (opzionale)"
    └─ Insert live_players con guest_player=true

/live/session/[sessionId]/play/PlayerLiveClient.jsx
    ├─ Per-bottle round model (NOT per-question)
    ├─ Load all questions per bottle
    ├─ Batch submit answers to live_round_answers
    └─ Wait for host to show results

/live/session/[sessionId]/host/HostLiveClient.jsx
    ├─ Show all questions + current answers
    ├─ "Mostra Risultati" → fetch game_bottle_answers (correct answers)
    ├─ Calculate per-player scores (isCorrect logic)
    ├─ Direct UPDATE live_players.total_score (numeric, no RPC)
    └─ Next bottle → delete round answers + increment question_index
```

**Key Points:**

- **Round Model:** Per-bottle, NOT per-question (per-question era troppo lento)
- **Guest Identity:** localStorage keys per session
- **Scoring:** Numeric direct UPDATE su database, NO RPC calls
- **RLS Policies:** Guest può leggere game\_\* solo se linkata a live_session
- **Polling:** Player/Host poll live_sessions per status updates

### 4️⃣ DASHBOARD (Game Management)

```
/dashboard/page.js
    ├─ Load user games
    ├─ Display: Name | Status badge | Created date
    ├─ Actions:
    │   ├─ "Visualizza Gioco" → /game/[id]
    │   └─ "🎮 Gioca Live"
    └─ Per-owner (at /game/[id]):
        ├─ "✏️ Modifica"
        ├─ "Metti in bozza / Pubblica"
        └─ "🗑️ Elimina"
```

---

## 🔐 Database Layer (Supabase Architecture)

### RLS Policies (Row Level Security)

**`games` table:**

- Owner può SELECT/UPDATE/DELETE
- Public can SELECT if status='published'

**`game_questions`, `game_question_options`, `game_bottles`:**

- Readable se owner O se linked to active `live_sessions`
- Non-public edit (owner only via Supabase rules)

**`live_sessions`:**

- Public READ per join flow
- Controlled INSERT (server-side only)

**`live_players`:**

- Insert own row (host/player identificato via session + user_id)
- Update own total_score

**`live_round_answers`:**

- Insert per round (player submits batch)
- Host legge per show results

### Key Design Patterns

1. **Cascade Deletes:** Game delete cascades all questions/bottles/answers
2. **Foreign Keys:** game_id, question_id, bottle_id tracciati per integrità
3. **Timestamps:** created_at auto-tracked in core tables
4. **Auth Integration:** user_id from Supabase auth

---

## 🎨 Component Architecture

### GameEditor (Main Orchestrator)

**State:**

```javascript
const [step, setStep] = useState(1)
const [gameName, setGameName] = useState('')
const [questionDraft, setQuestionDraft] = useState([])
const [bottles, setBottles] = useState([])
const [templateQuestions, setTemplateQuestions] = useState([])
const [currentAnswers, setCurrentAnswers] = useState([])
// ... visibility toggles, modals, etc
```

**Key Functions:**

- `handleAddQuestion()` → Update questionDraft
- `saveQuestionnaire()` → Sync templateQuestions, remap bottle answers
- `concludeBottle()` → Validate + save to bottles array
- `publishGame()` → DELETE old (edit) + INSERT fresh data

**Modal Pattern:**

- Modals controlled via `isModalOpen` + `activeBottleIndex` / `editingQuestionIndex`
- Close resets state + closes modal
- Save calls handler + closes modal

### Form Components (Modal-based)

- **QuestionModal:** Question text + dynamic options array
- **BottleModal:** Wine info (name/producer/year) + BottleAnswersSelector
- **BottleAnswersSelector:** Radio per question → select correct answer per bottle

### Display Components

- **QuestionsList:** Grid cards with completion status
- **BottlesList:** Grid cards with edit/delete actions
- **GameStepsBreadcrumbs:** Step navigation with visual indicators

---

## 📱 Client vs Server Split

### Server Components (RSC - React Server Components)

Files ending in `/page.js`:

- `auth/page.js` - Auth form
- `dashboard/page.js` - Load user + games list
- `game/create/page.js` - Create entry point
- `game/[id]/page.js` - Game detail + play view
- `game/[id]/edit/page.js` - Edit entry point + data load
- `live/session/[sessionId]/page.js` - Join lobby

**Benefits:**

- Direct database access (Supabase server client)
- Auth check before rendering
- No credentials exposed to client
- Automatic data fetching

### Client Components ('use client')

Components with state/interactivity:

- GameEditor.\*Client.jsx - All game editing UI
- GamePlayView.jsx - Game playback
- PlayerJoinClient.jsx - Join form
- PlayerLiveClient.jsx - Live game UI
- HostLiveClient.jsx - Host dashboard

**Bridge Pattern:**

```jsx
// Server page loads data
export async function GameEditPage({params}) {
  const data = await db.query() // server-side
  return <GameEditClient initialData={data} /> // pass to client
}

// Client component hydrates with server data
export default function GameEditClient({initialData}) {
  const [state, setState] = useState(initialData)
  // ... edit logic
}
```

---

## 🚀 Advanced Patterns Used

### 1. **useRef + useEffect for Initialization (Edit Mode)**

```javascript
const initializationDoneRef = useRef(false)

useEffect(() => {
  if (isEditMode && !initializationDoneRef.current) {
    initializationDoneRef.current = true
    // Initialize once, never again
    loadDataFromProps()
  }
}, [isEditMode, initialGame]) // Minimal deps
```

**Why:** Prevents re-initialization when navigating between steps.

### 2. **localStorage for Guest Identity**

```javascript
const playerStorageKey = `live_player_id_${sessionId}`
const nicknameKey = `live_player_nickname_${sessionId}`

// Persist across page reloads
const storedPlayerId = localStorage.getItem(playerStorageKey)
```

**Why:** Guest players stay identified even if page refreshes.

### 3. **Server Actions for Mutations**

```javascript
async function publishGame(formData) {
  'use server'
  // Only server can call this
  await supabase.from('games').insert(...)
}
```

**Why:** Secure mutation channel; credentials never exposed to client.

### 4. **DELETE CASCADE Pattern for Edit**

```javascript
// Delete everything old
await supabase.from('game_bottle_answers').delete()
await supabase.from('game_bottles').delete()
await supabase.from('game_questions').delete()

// Insert fresh
await supabase.from('game_questions').insert(newQuestions)
```

**Why:** Guarantees clean slate; avoids orphaned records.

### 5. **Hard Refresh After Revalidate**

```javascript
if (onGameSaved) await onGameSaved(gameId) // revalidatePath
window.location.href = `/game/${gameId}` // Force hard refresh
```

**Why:** Ensures server-rendered page gets fresh data from database.

---

## 📋 Known Limitations & Trade-offs

### What Works

✅ Single-player game creation + editing ✅ Multi-player live sessions (guest-first) ✅ Scoring +
results per bottle ✅ Guest persistence via localStorage ✅ RLS-based access control

### What Could Improve

⚠️ Polling instead of WebSocket (live updates not instant) ⚠️ No optimistic UI updates (waits for
server confirmation) ⚠️ CSS still has some .map files (compiled output clutter) ⚠️ No error boundary
components (crashes bubble up) ⚠️ Minimal logging/monitoring setup

---

## 📚 References

**Next.js Concepts Used:**

- App Router + dynamic routes `[id]`
- Server Components (RSC)
- Server Actions ('use server')
- revalidatePath() for cache invalidation
- redirect() for navigation

**Supabase Concepts Used:**

- PostgreSQL with Row-Level Security (RLS)
- Supabase SSR with cookies
- Auth state management
- Realtime (not used, but available)

**React Patterns:**

- Custom hooks for state logic
- useRef for component lifecycle tracking
- useEffect dependency arrays
- useCallback for memoized handlers

---

## 🔍 Testing Notes

**Manual Test Flows:**

1. Create game → Edit → Delete flow
2. Join session as guest → Play → See results
3. Edit game questions → Verify bottle answers remap
4. Toggle game status (draft ↔ published)
5. Navigate with breadcrumbs → Verify state persistence

**Edge Cases to Watch:**

- Rapid edits to same question (race conditions)
- Network timeout during publish
- localStorage disabled (incognito browsers)
- Concurrent players in same session
