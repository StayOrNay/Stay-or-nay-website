import { supabase, isSupabaseConfigured } from './supabase';

// Data layer for "Request a review" — a signed-in user asks the StayOrNay
// team to (personally, for now — see lib/admin.js) go review a property
// they're booking or considering, instead of writing it themselves. Free
// for the requester — no payment is collected or processed anywhere.
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
export async function submitReviewRequest({ userId, propertyLink, propertyName, location, checkIn, checkOut, notes }) {
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

// ---------------------------------------------------------------------------
// "Take a request" — the community side of the same table.
//
// A signed-in user browses the open requests, claims one, and waits: the
// claim is 'pending' until Alexander confirms them. Nothing about claiming
// changes who the request belongs to — approveClaim() is the only function
// that writes assigned_user_id, and Supabase RLS only lets the admin do it.
// See ../../supabase/migrations/2026-08-28_review_request_claims.sql.
// ---------------------------------------------------------------------------
const CLAIMS_TABLE = 'review_request_claims';

/** The public board: every request still open, newest first. Any signed-in user. */
export async function fetchOpenReviewRequests() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  return supabase
    .from(TABLE)
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
}

/** The requests this user was confirmed for, newest first. */
export async function fetchAssignedReviewRequests(userId) {
  if (!isSupabaseConfigured) return { data: [], error: null };
  return supabase
    .from(TABLE)
    .select('*')
    .eq('assigned_user_id', userId)
    .order('updated_at', { ascending: false });
}

/** Puts your hand up for a request. Always lands as 'pending'. */
export async function claimReviewRequest({ requestId, userId, displayName, message }) {
  if (!isSupabaseConfigured) return { data: null, error: NOT_CONFIGURED_ERROR };
  return supabase
    .from(CLAIMS_TABLE)
    .insert({
      request_id: requestId,
      user_id: userId,
      display_name: displayName || null,
      message: message || null,
      status: 'pending',
    })
    .select()
    .single();
}

/** Your own claims, any status — what powers "waiting on confirmation". */
export async function fetchMyClaims(userId) {
  if (!isSupabaseConfigured) return { data: [], error: null };
  return supabase
    .from(CLAIMS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

/** Take your hand back down. Only works while the claim is still pending. */
export async function withdrawClaim(claimId) {
  if (!isSupabaseConfigured) return { data: null, error: NOT_CONFIGURED_ERROR };
  return supabase
    .from(CLAIMS_TABLE)
    .update({ status: 'withdrawn', decided_at: new Date().toISOString() })
    .eq('id', claimId)
    .select()
    .single();
}

/** Every claim on every request — the admin's confirmation queue. Admin-only via RLS. */
export async function fetchAllClaims() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  return supabase
    .from(CLAIMS_TABLE)
    .select('*')
    .order('created_at', { ascending: true });
}

/**
 * Confirm a claimant. This is the gate the whole feature exists for: it's
 * the only path that hands a request to someone.
 *
 * Three writes, admin-only, in the order that fails safe — the request is
 * assigned first, so a failure halfway can never leave an approved claim
 * pointing at a request nobody owns. The losing claims are rejected last
 * because that's the only cosmetic step.
 */
export async function approveClaim(claim) {
  if (!isSupabaseConfigured) return { data: null, error: NOT_CONFIGURED_ERROR };
  const now = new Date().toISOString();

  const { error: assignError } = await supabase
    .from(TABLE)
    .update({ assigned_user_id: claim.user_id, status: 'assigned', updated_at: now })
    .eq('id', claim.request_id);
  if (assignError) return { data: null, error: assignError };

  const { data, error } = await supabase
    .from(CLAIMS_TABLE)
    .update({ status: 'approved', decided_at: now })
    .eq('id', claim.id)
    .select()
    .single();
  if (error) return { data: null, error };

  // Everyone else who put their hand up for this one is out.
  await supabase
    .from(CLAIMS_TABLE)
    .update({ status: 'rejected', decided_at: now })
    .eq('request_id', claim.request_id)
    .eq('status', 'pending')
    .neq('id', claim.id);

  return { data, error: null };
}

/** Turn a single claimant down, leaving the request open for others. Admin-only. */
export async function rejectClaim(claimId, adminNote) {
  if (!isSupabaseConfigured) return { data: null, error: NOT_CONFIGURED_ERROR };
  const patch = { status: 'rejected', decided_at: new Date().toISOString() };
  if (adminNote !== undefined) patch.admin_note = adminNote;
  return supabase
    .from(CLAIMS_TABLE)
    .update(patch)
    .eq('id', claimId)
    .select()
    .single();
}
