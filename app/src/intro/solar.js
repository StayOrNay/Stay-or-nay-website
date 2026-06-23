// Real solar-position math (no faked lighting): standard low-precision solar
// coordinates (NOAA / Meeus-style approximations), accurate to a fraction of
// a degree — plenty for a visible, real day/night terminator on the globe.
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Subsolar point: the lon/lat where the sun is directly overhead right now. */
export function getSubsolarPoint(date = new Date()) {
  const jd = julianDay(date);
  const d = jd - 2451545.0; // days since J2000.0

  const meanLon = (280.46 + 0.9856474 * d) % 360;
  const meanAnomaly = (357.528 + 0.9856003 * d) % 360;
  const eclipticLon =
    meanLon +
    1.915 * Math.sin(meanAnomaly * RAD) +
    0.02 * Math.sin(2 * meanAnomaly * RAD);

  const obliquity = 23.439 - 0.0000004 * d;
  const declination = Math.asin(Math.sin(obliquity * RAD) * Math.sin(eclipticLon * RAD)) * DEG;

  const y = Math.tan((obliquity * RAD) / 2) ** 2;
  const eqTime =
    DEG *
    4 *
    (y * Math.sin(2 * meanLon * RAD) -
      2 * 0.0167 * Math.sin(meanAnomaly * RAD) +
      4 * 0.0167 * y * Math.sin(meanAnomaly * RAD) * Math.cos(2 * meanLon * RAD) -
      0.5 * y * y * Math.sin(4 * meanLon * RAD) -
      1.25 * 0.0167 * 0.0167 * Math.sin(2 * meanAnomaly * RAD));

  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const solarLon = -15 * (utcHours - 12 + eqTime / 60);
  const lon = (((solarLon + 180) % 360) + 360) % 360 - 180;

  return { lon, lat: declination };
}

/**
 * Real day/night terminator as a GeoJSON polygon covering the night
 * hemisphere. Derived from the sun-altitude-zero condition
 * tan(lat) = -cos(hourAngle) / tan(declination), sampled across every
 * longitude and closed at whichever pole is in darkness right now — the same
 * approach used by long-standing "real terminator" map overlays. No
 * antimeridian wraparound issues since longitude is sampled monotonically.
 */
export function buildTerminatorPolygon(date = new Date(), steps = 180) {
  const sun = getSubsolarPoint(date);
  const declRad = sun.lat * RAD;
  const ring = [];

  for (let i = 0; i <= steps; i++) {
    const lon = -180 + (360 * i) / steps;
    const hourAngle = (lon - sun.lon) * RAD;
    let lat;
    if (Math.abs(declRad) < 1e-6) {
      lat = 0;
    } else {
      lat = Math.atan(-Math.cos(hourAngle) / Math.tan(declRad)) * DEG;
    }
    ring.push([lon, Math.max(-89.9, Math.min(89.9, lat))]);
  }

  if (sun.lat >= 0) {
    ring.push([180, -90], [-180, -90]); // south pole is the dark one
  } else {
    ring.push([180, 90], [-180, 90]); // north pole is the dark one
  }
  ring.push(ring[0]);

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}
