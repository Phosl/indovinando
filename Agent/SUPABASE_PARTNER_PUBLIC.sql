-- =========================================================
-- PUBLIC PARTNER PROFILE PATCH
-- Aggiunge campi per visibilita pubblica e slug partner
-- =========================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_partner_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_partner_slug_unique_idx
  ON public.profiles (partner_slug)
  WHERE partner_slug IS NOT NULL;

COMMENT ON COLUMN public.profiles.is_partner_public IS 'Se true, il profilo business puo comparire nella directory partner pubblica';
COMMENT ON COLUMN public.profiles.partner_slug IS 'Slug pubblico univoco per la scheda partner';

-- Backfill opzionale per i profili business gia completi
WITH partner_candidates AS (
  SELECT
    id,
    CASE
      WHEN NULLIF(TRIM(COALESCE(partner_slug, '')), '') IS NOT NULL THEN partner_slug
      ELSE
        TRIM(BOTH '-' FROM REGEXP_REPLACE(
          LOWER(
            REGEXP_REPLACE(
              COALESCE(NULLIF(business_name, ''), NULLIF(username, ''), 'partner'),
              '[^a-zA-Z0-9]+',
              '-',
              'g'
            )
          ) || '-' || LEFT(REPLACE(id::text, '-', ''), 6),
          '-+',
          '-',
          'g'
        ))
    END AS generated_slug
  FROM public.profiles
  WHERE profile_type IN ('wine_shop', 'restaurant', 'other_business')
    AND profile_completed_at IS NOT NULL
)
UPDATE public.profiles AS profiles
SET
  is_partner_public = CASE
    WHEN profiles.profile_type IN ('wine_shop', 'restaurant', 'other_business')
      AND profiles.profile_completed_at IS NOT NULL
    THEN true
    ELSE profiles.is_partner_public
  END,
  partner_slug = partner_candidates.generated_slug
FROM partner_candidates
WHERE profiles.id = partner_candidates.id
  AND (
    profiles.partner_slug IS NULL
    OR profiles.partner_slug = ''
    OR profiles.is_partner_public = false
  );
