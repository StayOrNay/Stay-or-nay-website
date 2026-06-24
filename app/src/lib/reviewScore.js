// Shared scoring rules for the real, user-submitted review system.
//
// Five categories, 10 points each, 50 points total. Anything under half
// (25/50) is a "nay" — exactly as described by the site owner. The site's
// older sample-data villas (data/villas.js) use a 0-100 scale instead
// (VerdictBadge's doc comment says "score /100"), so any time a real
// review total needs to show through the existing UI it gets doubled
// (totalToDisplayScore) — 50 real points -> 100 displayed, 25 -> 50,
// keeping the same "half is the cutoff" rule on both scales.
export const CATEGORIES = [
  { key: 'location', label: 'Location' },
  { key: 'value', label: 'Value for money' },
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'host', label: 'Host & service' },
];

export const MAX_PER_CATEGORY = 10;
export const MAX_TOTAL = CATEGORIES.length * MAX_PER_CATEGORY; // 50
export const NAY_THRESHOLD = MAX_TOTAL / 2; // 25 — total >= this is a "stay"

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
