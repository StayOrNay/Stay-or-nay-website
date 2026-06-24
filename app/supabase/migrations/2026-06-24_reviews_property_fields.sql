-- StayOrNay — migration: free-text property reviews
-- Run this once in your Supabase project's SQL Editor (Dashboard ->
-- SQL Editor -> New query -> paste -> Run).
--
-- Why: "Write a review" no longer locks you to one of the small set of
-- placeholder villas in app/src/data/villas.js (those are temporary demo
-- content and are going away). Instead you link + name whatever property
-- you actually stayed at, exactly like "Request a review" already works.
-- That means the reviews table needs villa_id to become optional, plus two
-- new text columns to hold the link/name you typed in.
--
-- This is safe to run even if you already ran the original
-- reviews_schema.sql — every statement below is idempotent (checks before
-- changing anything), so running it twice, or on a table that doesn't have
-- these columns yet, both work fine.

alter table public.reviews
  alter column villa_id drop not null;

alter table public.reviews
  add column if not exists property_link text;

alter table public.reviews
  add column if not exists property_name text;
