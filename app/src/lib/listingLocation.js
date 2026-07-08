// Client side of the "read the villa's location from its booking link" flow.
// Calls our own /api/listing-location Cloudflare Pages Function (see
// functions/api/listing-location.js), which does the actual server-side fetch
// and coordinate extraction. Returns { lat, lon } or null — always resolves,
// never throws, so a failure just leaves the reviewer to place the pin.

export function looksLikeListingUrl(url) {
  return /https?:\/\/[^\s]*(airbnb\.[a-z.]+|booking\.com)/i.test(url || '');
}

export async function locateFromListing(link) {
  const url = (link || '').trim();
  if (!looksLikeListingUrl(url)) return null;
  try {
    const res = await fetch(`/api/listing-location?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.lat === 'number' && typeof data.lon === 'number') {
      return { lat: data.lat, lon: data.lon };
    }
    return null;
  } catch {
    return null;
  }
}
