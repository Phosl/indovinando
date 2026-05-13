This is a [Next.js](https://nextjs.org) project — **Indovinando** (Wine Trivia Live Multiplayer
Game).

## 🎮 Indovinando — Overview

A live multiplayer trivia game about wine. Players compete in real-time to guess blind-tasted wine
bottles by answering multiple-choice questions about each one (varietal, region, vintage, producer,
etc.).

### Tech Stack

| Layer        | Technology                                       |
| ------------ | ------------------------------------------------ |
| Framework    | Next.js 16 (App Router, Turbopack)               |
| Runtime      | React 19                                         |
| Backend / DB | Supabase (PostgreSQL + RLS + Realtime)           |
| Auth         | Supabase Auth (logged-in host, anonymous guests) |
| Styling      | SCSS Modules + CSS custom properties             |
| i18n         | Custom `useT` hook, `it.json` / `en.json`        |
| Deploy       | Vercel                                           |

---

## ✨ Key Features

- 🎯 **Game creation** — custom questions + wine bottles with correct answers per (bottle, question)
- 👥 **Live multiplayer** — real-time sync via Supabase Realtime WebSocket + 2s polling fallback,
  with share/QR lobby tools
- 🔥 **Combo system** — consecutive correct answers grant bonus points (cap at +15)
- 🏆 **Live leaderboard** — overlay during play (server API, same data for host and guests), full
  podium at the end
- 📜 **Match history** — permanent snapshot saved at session end (`live_session_results`), viewable
  at `/dashboard/storico` with per-game filter
- 🍷 **Bottle reveal** — name, producer, year shown at the end of each round
- 🎓 **Wine Course** — 8-level structured course with progressive quizzes and per-lesson progress
  tracking
- 🍾 **Enoteca** — anonymous single-player tasting mode (no login required)
- 📱 **Mobile-first UI** — Duolingo-style slides, emoji + SVG avatars, smooth transitions

---

## 🗺️ Key Routes

| Route                            | Description                              |
| -------------------------------- | ---------------------------------------- |
| `/`                              | Landing page                             |
| `/auth`                          | Login / register                         |
| `/dashboard`                     | Host's game list + quick actions         |
| `/dashboard/storico`             | Match history with per-game filter       |
| `/game/create`                   | Full game creation wizard                |
| `/game/create-quick`             | 3-step quick game                        |
| `/game/[id]`                     | View / manage a game                     |
| `/game/[id]/edit`                | Edit game                                |
| `/game/[id]/live`                | Create live session (lobby, share + QR)  |
| `/game/[id]/print`               | Print card                               |
| `/live/session/[id]`             | Join lobby (nickname + avatar selection) |
| `/live/session/[id]/play`        | Active gameplay                          |
| `/live/session/[id]/leaderboard` | Final leaderboard                        |
| `/corso-vino`                    | Wine course home                         |
| `/corso-vino/[levelId]`          | Level detail                             |
| `/enoteca/[menuId]`              | Enoteca tasting                          |
| `/profilo`                       | User profile + language switcher         |
| `/changelog`                     | Version history                          |
| `/info`                          | App info / how-to                        |

---

## 🏗️ Architecture

### Live Multiplayer Flow

```
Host                         Supabase                        Guests
 │                               │                              │
 │── creates live_session ──────►│                              │
 │                               │◄─ join (insert live_player) ─│
 │   start() ───────────────────►│── Realtime broadcast ───────►│
 │                               │                              │
 │                    [round: waiting_answers]                   │
 │   answer locally (no wait)    │    answer locally            │
 │   insert live_round_answers ─►│◄─ insert live_round_answers ─│
 │                               │── Realtime INSERT ──────────►│
 │   [allPlayersCompletedThisRound == true]                      │
 │   syncScoresFromAnswers() ───►│                              │
 │   update live_session ───────►│── Realtime broadcast ───────►│
 │                               │                              │
 │              [round: showing_results]                         │
 │   handleNextBottle() ────────►│── Realtime broadcast ───────►│
 │                               │                              │
```

**Correct answer preloading**: `play/page.js` (server) fetches `game_bottle_answers` using the
service role key and embeds `_correctAnswers: {questionId: optionId}` directly in each bottle object
— this avoids a client-side RLS hang that affected authenticated (host) users.

**Standings API**: `GET /api/live/session/standings` uses the service role key to compute scores
server-side, guaranteeing identical data for host and guests regardless of RLS differences.

### i18n System

- `useT('namespace.sub')` — hook resolving dot-notation paths into `it.json` / `en.json`
- Language stored in `profiles.preferred_language` (authenticated) or `localStorage` (guest)
- `getServerLanguage()` — server-side language resolution
- All live session UI fully translated (IT / EN)

### State Management (Live Play)

| Hook                | Responsibility                                                  |
| ------------------- | --------------------------------------------------------------- |
| `useGameDataLoader` | Loads bottles, questions, players; handles late-join bootstrap  |
| `usePlayerResolver` | Resolves or creates the local player record                     |
| `useRoundPlay`      | All per-round state: answers, combo, slides, results visibility |
| `useOverlays`       | Leaderboard sheet + exit modal; fetches standings from API      |
| `useLiveRealtime`   | Supabase Realtime subscriptions (sessions, players, answers)    |
| `useGameAudio`      | Sound effects                                                   |

---

## 🏆 Scoring

| Condition             | Points    |
| --------------------- | --------- |
| Wrong answer          | 0         |
| Correct answer        | +10       |
| Correct — 2 in a row  | +15       |
| Correct — 3 in a row  | +20       |
| Correct — 4+ in a row | +25 (cap) |

Combo resets on wrong answer or bottle change. Scores are persisted to `live_players.total_score` by
the host via `syncScoresFromAnswers()` before advancing. A permanent snapshot is written to
`live_session_results` when the session finishes.

---

## 🗄️ Database

Full schema reference: [DATABASE.md](./DATABASE.md)

SQL sources (apply in order for a fresh setup):

1. `SUPABASE_RESTORE_FULL.sql` — complete restore (tables + RLS + indexes)
2. `SUPABASE_LIVE_GUEST_PATCH.sql` — guest/anonymous player policies
3. `RLS_DELETE_POLICIES_PATCH.sql` — game editor delete policies
4. `WINE_COURSE_PROGRESS.sql` — wine course progress table
5. `ENOTECA_SCHEMA.sql` — enoteca tasting tables
6. `LIVE_SESSION_HISTORY.sql` — match history snapshot table

### Key Tables

| Table                      | Purpose                                           |
| -------------------------- | ------------------------------------------------- |
| `games`                    | Game definitions                                  |
| `game_questions`           | Questions (shared across all bottles)             |
| `game_question_options`    | Multiple-choice options                           |
| `game_bottles`             | Wine bottles                                      |
| `game_bottle_answers`      | Correct option per (bottle, question)             |
| `live_sessions`            | Active sessions                                   |
| `live_players`             | Participants (nickname, avatar, score, host flag) |
| `live_round_answers`       | Per-round submissions (cleared between bottles)   |
| `live_session_results`     | Permanent match history snapshot                  |
| `wine_course_progress`     | Per-user per-lesson course progress               |
| `enoteca_tasting_sessions` | Enoteca anonymous sessions                        |
| `enoteca_answers`          | Enoteca answers                                   |

---

## 🚀 Local Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build check
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # required for admin routes (finish, standings, history)
```

### API Routes

| Route                                  | Auth        | Purpose                                |
| -------------------------------------- | ----------- | -------------------------------------- |
| `POST /api/live/session/create`        | host        | Create session                         |
| `POST /api/live/session/start`         | host        | Start session                          |
| `POST /api/live/session/finish`        | participant | Finish session + save history snapshot |
| `POST /api/live/session/cancel`        | host        | Cancel session                         |
| `GET /api/live/session/standings`      | public      | Server-side standings (service role)   |
| `POST /api/live/session/players-count` | host        | Players count                          |

---

## 📖 Additional Documentation

- [DATABASE.md](./DATABASE.md) — Full table reference with RLS and scoring
- [BACKLOG.md](./BACKLOG.md) — Completed work and upcoming tasks
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) — Manual QA checklist
- [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md) — Supabase project setup guide

- [SPLASHSCREEN] https://progressier.com/pwa-icons-and-ios-splash-screen-generator
