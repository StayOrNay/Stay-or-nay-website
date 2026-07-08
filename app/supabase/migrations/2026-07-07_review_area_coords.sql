-- StayOrNay — add area + map coordinates to reviews.
-- Run once in the Supabase SQL Editor. Additive and safe to re-run.
--
-- Lets an approved review show up as a pin on the Explore map:
--   area — free-text place the reviewer typed ("Uluwatu, Bali")
--   lat  — latitude, geocoded from `area` at submit time (nullable)
--   lon  — longitude, geocoded from `area` at submit time (nullable)

alter table public.reviews
  add column if not exists area text,
  add column if not exists lat numeric,
  add column if not exists lon numeric;
