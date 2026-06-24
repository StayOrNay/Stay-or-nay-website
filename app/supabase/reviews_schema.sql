-- StayOrNay — real user review system
-- Run this once in your Supabase project's SQL Editor (Dashboard ->
-- SQL Editor -> New query -> paste -> Run). It cannot be run by the app
-- itself: creating tables, policies, and storage buckets needs
-- dashboard/service-role access, not the public anon key the app ships
-- with.
--
-- What this does:
--   1. Creates the `reviews` table — one row per submitted review.
--   2. Turns on Row Level Security so:
--        - anyone signed in can submit a review (always created as 'pending')
--        - a user can see their own reviews regardless of status
--        - everyone (including signed-out visitors) can see APPROVED reviews
--        - only the admin email below can approve/reject (UPDATE)
--   3. Creates a `review-media` storage bucket for photo/video uploads,
--      with matching policies (anyone can view, only the uploader can add
--      their own files).
--
-- IMPORTANT: change the admin email below to whatever email you actually
-- sign in to the live site with, if it's not agg200305@gmail.com. The same
-- email also has to be changed in app/src/lib/admin.js (ADMIN_EMAILS) —
-- both places need to match.

-- 1. Table -------------------------------------------------------------

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  villa_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Five categories, 0-10 each (see app/src/lib/reviewScore.js — this is
  -- the single source of truth for the categories/scale on the app side).
  score_location integer not null check (score_location between 0 and 10),
  score_value integer not null check (score_value between 0 and 10),
  score_cleanliness integer not null check (score_cleanliness between 0 and 10),
  score_amenities integer not null check (score_amenities between 0 and 10),
  score_host integer not null check (score_host between 0 and 10),

  -- Stored rather than computed on read, so historical reviews keep their
  -- original total/verdict even if the scoring rule ever changes later.
  total integer not null check (total between 0 and 50),
  verdict text not null check (verdict in ('stay', 'nay')),

  headline text not null default '',
  body text not null default '',
  media_urls jsonb not null default '[]'::jsonb,

  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),

  created_at timestamptz not null default now(),
  moderated_at timestamptz
);

create index if not exists reviews_villa_id_idx on public.reviews (villa_id);
create index if not exists reviews_user_id_idx on public.reviews (user_id);
create index if not exists reviews_status_idx on public.reviews (status);

alter table public.reviews enable row level security;

-- 2. Policies ------------------------------------------------------------

-- Anyone signed in can submit a review, but only as themselves and only
-- ever starting out 'pending' — they can't insert an already-approved row.
drop policy if exists "reviews_insert_own_pending" on public.reviews;
create policy "reviews_insert_own_pending"
  on public.reviews for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'pending');

-- Everyone (including signed-out visitors) can read approved reviews;
-- signed-in users can additionally read their own regardless of status.
drop policy if exists "reviews_select_approved_or_own" on public.reviews;
create policy "reviews_select_approved_or_own"
  on public.reviews for select
  using (status = 'approved' or user_id = auth.uid());

-- Only the admin email can change a review's status (approve/reject).
-- Keep this in sync with app/src/lib/admin.js ADMIN_EMAILS.
drop policy if exists "reviews_update_admin_only" on public.reviews;
create policy "reviews_update_admin_only"
  on public.reviews for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'agg200305@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'agg200305@gmail.com');

-- 3. Storage bucket for review photos/videos ----------------------------

insert into storage.buckets (id, name, public)
values ('review-media', 'review-media', true)
on conflict (id) do nothing;

-- Anyone can view media (bucket is public, so reads also work via the
-- plain public URL, but this policy covers signed/listing access too).
drop policy if exists "review_media_public_read" on storage.objects;
create policy "review_media_public_read"
  on storage.objects for select
  using (bucket_id = 'review-media');

-- A signed-in user can only upload into a folder named after their own
-- user id (the app uploads to `${userId}/...`, see lib/reviews.js).
drop policy if exists "review_media_own_folder_upload" on storage.objects;
create policy "review_media_own_folder_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'review-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
