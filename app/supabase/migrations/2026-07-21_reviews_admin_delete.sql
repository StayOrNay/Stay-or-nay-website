-- Lets the admin account permanently delete a published review from the
-- admin editor ("Edit published reviews" screen). Without this policy,
-- delete requests from the app silently affect 0 rows.
--
-- Run this by hand in the Supabase SQL editor (like the other migrations).
-- Keep the email in sync with app/src/lib/admin.js ADMIN_EMAILS.

drop policy if exists "reviews_delete_admin_only" on public.reviews;
create policy "reviews_delete_admin_only"
  on public.reviews for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'agg200305@gmail.com');
