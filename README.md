This is a [Next.js](https://nextjs.org) project - **Indovinando** (Wine Trivia Live Multiplayer
Game).

## 🎮 Indovinando - Overview

A live multiplayer trivia game about wine. Players compete in real-time to guess blind-tasted wine bottles by answering multiple-choice questions about each one — varietal, region, vintage, producer, etc.

**Key Features:**

- 🎯 Create custom trivia games (questions + wine bottles with correct answers)
- 👥 Live multiplayer sessions with real-time sync via Supabase Realtime + polling fallback
- 🔥 Combo system: consecutive correct answers grant bonus points (+5/+10/+15)
- 🏆 Live leaderboard during the game, full leaderboard at the end
- 🍷 Bottle reveal at the end of each round (name, producer, year)
- 📱 Mobile-first Duolingo-style UI with slide animations

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the
file.

This project uses
[`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to
automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback
and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the
[Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)
from the creators of Next.js.

Check out our [Next.js deployment documentation](https://vercel.com/docs/frameworks/next-js) for
more details.

---

## 📖 Project Documentation

### Architecture & Guides

- [Live Multiplayer Guide](./LIVE_MULTIPLAYER_GUIDE.md) - Complete live multiplayer setup & flow
- [Database Schema](./DATABASE.md) - Full table reference with RLS policies and scoring logic
- [Code Analysis](./CODE_ANALYSIS.md) - Detailed component & database architecture
- [Quick Start](./QUICK_START.md) - Dev environment setup

### Key Features

#### 💾 Game Creation

- Create custom trivia games with questions and wine bottles
- Each bottle has multiple questions with one correct answer per question
- Publish or keep as draft

#### 🎮 Live Multiplayer

- Host creates session and shares link
- Players join with nickname + avatar
- Real-time gameplay: Supabase Realtime WebSocket as primary sync + polling every 2s as fallback
- **No interruptions:** the host waits for all players to complete the round before advancing
- Slide-based UI with Duolingo-style animations (220ms transitions)
- Guests can join anonymously (identified by `localStorage` + nickname)

#### 🏆 Scoring

| Condition | Points |
|---|---|
| Wrong answer | 0 |
| Correct answer | +10 |
| Correct — 2 in a row (combo) | +15 |
| Correct — 3 in a row | +20 |
| Correct — 4+ in a row | +25 (cap) |

Combo resets on any wrong answer or when the bottle changes. Scores are accumulated on `live_players.total_score` by the host after each bottle.

#### 📱 UX/UI

- Mobile-first responsive design
- Emoji avatars (10 Apple-style options)
- Smooth left/right slide animations
- Bottom-fixed panel for actions
- Progress pills tracking question completion within a bottle
- In-game leaderboard sheet (refreshed from DB on open)
- "Vedi classifica" shortcut button on the last bottle

---

## 🗄️ Database Schema (Supabase)

Full documentation: [DATABASE.md](./DATABASE.md)

Key tables:

| Table | Purpose |
|---|---|
| `games` | Game definitions (name, status, creator) |
| `game_questions` | Questions shared across all bottles of a game |
| `game_question_options` | Multiple-choice options per question |
| `game_bottles` | Wine bottles (name, producer, year, order) |
| `game_bottle_answers` | Correct option per (bottle, question) pair |
| `live_sessions` | Active game sessions (status, current bottle index, round status) |
| `live_players` | Participants with avatar, score, host flag |
| `live_round_answers` | Per-round answer submissions (cleared between bottles) |

See [SUPABASE_LIVE_SESSIONS.sql](./SUPABASE_LIVE_SESSIONS.sql) for the full schema with RLS policies.

---

## 🚀 Running the App

```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Key Routes

- `/dashboard` - Game list
- `/game/create` - Create new game
- `/game/[id]` - Play/view game
- `/game/[id]/live` - Create live session
- `/live/session/[sessionId]` - Join lobby
- `/live/session/[sessionId]/play` - Play live session
