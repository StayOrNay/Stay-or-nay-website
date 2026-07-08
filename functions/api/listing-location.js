// Cloudflare Pages Function — GET /api/listing-location?url=<listing url>
//
// Fetches an Airbnb or Booking.com listing SERVER-SIDE (a browser can't, due
// to cross-origin rules) and extracts the approximate map coordinates the
// page embeds, so the review form can auto-drop the map pin near the villa.
//
// Best-effort by nature: booking sites deliberately fuzz/hide the exact
// address and sometimes block bots, so this can come back empty — in which
// case the app falls back to the reviewer placing the pin by hand. It's a
// head-start, not a guarantee. Deploys automatically with the site (Cloudflare
// Pages picks up /functions), no build step or extra cost.

const ALLOWED = /(^|\.)airbnb\.[a-z.]+$|(^|\.)booking\.com$/i;

// The site is Bali-only, so prefer a Bali-range coordinate to avoid latching
// onto some unrelated lat/lng elsewhere on the page (a nearby POI, the host's
// city, etc.).
function inBali(lat, lon) {
  return lat >= -9.3 && lat <= -8.0 && lon >= 114.4 && lon <= 115.8;
}

function extractCoords(html) {
  const candidates = [];
  const push = (la, lo) => {
    const lat = parseFloat(la);
    const lon = parseFloat(lo);
    if (
      Number.isFinite(lat) && Number.isFinite(lon) &&
      Math.abs(lat) <= 90 && Math.abs(lon) <= 180 &&
      !(lat === 0 && lon === 0)
    ) {
      candidates.push({ lat, lon });
    }
  };

  let m;
  // Airbnb-style JSON: "lat":-8.65,"lng":115.13 (also latitude/longitude, listingLat/Lng)
  const reLatLng = /"(?:lat|latitude|listingLat)"\s*:\s*(-?\d{1,2}\.\d+)\s*,\s*"(?:lng|lon|longitude|listingLng)"\s*:\s*(-?\d{1,3}\.\d+)/gi;
  while ((m = reLatLng.exec(html))) push(m[1], m[2]);
  // Same pair but longitude listed first
  const reLngLat = /"(?:lng|lon|longitude|listingLng)"\s*:\s*(-?\d{1,3}\.\d+)\s*,\s*"(?:lat|latitude|listingLat)"\s*:\s*(-?\d{1,2}\.\d+)/gi;
  while ((m = reLngLat.exec(html))) push(m[2], m[1]);
  // Booking.com map attribute: data-atlas-latlng="LAT,LNG"
  const reAtlas = /data-atlas-latlng="(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)"/gi;
  while ((m = reAtlas.exec(html))) push(m[1], m[2]);
  // Static-map image URLs: ...center=LAT,LNG (or URL-encoded comma)
  const reStatic = /[?&]center=(-?\d{1,2}\.\d+)(?:,|%2C)(-?\d{1,3}\.\d+)/gi;
  while ((m = reStatic.exec(html))) push(m[1], m[2]);
  // Booking inline: latitude: '...', longitude: '...'
  const reBk = /latitude['"]?\s*[:=]\s*['"]?(-?\d{1,2}\.\d+)[^\d-]{0,40}longitude['"]?\s*[:=]\s*['"]?(-?\d{1,3}\.\d+)/gi;
  while ((m = reBk.exec(html))) push(m[1], m[2]);

  if (!candidates.length) return null;
  return candidates.find((c) => inBali(c.lat, c.lon)) || candidates[0];
}

export async function onRequest(context) {
  const { request } = context;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'content-type': 'application/json',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const reqUrl = new URL(request.url);
  const target = reqUrl.searchParams.get('url');
  if (!target) {
    return new Response(JSON.stringify({ error: 'missing url' }), { status: 400, headers: cors });
  }

  let host;
  try {
    host = new URL(target).hostname;
  } catch {
    return new Response(JSON.stringify({ error: 'bad url' }), { status: 400, headers: cors });
  }
  // Only ever fetch the booking sites we support — never an arbitrary URL (SSRF guard).
  if (!ALLOWED.test(host)) {
    return new Response(JSON.stringify({ error: 'unsupported site' }), { status: 400, headers: cors });
  }

  try {
    const res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    if (!res.ok) {
      // 200 with an error body so the client can quietly fall back to a manual pin.
      return new Response(JSON.stringify({ error: 'fetch blocked', status: res.status }), { status: 200, headers: cors });
    }
    const html = await res.text();
    const coords = extractCoords(html);
    if (!coords) {
      return new Response(JSON.stringify({ error: 'no coords found' }), { status: 200, headers: cors });
    }
    return new Response(JSON.stringify({ lat: coords.lat, lon: coords.lon, source: host }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 200, headers: cors });
  }
}
