# App Summary

## Current direction

- Stack: `Next.js` + `Supabase`
- Main product pillars: degustazioni, corso vino, profili, community, subscriptions

## Profile phase 1

- `profiles` now supports:
  - `profile_type`
  - `experience_level`
  - `favorite_wine_types`
  - `favorite_countries`
  - `city`
  - `province`
  - `newsletter_opt_in`
  - `business_name`
  - `business_type`
  - `business_description`
  - `business_website`
  - `business_phone`
  - `business_address`
  - `business_latitude`
  - `business_longitude`
  - `profile_completed_at`
  - `profile_prompt_dismissed_at`
- Dashboard shows a profile completion summary/reminder
- Main profile page links to a dedicated preferences page
- Profile preferences summary lives in `/profilo/preferenze`
- Profile completion flow lives in `/profilo/completa`
- Business profiles (`wine_shop`, `restaurant`, `other_business`) get one extra wizard step
- Business location step uses Google Maps / Places when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is present
- Public partner v1 now derives from completed business profiles
- Landing now links to `/partner` and shows public business partners
- Public partner pages live in `/partner` and `/partner/[slug]`
- Next DB step for partners: `is_partner_public` + `partner_slug`
- Business branding v1 adds logo upload on `/profilo/pubblico`
- Branding is reused in tasting QR flows and printable tasting sheets
- UI direction for this flow:
  - dedicated wizard page
  - text around `16px`
  - colors based on CSS vars, preferring `--primary-text` and `--success`
- Partner public pages now switch chrome by context: logged-out visitors see the landing header, while logged-in users keep the in-app top bar with back navigation.
- Public landing navigation now uses a fixed header with logo + burger and a full-screen menu overlay.
- Auto-tasting now supports scan credits v1: users start with 12 credits, bottle analysis costs 1 credit, web search costs 1 credit, the API blocks when credits run out, and the automatic create-game flow shows remaining credits plus an info panel in UI.
- Public rankings v1 now lives on `/classifiche` with initial seeded data, global stats header, landing + dashboard entry points, and a clear `Dati iniziali` badge until real community aggregations are ready.
- Public rankings now also have a real-data mini-spec in `Agent/RANKINGS_DATA_MODEL.md`, with valid sources (`enoteca`, `table-live`), the current limitation of classic `live`, and the recommended model for moving from demo data to real wine rankings.
- Match history is being aligned across play modes: `enoteca` now has a dedicated SQL patch for a stable `user_id` link, profile history reads completed sessions more strictly, and the single game page can aggregate `live`, `enoteca`, and `table-live` history together.
- Dashboard match history now includes `enoteca` alongside `live` and `table-live`, so hosted tastings are visible in one unified history view.
- `game_bottles` is now prepared for real rankings with stable wine identity and price snapshot fields, and the save flow persists these values for both manual and automatic tastings.
- The real rankings pipeline now has a normalized SQL view, `public_wine_rating_events`, which merges completed `enoteca` and `table-live` tasting events into one wine-level dataset ready for aggregation.
- The pipeline also now has `public_wine_rankings`, an aggregated rankings view with blind, quality/price, surprising, and divisive scores plus eligibility flags and precomputed ranks.
- `/classifiche` now reads real ranking data from `public_wine_rankings` when available, while keeping the `Dati iniziali` fallback when the real dataset is still too small.
- Community widget riusabile collegato agli stessi dati di `/classifiche`, mostrato in landing, dashboard e profilo con fallback su `Dati iniziali`.
- Global community stats now stay on landing and `/classifiche`, with real counts from completed tasting events, AI-analyzed wines from the catalog pipeline, and a 30-day active-users window; the dashboard keeps only the lighter community entry points.
- Table Live event entry is now split into clearer pages: the event home handles join-code entry, while dedicated `/create` and `/join` pages only ask for nickname + avatar with focused CTAs.
- Course progress sync is now resilient to older schemas without `max_score`, and the existing course SQL migration keeps the schema aligned so dashboard counts can reflect synced lesson progress.
- There is also a safe cleanup SQL for course progress to backfill `max_score`, normalize attempts/completed timestamps, and deduplicate repeated lesson rows before relying on dashboard counts.
