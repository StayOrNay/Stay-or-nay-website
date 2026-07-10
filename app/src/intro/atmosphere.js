import { antisolarPoint, hemisphereRing, angularDistanceDeg, MAJOR_CITIES, scatterCityLights } from './terminator';

/**
 * The "real Earth from space" dressing, extracted from GlobeIntro so the
 * landing experience can wear it too: yesterday's real NASA GIBS cloud
 * pass, the true astronomical day/night terminator with a scatter of
 * twinkling city lights on the night side, and pale polar ice caps
 * covering the Web-Mercator hole at the poles. All layers are decorative
 * and defensive — a failure in any of them must never block the page.
 *
 * Usage: call addAtmosphere(map) on 'style.load', then setAtmosphere(map,
 * {night, clouds, twinkle}) whenever the camera moves (night/clouds are
 * 0..1 fade factors — fade them out as the camera dives so street level
 * isn't smeared with overzoomed clouds or a night polygon).
 */

const NIGHT_CORE_OPACITY = 0.6;
const NIGHT_EDGE_OPACITY = 0.28;
const CITY_GLOW_OPACITY = 0.6;
const CITY_CORE_OPACITY = 1;
export const CITY_TWINKLE_AMP = 0.22;

const CLOUD_OPACITY = 0.45;
export const CLOUD_FADE_START_ZOOM = 5;
export const CLOUD_FADE_END_ZOOM = 8;

const ICE_CAP_RADIUS_DEG = 5.6;
const ICE_CAP_COLOR = '#eef2f5';
const ICE_CAP_OPACITY = 0.88;

function gibsCloudUrl() {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday UTC — guaranteed processed
  const day = d.toISOString().slice(0, 10);
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${day}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
}

// Circle of constant latitude around a pole (see GlobeIntro's capRing for
// why this doesn't reuse the spherical-trig helpers: they're degenerate at
// the poles).
function capRing(poleLat, radiusDeg, steps = 72) {
  const lat = poleLat > 0 ? 90 - radiusDeg : -90 + radiusDeg;
  const ring = [];
  for (let i = 0; i <= steps; i++) {
    ring.push([-180 + (360 * i) / steps, lat]);
  }
  return ring;
}

export function addAtmosphere(map) {
  // Clouds first, then ice caps, then night — the night fill must darken
  // both (they share the 'bottom' slot, later additions render on top).
  try {
    if (!map.getSource('clouds')) {
      map.addSource('clouds', { type: 'raster', tiles: [gibsCloudUrl()], tileSize: 256, maxzoom: 9 });
      map.addLayer({
        id: 'clouds',
        type: 'raster',
        source: 'clouds',
        slot: 'bottom',
        maxzoom: 9, // backstop against overzoomed z9 tiles smearing street level
        paint: {
          'raster-opacity': CLOUD_OPACITY,
          'raster-saturation': -1,
          'raster-contrast': 0.75,
          'raster-brightness-min': 0.35,
          'raster-brightness-max': 1,
        },
      });
    }
  } catch (err) {
    // Bonus layer only.
  }

  [['ice-cap-north', 90], ['ice-cap-south', -90]].forEach(([id, poleLat]) => {
    try {
      if (map.getSource(id)) return;
      map.addSource(id, {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [capRing(poleLat, ICE_CAP_RADIUS_DEG)] } },
      });
      map.addLayer({ id, type: 'fill', source: id, slot: 'bottom', paint: { 'fill-color': ICE_CAP_COLOR, 'fill-opacity': ICE_CAP_OPACITY } });
    } catch (err) {
      // Decorative only.
    }
  });

  try {
    const night = antisolarPoint(new Date());
    const ringToCoords = (ring) => ring.map(([lon, lat]) => [lon, lat]);
    const core = ringToCoords(hemisphereRing(night, 84));
    const edge = ringToCoords(hemisphereRing(night, 90));

    map.addSource('night-core', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [core] } } });
    map.addLayer({ id: 'night-core', type: 'fill', source: 'night-core', slot: 'bottom', paint: { 'fill-color': '#03060f', 'fill-opacity': NIGHT_CORE_OPACITY } });

    map.addSource('night-edge', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [edge, core.slice().reverse()] } } });
    map.addLayer({ id: 'night-edge', type: 'fill', source: 'night-edge', slot: 'bottom', paint: { 'fill-color': '#03060f', 'fill-opacity': NIGHT_EDGE_OPACITY } });

    const nightLights = scatterCityLights(MAJOR_CITIES).filter(
      ([lon, lat]) => angularDistanceDeg(lon, lat, night.lon, night.lat) < 88,
    );
    const cityFeatures = nightLights.map(([lon, lat, weight]) => ({
      type: 'Feature',
      properties: { weight },
      geometry: { type: 'Point', coordinates: [lon, lat] },
    }));
    map.addSource('city-lights', { type: 'geojson', data: { type: 'FeatureCollection', features: cityFeatures } });
    map.addLayer({
      id: 'city-glow',
      type: 'circle',
      source: 'city-lights',
      slot: 'bottom',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0.25, 3, 1, 10, 3, 24],
        'circle-color': '#ffcf6e',
        'circle-blur': 0.9,
        'circle-opacity': CITY_GLOW_OPACITY,
      },
    });
    map.addLayer({
      id: 'city-core',
      type: 'circle',
      source: 'city-lights',
      slot: 'bottom',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0.25, 1, 1, 2.2, 3, 4.5],
        'circle-color': '#fff6e0',
        'circle-blur': 0.15,
        'circle-opacity': CITY_CORE_OPACITY,
      },
    });
  } catch (err) {
    // Decorative only.
  }
}

/** night/clouds: 0..1 fade factors; twinkle: ~1 ± CITY_TWINKLE_AMP, city layers only. */
export function setAtmosphere(map, { night = 1, clouds = 1, twinkle = 1 } = {}) {
  try {
    map.setPaintProperty('night-core', 'fill-opacity', NIGHT_CORE_OPACITY * night);
    map.setPaintProperty('night-edge', 'fill-opacity', NIGHT_EDGE_OPACITY * night);
    map.setPaintProperty('city-glow', 'circle-opacity', CITY_GLOW_OPACITY * night * twinkle);
    map.setPaintProperty('city-core', 'circle-opacity', CITY_CORE_OPACITY * night * twinkle);
  } catch (err) {
    // Layers may not exist yet — never throw.
  }
  try {
    map.setPaintProperty('clouds', 'raster-opacity', CLOUD_OPACITY * clouds);
  } catch (err) {
    // ditto
  }
}
