import { supabase, isSupabaseConfigured } from './supabase';

// Data layer for "Request a review" — a signed-in user asks the StayOrNay
// team to (personally, for now — see lib/admin.js) go review a property
// they're booking or considering, instead of writing it themselves. No
// payment is processed here; budget_offer is just a text field, and any
// money changes hands off-platform between the requester and Alexander.
//
// Backing table: `review_requests` (see
// ../../supabase/review_requests_schema.sql for the SQL that creates it and
// its RLS policies — that file has to be run by hand in the Supabase SQL
// editor, same as reviews_schema.sql was).
const TABLE = 'review_requests';

const NOT_CONFIGURED_ERROR = {
  message: "Review requests aren't set up yet — the site owner needs to add Supabase project keys.",
};

/** Submits a new request as 'open'. */
export async function submitReviewRequest({ userId, propertyLink, propertyName, location, checkIn, checkOut, budgetOffer, notes }) {
  if (!isSupabaseConfigured) return { data: null, error: NOT_CONFIGURED_ERROR };
  return supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      property_link: propertyLink,
      property_name: propertyName || null,
      location: location || null,
      check_in: checkIn || null,
      check_out: checkOut || null,
      budget_offer: budgetOffer || null,
      notes: notes || null,
      status: 'open',
    })
    .select()
    .single();
}

/** All of the signed-in user's own requests, any status, newest first. */
export async function fetchMyReviewRequests(userId) {
  if (!isSupabaseConfigured) return { data: [], error: null };
  return supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

/** Every request, any status, oldest-open-first — the admin queue. Admin-only via RLS. */
export async function fetchAllReviewRequests() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  return supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: true });
}

/** Move a request through open → in_progress → fulfilled/declined. Admin-only via RLS. */
export async function updateReviewRequestStatus(id, status, adminNote) {
  if (!isSupabaseConfigured) return { data: null, error: NOT_CONFIGURED_ERROR };
  const patch = { status, updated_at: new Date().toISOString() };
  if (adminNote !== undefined) patch.admin_note = adminNote;
  return supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
}
