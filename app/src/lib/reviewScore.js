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
  {
    key: 'location',
    label: 'Location',
    hint: 'How easy the place was to reach and get around from — nearby beaches, food and transport, plus how quiet or noisy it was.',
  },
  {
    key: 'value',
    label: 'Value for money',
    hint: 'Whether the price felt fair for what you actually got.',
  },
  {
    key: 'cleanliness',
    label: 'Cleanliness',
    hint: 'How clean and well-kept the place was on arrival and throughout your stay.',
  },
  {
    key: 'amenities',
    label: 'Amenities',
    hint: 'What the place provides and how good it is — pool, kitchen, wifi, air-con and any extras.',
  },
  {
    key: 'host',
    label: 'Host & service',
    hint: 'How responsive, helpful and welcoming the host or staff were.',
  },
];

export const MAX_PER_CATEGORY = 10;
export const MAX_TOTAL = CATEGORIES.length * MAX_PER_CATEGORY; // 50
export const NAY_THRESHOLD = 30; // total >= this is a "stay"; under 30 is a "nay" (site owner's explicit cutoff)

// Minimum media required to submit a review — also the site owner's
// explicit instruction. Classified by each File's MIME type at upload
// time (file.type.startsWith('image/') / 'video/').
export const MIN_PHOTOS = 3;
export const MIN_VIDEOS = 1;

// A review's write-up must be at least this many characters — enough to be
// a "solid description", not a one-word drive-by.
export const MIN_BODY_CHARS = 60;

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
