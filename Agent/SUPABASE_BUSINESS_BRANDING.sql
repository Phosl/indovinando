-- =========================================================
-- BUSINESS BRANDING PATCH
-- Logo attivita per partner business
-- =========================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_logo_path TEXT,
  ADD COLUMN IF NOT EXISTS business_logo_url TEXT;

COMMENT ON COLUMN public.profiles.business_logo_path IS 'Path storage del logo attivita business';
COMMENT ON COLUMN public.profiles.business_logo_url IS 'URL pubblico del logo attivita business';

-- Bucket pubblico per branding attivita
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-branding', 'business-branding', true)
ON CONFLICT (id) DO NOTHING;

-- Policy lettura pubblica
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'business-branding public read'
  ) THEN
    CREATE POLICY "business-branding public read"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'business-branding');
  END IF;
END $$;

-- Policy upload owner path
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'business-branding owner write'
  ) THEN
    CREATE POLICY "business-branding owner write"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'business-branding'
        AND auth.uid()::text = split_part(name, '/', 1)
      );
  END IF;
END $$;

-- Policy update/delete owner path
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'business-branding owner modify'
  ) THEN
    CREATE POLICY "business-branding owner modify"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'business-branding'
        AND auth.uid()::text = split_part(name, '/', 1)
      )
      WITH CHECK (
        bucket_id = 'business-branding'
        AND auth.uid()::text = split_part(name, '/', 1)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'business-branding owner delete'
  ) THEN
    CREATE POLICY "business-branding owner delete"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'business-branding'
        AND auth.uid()::text = split_part(name, '/', 1)
      );
  END IF;
END $$;
