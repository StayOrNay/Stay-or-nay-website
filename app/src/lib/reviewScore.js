// Shared scoring rules for the real, user-submitted review system.
//
// Five categories, 10 points each, 50 points total — this raw /50 total is
// the actual number shown to people everywhere a single review's score
// appears (MyReviewsScreen, ModerationScreen, VillaDetailScreen all render
// "{r.total} / {MAX_TOTAL}"), so NAY_THRESHOLD is set directly on this
// scale. Anything under 30/50 is a "nay" — per the site owner's explicit
// instruction. The site's older sample-data villas (data/villas.js) use a
// separate 0-100 scale instead (VerdictBadge's doc comment says "score
// /100"), so any time a real review total needs to feed into THAT older
// display it gets doubled (totalToDisplayScore) — 50 real points -> 100
// displayed — but that's only ever used for the aggregate villa-card score
// in useVillasWithReviews, never for a single review's own total.
export const CATEGORIES = [
  { key: 'location', label: 'Location' },
  { key: 'value', label: 'Value for money' },
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'host', label: 'Host & service' },
];

export const MAX_PER_CATEGORY = 10;
export const MAX_TOTAL = CATEGORIES.length * MAX_PER_CATEGORY; // 50
export const NAY_THRESHOLD = 30; // total >= this is a "stay"; under 30 is a "nay" (site owner's explicit cutoff)

// Minimum media required to submit a review — also the site owner's
// explicit instruction. Classified by each File's MIME type at upload
// time (file.type.startsWith('image/') / 'video/').
export const MIN_PHOTOS = 5;
export const MIN_VIDEOS = 2;

export function emptyScores() {
  return CATEGORIES.reduce((acc, c) => ({ ...acc, [c.key]: 0 }), {});
}

export function totalFromCategories(scores) {
  return CATEGORIES.reduce((sum, c) => sum + (Number(scores[c.key]) || 0), 0);
}

export function verdictFromTotal(total) {
  return total >= NAY_THRESHOLD ? 'stay' : 'nay';
}

// Converts a 0-50 review total onto the legacy 0-100 display scale used by
// VerdictBadge / villas.js sample data.
export function totalToDisplayScore(total) {
  return Math.round(total * 2);
}
