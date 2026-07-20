import { supabase, isSupabaseConfigured } from './supabase';
import { totalFromCategories, verdictFromTotal } from './reviewScore';

// Data layer for the real, user-submitted review system. Mirrors the
// AuthContext/lib/supabase.js pattern: every function no-ops with a
// friendly error if Supabase isn't configured yet, instead of throwing.
//
// Backing table: `reviews` (see ../../supabase/reviews_schema.sql for the
// SQL that creates it, its RLS policies, and the `review-media` storage
// bucket — that file has to be run by hand in the Supabase SQL editor,
// it isn't something this app can create itself with the public anon key).
const TABLE = 'reviews';
const BUCKET = 'review-media';

const NOT_CONFIGURED_ERROR = {
  message: "Reviews aren't set up yet — the site owner needs to add Supabase project keys.",
};

/**
 * Uploads each File to Supabase Storage under a per-user folder and returns
 * their public URLs. Stops and returns what succeeded so far on the first
 * failure, with the error attached.
 */
export async function uploadReviewMedia(files, userId) {
  if (!isSupabaseConfigured) return { urls: [], error: NOT_CONFIGURED_ERROR };
  const urls = [];
  for (const file of files) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) return { urls, error };
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return { urls, error: null };
}

/**
 * Submits a new review as `pending` — it won't show anywhere public until
 * the site owner approves it via the moderation queue.
 *
 * Reviews are written against a property the visitor links + names
 * themselves (propertyLink/propertyName) — exactly like "Request a
 * review" — not against the small set of placeholder villas in
 * data/villas.js, which are temporary demo content. villa_id is kept only
 * for the legacy seed-villa reviews that already exist; new submissions
 * always leave it null.
 */
export async function submitReview({ propertyLink, propertyName, userId, reviewerName = null, scores, headline, body, mediaUrls = [], beds = null, pricePaid = null, currency = '$', area = null, lat = null, lon = null }) {
  if (!isSupabaseConfigured) return { data: null, error: NOT_CONFIGURED_ERROR };
  const total = totalFromCategories(scores);
  const verdict = verdictFromTotal(total);
  const row = {
    villa_id: null,
    property_link: propertyLink,
    property_name: propertyName,
    user_id: userId,
    reviewer_name: reviewerName,
    score_location: scores.location,
    score_value: scores.value,
    score_cleanliness: scores.cleanliness,
    score_amenities: scores.amenities,
    score_host: scores.host,
    total,
    verdict,
    headline,
    body,
    media_urls: mediaUrls,
    beds,
    price_paid: pricePaid,
    currency,
    area,
    lat,
    lon,
    status: 'pending',
  };

  const insert = (payload) => supabase.from(TABLE).insert(payload).select().single();

  let result = await insert(row);

  // Schema-drift safety net: the live DB only gains new columns when a
  // migration from supabase/migrations/ is pasted into the SQL editor by
  // hand, so the code can briefly be ahead of the table ("Could not find
  // the 'X' column of 'reviews' in the schema cache", PGRST204). Rather
  // than losing the visitor's finished review (media already uploaded!)
  // over an optional column, strip the columns PostgREST names as missing
  // and retry — never dropping the fields a review can't exist without.
  const REQUIRED = ['property_link', 'property_name', 'user_id', 'total', 'verdict', 'headline', 'body', 'media_urls', 'status'];
  let attempts = 0;
  while (result.error && attempts < 6) {
    const missing = /Could not find the '([^']+)' column/.exec(result.error.message || '')?.[1];
    if (!missing || REQUIRED.includes(missing) || !(missing in row)) break;
    // eslint-disable-next-line no-console
    console.warn(`reviews table is missing optional column "${missing}" — submitting without it. Run the pending SQL migration in supabase/migrations/ to keep this data.`);
    delete row[missing];
    attempts += 1;
    result = await insert(row);
  }
  return result;
}

/** All of the signed-in user's own reviews, any status, newest first. */
export async function fetchMyReviews(userId) {
  if (!isSupabaseConfigured) return { data: [], error: null };
  return supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

/** Approved reviews for one villa — what the public detail page shows. */
export async function fetchApprovedReviewsForVilla(villaId) {
  if (!isSupabaseConfigured) return { data: [], error: null };
  return supabase
    .from(TABLE)
    .select('*')
    .eq('villa_id', villaId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
}

/** Every approved review across all villas — used to recompute villa scores. */
export async function fetchAllApprovedReviews() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  return supabase.from(TABLE).select('*').eq('status', 'approved');
}

/**
 * Admin edit of an already-published review — patch any of location
 * (lat/lon/area), the write-up (headline/body) or the property name. Only the
 * admin email can do this (enforced by the reviews_update_admin_only RLS
 * policy, the same one moderation uses).
 */
export async function updateReview(id, patch) {
  if (!isSupabaseConfigured) return { data: null, error: NOT_CONFIGURED_ERROR };
  // Same schema-drift safety net as submitReview: if the live DB hasn't had
  // a migration run yet (PGRST204 "Could not find the 'X' column"), strip
  // the missing optional column and retry instead of failing the whole save.
  const p = { ...patch };
  const run = () => supabase.from(TABLE).update(p).eq('id', id).select().single();
  let result = await run();
  let attempts = 0;
  while (result.error && attempts < 6) {
    const missing = /Could not find the '([^']+)' column/.exec(result.error.message || '')?.[1];
    if (!missing || !(missing in p)) break;
    // eslint-disable-next-line no-console
    console.warn(`reviews table is missing column "${missing}" — saving without it. Run the pending SQL migration in supabase/migrations/ to keep this field.`);
    delete p[missing];
    attempts += 1;
    if (Object.keys(p).length === 0) break;
    result = await run();
  }
  return result;
}

/**
 * Permanently delete a review row. Admin-only via the reviews_delete_admin_only
 * RLS policy (supabase/migrations/2026-07-21_reviews_admin_delete.sql — must be
 * run in the Supabase SQL editor before this works; without it the delete
 * silently affects 0 rows, which we surface as an error).
 */
export async function deleteReview(id) {
  if (!isSupabaseConfigured) return { data: null, error: NOT_CONFIGURED_ERROR };
  const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select();
  if (error) return { data, error };
  if (!data || data.length === 0) {
    return { data, error: { message: 'Nothing was deleted — run the 2026-07-21_reviews_admin_delete.sql migration in the Supabase SQL editor to enable admin deletes.' } };
  }
  return { data, error: null };
}

/** The moderation queue — oldest pending review first. Admin-only via RLS. */
export async function fetchPendingReviews() {
  if (!isSupabaseConfigured) return { data: [], error: null };
  return supabase
    .from(TABLE)
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
}

/** Approve or reject a pending review. Admin-only via RLS. */
export async function moderateReview(id, status) {
  if (!isSupabaseConfigured) return { data: null, error: NOT_CONFIGURED_ERROR };
  return supabase
    .from(TABLE)
    .update({ status, moderated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}
