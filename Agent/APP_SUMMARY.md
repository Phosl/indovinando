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
  - `profile_completed_at`
  - `profile_prompt_dismissed_at`
- Dashboard shows a profile completion summary/reminder
- Profile page shows the same summary block
- Profile completion flow lives in `/profilo/completa`
- UI direction for this flow:
  - dedicated wizard page
  - text around `16px`
  - colors based on CSS vars, preferring `--primary-text` and `--success`
