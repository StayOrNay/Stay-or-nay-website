/**
 * Real (approximate) astronomical day/night terminator for the spinning
 * globe. While the whole Earth is visible during the spin, this draws a
 * soft-edged dark hemisphere over whichever side is currently in night —
 * with a sparse scatter of glowing city lights on that night side — so
 * the countries that are actually in daylight right now read bright, and
 * the ones in night read dark-with-lights, the way a real photo of Earth
 * from space looks. It fades out during the zoom-in (by the time we land
 * on Bali, the existing local lightPreset already handles that lighting
 * correctly on its own).
 */

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad) {
  return (rad * 180) / Math.PI;
}
function wrapLon(lon) {
  return ((lon + 180) % 360 + 360) % 360 - 180;
}

/**
 * Subsolar point: the lon/lat where the sun is currently directly
 * overhead. Standard low-precision solar-position approximation — plenty
 * accurate for a decorative visual, not meant for navigation.
 */
export function subsolarPoint(date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000) + 1;
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  const B = (360 / 365.24) * (dayOfYear - 81); // degrees since ~spring equinox
  const Brad = toRad(B);
  const declination = 23.44 * Math.sin(Brad);
  const eot = 9.87 * Math.sin(2 * Brad) - 7.53 * Math.cos(Brad) - 1.5 * Math.sin(Brad); // minutes

  const lon = wrapLon(180 - 15 * utcHours - eot / 4);
  return { lon, lat: declination };
}

/** The point directly opposite the subsolar point — the center of the night hemisphere. */
export function antisolarPoint(date = new Date()) {
  const sun = subsolarPoint(date);
  return { lon: wrapLon(sun.lon + 180), lat: -sun.lat };
}

/** Spherical "destination point" given a start point, bearing, and angular distance (all in degrees). */
function destinationPoint(lon, lat, bearingDeg, distanceDeg) {
  const phi1 = toRad(lat);
  const lambda1 = toRad(lon);
  const theta = toRad(bearingDeg);
  const delta = toRad(distanceDeg);

  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta));
  const lambda2 =
    lambda1 +
    Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(phi1), Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2));

  return [toDeg(lambda2), toDeg(phi2)];
}

/**
 * A closed ring of points at a fixed angular distance from `center` —
 * i.e. a circle on the sphere. At distanceDeg = 90 this traces the exact
 * terminator great-circle, so the polygon it bounds (interior = within
 * `distanceDeg` of center) is precisely the night hemisphere when
 * `center` is the antisolar point. Longitudes are left unwrapped
 * (continuous, can run outside ±180) so the ring has no artificial seam
 * at the antimeridian.
 */
export function hemisphereRing(center, distanceDeg, steps = 144) {
  const ring = [];
  for (let i = 0; i <= steps; i += 1) {
    const bearing = (360 * i) / steps;
    ring.push(destinationPoint(center.lon, center.lat, bearing, distanceDeg));
  }
  return ring;
}

/** Great-circle angular distance in degrees between two lon/lat points. */
export function angularDistanceDeg(lon1, lat1, lon2, lat2) {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lon2 - lon1);
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return toDeg(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// A spread of major world cities — enough to read as "city lights" without
// needing a real night-lights raster source. weight scales the glow size.
export const MAJOR_CITIES = [
  ['New York', -74.01, 40.71, 3], ['Los Angeles', -118.24, 34.05, 2.4],
  ['Chicago', -87.65, 41.85, 2], ['Mexico City', -99.13, 19.43, 2.8],
  ['São Paulo', -46.63, -23.55, 2.8], ['Buenos Aires', -58.38, -34.6, 2.2],
  ['Lima', -77.03, -12.05, 1.8], ['Bogotá', -74.08, 4.71, 1.8],
  ['Santiago', -70.65, -33.45, 1.8], ['Toronto', -79.38, 43.65, 2],
  ['Vancouver', -123.12, 49.28, 1.5], ['Houston', -95.37, 29.76, 1.6],
  ['Miami', -80.19, 25.76, 1.6], ['London', -0.13, 51.51, 3],
  ['Paris', 2.35, 48.86, 2.8], ['Madrid', -3.7, 40.42, 2.2],
  ['Lisbon', -9.14, 38.72, 1.6], ['Rome', 12.5, 41.9, 2.2],
  ['Berlin', 13.4, 52.52, 2.2], ['Amsterdam', 4.9, 52.37, 1.8],
  ['Moscow', 37.62, 55.75, 2.8], ['Istanbul', 28.98, 41.01, 2.6],
  ['Cairo', 31.24, 30.04, 2.6], ['Lagos', 3.39, 6.52, 2.4],
  ['Kinshasa', 15.31, -4.32, 2], ['Johannesburg', 28.05, -26.2, 2.2],
  ['Nairobi', 36.82, -1.29, 1.8], ['Casablanca', -7.59, 33.57, 1.8],
  ['Addis Ababa', 38.74, 9.03, 1.6], ['Riyadh', 46.72, 24.69, 2],
  ['Dubai', 55.27, 25.2, 2.2], ['Tehran', 51.39, 35.69, 2.4],
  ['Karachi', 67.01, 24.86, 2.6], ['Mumbai', 72.88, 19.08, 2.8],
  ['Delhi', 77.21, 28.61, 2.8], ['Dhaka', 90.41, 23.81, 2.4],
  ['Bangkok', 100.5, 13.76, 2.4], ['Ho Chi Minh City', 106.66, 10.78, 2],
  ['Singapore', 103.82, 1.35, 2.2], ['Kuala Lumpur', 101.69, 3.14, 2],
  ['Jakarta', 106.85, -6.21, 2.8], ['Manila', 120.98, 14.6, 2.4],
  ['Hong Kong', 114.17, 22.32, 2.4], ['Shanghai', 121.47, 31.23, 3],
  ['Beijing', 116.4, 39.9, 2.8], ['Seoul', 126.98, 37.57, 2.6],
  ['Tokyo', 139.69, 35.69, 3], ['Osaka', 135.5, 34.69, 2.2],
  ['Taipei', 121.56, 25.03, 2], ['Sydney', 151.21, -33.87, 2.2],
  ['Melbourne', 144.96, -37.81, 2], ['Auckland', 174.76, -36.85, 1.6],
  ['Honolulu', -157.86, 21.31, 1.4], ['Anchorage', -149.9, 61.22, 1.2],
  ['Reykjavik', -21.94, 64.15, 1], ['Stockholm', 18.07, 59.33, 1.8],
  ['Warsaw', 21.01, 52.23, 1.8], ['Kyiv', 30.52, 50.45, 1.8],
  ['Athens', 23.73, 37.98, 1.6], ['Algiers', 3.06, 36.75, 1.6],
];
