-- "Take a request" — lets any signed-in user browse the open review
-- requests other people have sent in, claim one, and (only once Alexander
-- confirms them) be the person who goes and reviews it.
--
-- The confirmation step is the whole point: claiming is NOT assignment.
-- A claim lands as 'pending' and sits there until the admin approves it.
-- Approval is the only thing that writes assigned_user_id on the request,
-- and only the admin can write that column (see the update policy on
-- review_requests in review_requests_schema.sql — unchanged here).
--
-- Safe to re-run: every `drop policy if exists` only removes a named
-- permission rule immediately before recreating it.

-- 1. The request now remembers who it was handed to, if anyone.
alter table review_requests
  add column if not exists assigned_user_id uuid references auth.users(id) on delete set null;

-- 'assigned' = a confirmed community reviewer is on it (as opposed to
-- 'in_progress', which is the admin handling it personally).
alter table review_requests drop constraint if exists review_requests_status_check;
alter table review_requests add constraint review_requests_status_check
  check (status in ('open', 'assigned', 'in_progress', 'fulfilled', 'declined'));

create index if not exists review_requests_assigned_user_idx on review_requests(assigned_user_id);

-- 2. The claims themselves.
create table if not exists review_request_claims (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references review_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  admin_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  -- One claim per person per request: taking it twice is meaningless, and
  -- this is what makes "have I already applied?" a single lookup.
  unique (request_id, user_id)
);

create index if not exists review_request_claims_request_idx on review_request_claims(request_id);
create index if not exists review_request_claims_user_idx on review_request_claims(user_id);

alter table review_request_claims enable row level security;

-- Anyone signed in can claim a request for themselves, and the claim always
-- starts 'pending' — nobody can self-approve.
drop policy if exists review_request_claims_insert_own_pending on review_request_claims;
create policy review_request_claims_insert_own_pending on review_request_claims
  for insert
  with check (auth.uid() = user_id and status = 'pending');

-- You see your own claims; the admin sees everyone's, since he's the one
-- confirming them.
drop policy if exists review_request_claims_select_own_or_admin on review_request_claims;
create policy review_request_claims_select_own_or_admin on review_request_claims
  for select
  using (auth.uid() = user_id or (auth.jwt() ->> 'email') = 'agg200305@gmail.com');

-- The admin approves/rejects. A claimant may only touch their own row to
-- withdraw it while it's still pending — the with-check clause is what
-- stops "update my own row" from becoming "approve myself".
drop policy if exists review_request_claims_update_admin on review_request_claims;
create policy review_request_claims_update_admin on review_request_claims
  for update
  using ((auth.jwt() ->> 'email') = 'agg200305@gmail.com');

drop policy if exists review_request_claims_withdraw_own on review_request_claims;
create policy review_request_claims_withdraw_own on review_request_claims
  for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'withdrawn');

-- 3. The board itself: an open request has to be readable by the people who
-- might take it, not just its author. Assigned requests stay readable by
-- the person they were assigned to, so they can still see what they took on.
drop policy if exists review_requests_select_own_or_admin on review_requests;
create policy review_requests_select_own_or_admin on review_requests
  for select
  using (
    auth.uid() = user_id
    or auth.uid() = assigned_user_id
    or (auth.role() = 'authenticated' and status = 'open')
    or (auth.jwt() ->> 'email') = 'agg200305@gmail.com'
  );
