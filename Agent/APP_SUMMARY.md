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
