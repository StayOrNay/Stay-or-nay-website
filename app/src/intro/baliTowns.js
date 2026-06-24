/**
 * Curated list of Bali's well-known towns, grouped by region. Mapbox's
 * built-in place labels don't reliably cover the smaller ones (e.g.
 * Tegallalang, Munduk, Gilimanuk), so these are rendered as their own
 * text-label layer on both the globe intro and the live Explore map —
 * guaranteeing the names a visitor would actually expect to see show up,
 * regardless of what Mapbox's own place-label dataset has at any given
 * zoom level. Coordinates are approximate town-center positions, accurate
 * enough for a label pin, not for navigation.
 */
export const BALI_TOWNS = [
  // South Bali
  { name: 'Canggu', lon: 115.1385, lat: -8.6478, region: 'South' },
  { name: 'Seminyak', lon: 115.1656, lat: -8.6905, region: 'South' },
  { name: 'Kuta', lon: 115.1686, lat: -8.7184, region: 'South' },
  { name: 'Legian', lon: 115.1567, lat: -8.7037, region: 'South' },
  { name: 'Uluwatu', lon: 115.0879, lat: -8.829, region: 'South' },
  { name: 'Jimbaran', lon: 115.1686, lat: -8.7903, region: 'South' },
  { name: 'Nusa Dua', lon: 115.2233, lat: -8.8008, region: 'South' },
  { name: 'Sanur', lon: 115.2625, lat: -8.6939, region: 'South' },
  { name: 'Denpasar', lon: 115.2126, lat: -8.6705, region: 'South' },
  // Central Bali
  { name: 'Ubud', lon: 115.2625, lat: -8.5069, region: 'Central' },
  { name: 'Tegallalang', lon: 115.2778, lat: -8.431, region: 'Central' },
  { name: 'Payangan', lon: 115.2333, lat: -8.4167, region: 'Central' },
  { name: 'Sidemen', lon: 115.4167, lat: -8.407, region: 'Central' },
  // North Bali
  { name: 'Lovina', lon: 115.0259, lat: -8.1582, region: 'North' },
  { name: 'Singaraja', lon: 115.0881, lat: -8.112, region: 'North' },
  { name: 'Munduk', lon: 115.1167, lat: -8.2667, region: 'North' },
  // East Bali
  { name: 'Amlapura', lon: 115.6167, lat: -8.45, region: 'East' },
  { name: 'Candidasa', lon: 115.5667, lat: -8.5, region: 'East' },
  { name: 'Padangbai', lon: 115.5083, lat: -8.5333, region: 'East' },
  // West Bali
  { name: 'Pemuteran', lon: 114.6333, lat: -8.1333, region: 'West' },
  { name: 'Medewi', lon: 114.8167, lat: -8.4167, region: 'West' },
  { name: 'Gilimanuk', lon: 114.4333, lat: -8.1667, region: 'West' },
];

/**
 * Adds the towns above as a single text-label symbol layer. Idempotent —
 * safe to call again on style reloads since it checks for the source first.
 */
export function addBaliTownLabels(map) {
  if (map.getSource('bali-towns')) return;

  map.addSource('bali-towns', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: BALI_TOWNS.map((t) => ({
        type: 'Feature',
        properties: { name: t.name },
        geometry: { type: 'Point', coordinates: [t.lon, t.lat] },
      })),
    },
  });

  map.addLayer({
    id: 'bali-towns-label',
    type: 'symbol',
    source: 'bali-towns',
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 13,
      'text-anchor': 'center',
      'text-allow-overlap': false,
      'text-padding': 4,
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': 'rgba(3,4,10,0.85)',
      'text-halo-width': 1.4,
      'text-halo-blur': 0.3,
    },
  });
}
