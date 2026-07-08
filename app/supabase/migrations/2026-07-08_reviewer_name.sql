-- Adds the reviewer's chosen display name to each review, so the site can
-- show WHO wrote a review instead of a generic "Verified stayer".
-- Run once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
alter table public.reviews
  add column if not exists reviewer_name text;
