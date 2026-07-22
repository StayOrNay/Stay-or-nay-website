// Matching a pasted booking link (Booking.com / Airbnb / Vrbo / anything)
// against the property_link stored on our reviews. People rarely paste the
// exact same URL twice — tracking params, mobile subdomains, trailing
// slashes and localized paths all differ — so both sides are reduced to a
// stable "listing key" before comparing:
//   - Airbnb: the numeric room id (airbnb:12345678)
//   - Booking.com: the hotel slug (booking:villa-mawar-bali)
//   - Vrbo: the numeric listing id (vrbo:1234567)
//   - anything else: scheme/www/query-stripped lowercased URL
export function normalizeListingUrl(raw) {
  if (!raw) return '';
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/^m\./, '');
  s = s.split('?')[0].split('#')[0];
  s = s.replace(/\/+$/, '');
  return s;
}

export function listingKey(raw) {
  const s = normalizeListingUrl(raw);
  if (!s) return '';
  const airbnb = s.match(/airbnb\.[a-z.]+\/rooms\/(?:plus\/)?(\d+)/);
  if (airbnb) return `airbnb:${airbnb[1]}`;
  const booking = s.match(/booking\.com\/hotel\/[a-z]{2}\/([a-z0-9-]+?)(?:\.[a-z-]+)?(?:\.html)?$/);
  if (booking) return `booking:${booking[1]}`;
  const vrbo = s.match(/vrbo\.com\/(\d+)/);
  if (vrbo) return `vrbo:${vrbo[1]}`;
  return s;
}

/** True when two links point at the same listing. */
export function sameListing(a, b) {
  const ka = listingKey(a);
  const kb = listingKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  // Fallback for free-form URLs: one being a sub-path of the other still
  // counts (e.g. the villa's own site with/without a /gallery path).
  return ka.length > 12 && kb.length > 12 && (ka.startsWith(kb) || kb.startsWith(ka));
}

/**
 * Find the published review (a listing object from useVillasWithReviews)
 * that matches a pasted URL or a typed property name. Returns the listing
 * or null.
 */
export function findListingMatch(query, listings) {
  const q = (query || '').trim();
  if (!q || !Array.isArray(listings)) return null;
  const looksLikeUrl = /[./]/.test(q);
  if (looksLikeUrl) {
    const byLink = listings.find((v) => v.propertyLink && sameListing(q, v.propertyLink));
    if (byLink) return byLink;
  }
  // Name match — exact first, then substring either way.
  const qn = q.toLowerCase();
  const exact = listings.find((v) => (v.name || '').toLowerCase() === qn);
  if (exact) return exact;
  return (
    listings.find((v) => {
      const n = (v.name || '').toLowerCase();
      return n && (n.includes(qn) || qn.includes(n));
    }) || null
  );
}
