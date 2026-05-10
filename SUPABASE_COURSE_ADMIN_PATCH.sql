-- ============================================================================
-- COURSE ADMIN PATCH
-- Feature: course-admin-editor
-- ============================================================================
-- 1) Add super_admin column to profiles
-- 2) Create Supabase Storage bucket 'corsi'
-- 3) Storage RLS policies
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) profiles: add super_admin column
-- ---------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS super_admin BOOLEAN NOT NULL DEFAULT false;

-- Only super_admins can set/read super_admin flag on any profile.
-- Regular users cannot elevate themselves.
-- (The column is managed directly via Supabase dashboard by the developer.)

-- Drop existing select policy to extend it (was only selecting username before)
-- No change needed — existing policies remain. We add a policy to prevent
-- non-admins from reading/writing the new column via RLS on UPDATE.

DROP POLICY IF EXISTS "Only super_admin can write super_admin flag" ON profiles;
CREATE POLICY "Only super_admin can write super_admin flag"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- Users can only update their own profile, and cannot set super_admin=true
    -- unless they already are one (prevents self-elevation)
    auth.uid() = id
    AND (
      super_admin = false
      OR (
        SELECT super_admin FROM profiles WHERE id = auth.uid()
      ) = true
    )
  );

-- ---------------------------------------------------------------------------
-- 2) Storage bucket for course JSON files
-- ---------------------------------------------------------------------------
-- Run this in the Supabase SQL editor AFTER enabling the Storage extension.
-- Or create the bucket manually in the Supabase dashboard UI:
--   Bucket name: corsi
--   Public: true (JSON files are public read)
--   Allowed MIME types: application/json

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'corsi',
  'corsi',
  true,
  5242880, -- 5MB max per file
  ARRAY['application/json']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Storage RLS policies for bucket 'corsi'
-- ---------------------------------------------------------------------------

-- Anyone can read course JSON files (public bucket)
DROP POLICY IF EXISTS "Public read corsi" ON storage.objects;
CREATE POLICY "Public read corsi"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'corsi');

-- Only super_admins can upload/update/delete course files
DROP POLICY IF EXISTS "Super admin write corsi" ON storage.objects;
CREATE POLICY "Super admin write corsi"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'corsi'
    AND (
      SELECT super_admin FROM public.profiles WHERE id = auth.uid()
    ) = true
  );

DROP POLICY IF EXISTS "Super admin update corsi" ON storage.objects;
CREATE POLICY "Super admin update corsi"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'corsi'
    AND (
      SELECT super_admin FROM public.profiles WHERE id = auth.uid()
    ) = true
  );

DROP POLICY IF EXISTS "Super admin delete corsi" ON storage.objects;
CREATE POLICY "Super admin delete corsi"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'corsi'
    AND (
      SELECT super_admin FROM public.profiles WHERE id = auth.uid()
    ) = true
  );

-- ============================================================================
-- POST-RUN CHECKLIST
-- ============================================================================
-- 1. Verify column added:
--    SELECT column_name, data_type, column_default
--    FROM information_schema.columns
--    WHERE table_name = 'profiles' AND column_name = 'super_admin';
--
-- 2. Set yourself as super_admin (replace with your actual user UUID):
--    UPDATE profiles SET super_admin = true WHERE id = '<your-uuid>';
--
-- 3. Verify bucket created:
--    SELECT id, name, public FROM storage.buckets WHERE id = 'corsi';
--
-- 4. Upload course JSON files via the admin UI at /admin/corsi
--    or manually via Supabase Storage dashboard.
-- ============================================================================
