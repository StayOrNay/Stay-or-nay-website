/**
 * Curated named places for Bali, rendered as their own text-label layers on
 * both the globe intro and the live Explore map — guaranteeing the names a
 * visitor would actually expect to see show up (cities, towns, and beach
 * clubs), regardless of what Mapbox's own place/POI-label dataset has at any
 * given zoom level. Coordinates are approximate, accurate enough for a label
 * pin, not for navigation.
 */
export const BALI_TOWNS = [
  // South Bali
  { name: 'Canggu', lon: 115.1385, lat: -8.6478, region: 'South', type: 'town' },
  { name: 'Seminyak', lon: 115.1656, lat: -8.6905, region: 'South', type: 'town' },
  { name: 'Kuta', lon: 115.1686, lat: -8.7184, region: 'South', type: 'town' },
  { name: 'Legian', lon: 115.1567, lat: -8.7037, region: 'South', type: 'town' },
  { name: 'Uluwatu', lon: 115.0879, lat: -8.829, region: 'South', type: 'town' },
  { name: 'Jimbaran', lon: 115.1686, lat: -8.7903, region: 'South', type: 'town' },
  { name: 'Nusa Dua', lon: 115.2233, lat: -8.8008, region: 'South', type: 'town' },
  { name: 'Sanur', lon: 115.2625, lat: -8.6939, region: 'South', type: 'town' },
  // Denpasar is Bali's provincial capital and largest city by far — sized
  // up via the 'city' type so it reads with more weight than the resort towns.
  { name: 'Denpasar', lon: 115.2126, lat: -8.6705, region: 'South', type: 'city' },
  // Central Bali
  { name: 'Ubud', lon: 115.2625, lat: -8.5069, region: 'Central', type: 'town' },
  { name: 'Tegallalang', lon: 115.2778, lat: -8.431, region: 'Central', type: 'town' },
  { name: 'Payangan', lon: 115.2333, lat: -8.4167, region: 'Central', type: 'town' },
  { name: 'Sidemen', lon: 115.4167, lat: -8.407, region: 'Central', type: 'town' },
  // North Bali
  { name: 'Lovina', lon: 115.0259, lat: -8.1582, region: 'North', type: 'town' },
  // Singaraja is North Bali's regency capital and second-largest city.
  { name: 'Singaraja', lon: 115.0881, lat: -8.112, region: 'North', type: 'city' },
  { name: 'Munduk', lon: 115.1167, lat: -8.2667, region: 'North', type: 'town' },
  // East Bali
  { name: 'Amlapura', lon: 115.6167, lat: -8.45, region: 'East', type: 'town' },
  { name: 'Candidasa', lon: 115.5667, lat: -8.5, region: 'East', type: 'town' },
  { name: 'Padangbai', lon: 115.5083, lat: -8.5333, region: 'East', type: 'town' },
  // West Bali
  { name: 'Pemuteran', lon: 114.6333, lat: -8.1333, region: 'West', type: 'town' },
  { name: 'Medewi', lon: 114.8167, lat: -8.4167, region: 'West', type: 'town' },
  { name: 'Gilimanuk', lon: 114.4333, lat: -8.1667, region: 'West', type: 'town' },
];

/**
 * Well-known, currently-operating Bali beach clubs, spread across the main
 * resort areas (Canggu/Berawa, Seminyak, the Uluwatu/Bukit cliffs, Nusa Dua,
 * and Jimbaran). Verified against current (2026) guides rather than assumed
 * from older sources, since beach clubs open/close/rebrand often — e.g.
 * Omnia Day Club's site in Uluwatu has rebranded to Savaya, so Omnia is
 * intentionally left out to avoid labeling a name that no longer applies
 * there. Coordinates are anchored to the actual beach/cliff segment each
 * club sits on, not full street-address precision.
 */
export const BALI_BEACH_CLUBS = [
  // Canggu / Berawa
  { name: "Finns Beach Club", lon: 115.134, lat: -8.661, region: 'South', type: 'beach_club' },
  { name: 'La Brisa', lon: 115.1265, lat: -8.6685, region: 'South', type: 'beach_club' },
  { name: 'The Lawn Canggu', lon: 115.1295, lat: -8.6555, region: 'South', type: 'beach_club' },
  { name: 'Atlas Beach Club', lon: 115.13, lat: -8.652, region: 'South', type: 'beach_club' },
  { name: "Old Man's", lon: 115.1305, lat: -8.654, region: 'South', type: 'beach_club' },
  // Seminyak
  { name: 'Potato Head Beach Club', lon: 115.158, lat: -8.6845, region: 'South', type: 'beach_club' },
  { name: 'Ku De Ta', lon: 115.1605, lat: -8.6875, region: 'South', type: 'beach_club' },
  { name: 'Mrs Sippy', lon: 115.162, lat: -8.679, region: 'South', type: 'beach_club' },
  // Jimbaran
  { name: 'Sundara Beach Club', lon: 115.1565, lat: -8.7765, region: 'South', type: 'beach_club' },
  // Uluwatu / Bukit Peninsula
  { name: 'Savaya Bali', lon: 115.109, lat: -8.8295, region: 'South', type: 'beach_club' },
  { name: 'El Kabron', lon: 115.113, lat: -8.821, region: 'South', type: 'beach_club' },
  { name: 'Ulu Cliffhouse', lon: 115.089, lat: -8.8155, region: 'South', type: 'beach_club' },
  { name: 'Single Fin', lon: 115.0885, lat: -8.816, region: 'South', type: 'beach_club' },
  { name: 'Tropical Temptation', lon: 115.1145, lat: -8.7975, region: 'South', type: 'beach_club' },
  // Ungasan
  { name: 'Sundays Beach Club', lon: 115.173, lat: -8.848, region: 'South', type: 'beach_club' },
  { name: 'Karma Beach', lon: 115.168, lat: -8.842, region: 'South', type: 'beach_club' },
  // Nusa Dua
  { name: 'Canna Bali', lon: 115.227, lat: -8.802, region: 'South', type: 'beach_club' },
];

function placesToFeatureCollection(places) {
  return {
    type: 'FeatureCollection',
    features: places.map((p) => ({
      type: 'Feature',
      properties: { name: p.name, type: p.type },
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    })),
  };
}

/**
 * Adds the towns/cities above as a text-label symbol layer. Idempotent — safe
 * to call again on style reloads since it checks for the source first.
 */
export function addBaliTownLabels(map) {
  if (!map.getSource('bali-towns')) {
    map.addSource('bali-towns', { type: 'geojson', data: placesToFeatureCollection(BALI_TOWNS) });

    map.addLayer({
      id: 'bali-towns-label',
      type: 'symbol',
      source: 'bali-towns',
      // Mapbox Standard / Standard Satellite (v3) place custom layers using
      // 'slot' rather than layer-id-relative ordering — without one, a
      // custom layer's position in the merged style-import stack isn't
      // guaranteed, and a symbol layer added this way can end up rendering
      // with no visible error at all (per Mapbox's own docs on the Standard
      // style's layer-insertion model). 'top' keeps these above the
      // satellite imagery and roads/place labels.
      slot: 'top',
      layout: {
        'text-field': ['get', 'name'],
        // Explicit rather than relying on the style-spec default applying
        // itself — addLayer() at runtime doesn't always inherit that
        // default the way a font declared in a parsed style JSON does, and
        // an unset/unresolved text-font renders no glyphs at all with no
        // thrown error. Both names are in Mapbox's standard, always-on
        // glyph set (not custom/account-specific).
        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        // Cities (currently just Denpasar/Singaraja) read with more visual
        // weight than the resort towns around them.
        'text-size': ['match', ['get', 'type'], 'city', 15, 13],
        'text-anchor': 'center',
        // On a Standard Satellite map with place/POI/road labels also
        // turned on, these compete with the basemap's own labels for the
        // same screen space; allow-overlap keeps ours showing even if it
        // loses that collision priority instead of silently never
        // rendering.
        'text-allow-overlap': true,
        'text-ignore-placement': true,
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
  // Beach-club labels were tried (amber, smaller, offset below the town
  // labels) but removed per explicit feedback — they read as visual clutter
  // ("remove the yellow text") on top of an already label-dense map.
}
