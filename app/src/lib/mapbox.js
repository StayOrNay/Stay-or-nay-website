import mapboxgl from 'mapbox-gl';
// Vite's `?worker&inline` suffix bundles this as a base64 data-URL Worker
// constructor (IIFE, no ESM/import.meta) instead of letting mapbox-gl
// self-locate its own script URL to spawn a worker. That self-location is
// what breaks under vite-plugin-singlefile: there's no separate worker chunk
// file once everything is inlined into one HTML file, so mapbox-gl's default
// worker bootstrapping threw "Uncaught SyntaxError: Cannot use 'import.meta'
// outside a module" from a blob: URL on the live site — which silently took
// out ALL vector-tile/symbol-layer rendering (place/road/POI labels, and our
// own Bali town + beach-club label layers) while leaving the raster satellite
// imagery itself unaffected (raster tiles don't need the worker), exactly
// matching "I see the photo, just no names." `&inline` forces the worker's
// code to live as a self-contained data URL at the import site, which is
// compatible with everything being one file rather than needing its own
// fetchable chunk URL.
import MapboxWorker from 'mapbox-gl/dist/mapbox-gl-csp-worker?worker&inline';

// Public ("pk.") Mapbox access token — these are designed to be embedded in
// client-side code (this is how every Mapbox-powered website ships them).
export const MAPBOX_TOKEN =
  'pk.eyJ1Ijoic3RheW9ybmF5IiwiYSI6ImNtcTk3YnZzZjAwNGEyenBhYmN4YXhucmMifQ.ma2M8g7sBGr494NiKTu1pw';

mapboxgl.workerClass = MapboxWorker;
mapboxgl.accessToken = MAPBOX_TOKEN;

export { mapboxgl };

/**
 * Reverse-geocodes a map center into a short "Place, Country" label (e.g.
 * "Koh Tao, Thailand"), via Mapbox's own Geocoding v6 reverse endpoint —
 * so the Explore screen's location header can follow the camera anywhere
 * in the world, not just the curated Bali town list (which is decorative
 * map labels, not meant to drive app UI text).
 *
 * Tries `types=place` first (city/town/village granularity, what you'd
 * actually want in this label). Open ocean or very remote areas often have
 * no "place" there at all, so it falls back to an unfiltered reverse query
 * (locality/region/whatever's nearest) rather than returning nothing.
 * Returns null — not a placeholder string — when both come up empty, so
 * the caller can simply keep showing the last known label instead of
 * flashing something like "Unknown".
 */
export async function reverseGeocode(lon, lat) {
  const base = 'https://api.mapbox.com/search/geocode/v6/reverse';
  const common = `longitude=${lon}&latitude=${lat}&access_token=${MAPBOX_TOKEN}&limit=1`;

  async function tryQuery(extra) {
    const res = await fetch(`${base}?${common}${extra}`);
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature) return null;
    const props = feature.properties || {};
    const name = props.name || props.context?.place?.name || props.context?.locality?.name;
    const country = props.context?.country?.name;
    if (!name) return null;
    return country ? `${name}, ${country}` : name;
  }

  try {
    return (await tryQuery('&types=place,locality')) ?? (await tryQuery(''));
  } catch {
    return null;
  }
}
