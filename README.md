This is a [Next.js](https://nextjs.org) project - **Indovinando** (Wine Trivia Live Multiplayer
Game).

## 🎮 Indovinando - Overview

A live multiplayer trivia game about wine. Players compete in real-time to answer questions and earn
points.

**Key Features:**

- 🎯 Create custom trivia games (questions + wine bottles with correct answers)
- 👥 Live multiplayer with real-time polling
- 🏆 Scoring system based on correct answers
- 📱 Mobile-first Duolingo-style UI with Slide animations

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
- [Live Flow (Updated)](./LIVE_FLOW_UPDATED.md) - Latest flow diagram + no-interruption logic
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
- Real-time gameplay with polling (1200ms interval)
- **No interruptions:** Host waits for all players to complete round before showing results
- Slide-based UI with Duolingo-style animations (220ms transitions)

#### 🏆 Scoring

- +10 points for correct answer
- +0 points for incorrect
- Live leaderboard during and after game

#### 📱 UX/UI

- Mobile-first responsive design
- Emoji avatars (10 Apple-style options)
- Smooth left/right slide animations
- Bottom-fixed panel for actions
- Progress pills tracking question completion

---

## 🗄️ Database Schema (Supabase)

Key tables:

- `games` - Game definitions
- `game_questions` - Q&A structure
- `game_bottles` - Wine bottles with correct answers
- `live_sessions` - Active game sessions
- `live_players` - Players in session
- `live_round_answers` - Answer submissions per round

See `SUPABASE_LIVE_SESSIONS.sql` for full schema with RLS policies.

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
