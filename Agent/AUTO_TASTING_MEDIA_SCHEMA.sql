-- Optional schema for automatic bottle-photo ingestion
-- This module is intentionally decoupled from core game creation flows.
-- If you do not run this file, quick/custom game creation still works normally.
--
-- Run in Supabase SQL editor after base schema setup.

begin;

-- Utility trigger function (safe if already present)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1) Storage bucket for bottle photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tasting-bottles',
  'tasting-bottles',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2) Metadata table (photo -> recognition status/payload)
-- ---------------------------------------------------------------------------
create table if not exists public.tasting_bottle_images (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  storage_bucket text not null default 'tasting-bottles',
  storage_path text not null,
  original_filename text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'recognized', 'failed')),
  recognized_payload jsonb,
  recognized_name text,
  recognized_producer text,
  recognized_vintage int,
  recognition_confidence numeric(5,4),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index if not exists tasting_bottle_images_uploaded_by_idx
  on public.tasting_bottle_images (uploaded_by);

create index if not exists tasting_bottle_images_game_id_idx
  on public.tasting_bottle_images (game_id);

create index if not exists tasting_bottle_images_status_idx
  on public.tasting_bottle_images (status);

create index if not exists tasting_bottle_images_created_at_idx
  on public.tasting_bottle_images (created_at desc);

drop trigger if exists trg_tasting_bottle_images_updated_at on public.tasting_bottle_images;
create trigger trg_tasting_bottle_images_updated_at
before update on public.tasting_bottle_images
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) RLS for metadata table
-- ---------------------------------------------------------------------------
alter table public.tasting_bottle_images enable row level security;

drop policy if exists "Users read own tasting bottle images" on public.tasting_bottle_images;
create policy "Users read own tasting bottle images"
  on public.tasting_bottle_images for select
  using (uploaded_by = auth.uid());

drop policy if exists "Users insert own tasting bottle images" on public.tasting_bottle_images;
create policy "Users insert own tasting bottle images"
  on public.tasting_bottle_images for insert
  with check (uploaded_by = auth.uid());

drop policy if exists "Users update own tasting bottle images" on public.tasting_bottle_images;
create policy "Users update own tasting bottle images"
  on public.tasting_bottle_images for update
  using (uploaded_by = auth.uid())
  with check (uploaded_by = auth.uid());

drop policy if exists "Users delete own tasting bottle images" on public.tasting_bottle_images;
create policy "Users delete own tasting bottle images"
  on public.tasting_bottle_images for delete
  using (uploaded_by = auth.uid());

-- ---------------------------------------------------------------------------
-- 4) Storage policies for bucket
-- Convention: object path must start with the user id
-- Example: <auth.uid()>/draft/<uuid>.jpg
-- ---------------------------------------------------------------------------
drop policy if exists "Users read own tasting bottle files" on storage.objects;
create policy "Users read own tasting bottle files"
  on storage.objects for select
  using (
    bucket_id = 'tasting-bottles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users upload own tasting bottle files" on storage.objects;
create policy "Users upload own tasting bottle files"
  on storage.objects for insert
  with check (
    bucket_id = 'tasting-bottles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own tasting bottle files" on storage.objects;
create policy "Users update own tasting bottle files"
  on storage.objects for update
  using (
    bucket_id = 'tasting-bottles'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'tasting-bottles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own tasting bottle files" on storage.objects;
create policy "Users delete own tasting bottle files"
  on storage.objects for delete
  using (
    bucket_id = 'tasting-bottles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;

-- ---------------------------------------------------------------------------
-- Validation queries
-- ---------------------------------------------------------------------------
-- select id, name, public, file_size_limit from storage.buckets where id = 'tasting-bottles';
-- select count(*) from public.tasting_bottle_images;
