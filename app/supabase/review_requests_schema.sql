-- "Request a review" — lets a signed-in user ask the StayOrNay team to go
-- (or arrange for someone to go) review a property they're booking or
-- considering. No payment is processed by the site — budget_offer is just a
-- text field the requester fills in, and any money changes hands off-platform
-- between the requester and Alexander directly. Fulfillment is admin-only,
-- same hardcoded-email model as reviews_schema.sql's moderation queue.
--
-- Safe to re-run: every `drop policy if exists` below only removes a named
-- permission rule immediately before recreating it — it does not touch the
-- table or any rows.

create table if not exists review_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_link text not null,
  property_name text,
  location text,
  check_in date,
  check_out date,
  budget_offer text,
  notes text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'fulfilled', 'declined')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists review_requests_user_id_idx on review_requests(user_id);
create index if not exists review_requests_status_idx on review_requests(status);

alter table review_requests enable row level security;

-- Anyone signed in can submit a request for themselves, and it always
-- starts out 'open' — they can't set their own status.
drop policy if exists review_requests_insert_own_open on review_requests;
create policy review_requests_insert_own_open on review_requests
  for insert
  with check (auth.uid() = user_id and status = 'open');

-- A user can see their own requests, in any status. Alexander (the
-- hardcoded admin email — keep this in sync with src/lib/admin.js) can see
-- every request, since he's the one fulfilling them.
drop policy if exists review_requests_select_own_or_admin on review_requests;
create policy review_requests_select_own_or_admin on review_requests
  for select
  using (auth.uid() = user_id or (auth.jwt() ->> 'email') = 'agg200305@gmail.com');

-- Only the admin can update a request (move it through in_progress /
-- fulfilled / declined, leave an admin note).
drop policy if exists review_requests_update_admin_only on review_requests;
create policy review_requests_update_admin_only on review_requests
  for update
  using ((auth.jwt() ->> 'email') = 'agg200305@gmail.com');
