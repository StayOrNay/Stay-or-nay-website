-- StayOrNay — add "how many bedrooms" + "how much you paid" to reviews.
-- Run once in the Supabase SQL Editor. Additive and safe to re-run.
--
-- Adds three columns to public.reviews:
--   beds       — number of bedrooms the reviewer reported
--   price_paid — amount paid per night (numeric)
--   currency   — currency of price_paid ('$', '€', '£', 'Rp', 'A$'); default '$'

alter table public.reviews
  add column if not exists beds integer,
  add column if not exists price_paid numeric,
  add column if not exists currency text not null default '$';
