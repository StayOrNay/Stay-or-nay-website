/**
 * Geography helpers for the Earth intro.
 * All angles in: lon/lat in degrees (lon -180..180, lat -90..90).
 * Sphere convention matches three.js SphereGeometry default UV mapping:
 *   u = (lon + 180) / 360, v = (90 - lat) / 180
 *   theta = u * 2PI, phi = v * PI
 *   x = -R * sin(phi) * cos(theta)
 *   y =  R * cos(phi)
 *   z =  R * sin(phi) * sin(theta)
 */

export const BALI = { lon: 115.19, lat: -8.4, label: 'Bali, Indonesia' };

export function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/** Equirectangular texture UV [0..1, 0..1] for a given lon/lat. */
export function lonLatToUV(lon, lat) {
  const u = (lon + 180) / 360;
  const v = (90 - lat) / 180;
  return [u, v];
}

/** Unit-sphere-relative 3D position (radius defaults to 1) for a given lon/lat. */
export function lonLatToVector3(lon, lat, radius = 1) {
  const phi = toRad(90 - lat);
  const theta = toRad(lon + 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
}

/** Angular distance (radians, small-angle approx) between two lon/lat points given in radians. */
export function angularDistanceRad(lonRad1, latRad1, lonRad2, latRad2) {
  let dLon = Math.abs(lonRad1 - lonRad2);
  if (dLon > Math.PI) dLon = 2 * Math.PI - dLon;
  const dLat = latRad1 - latRad2;
  return Math.sqrt(dLon * dLon + dLat * dLat);
}

/** Rotate a 3D vector around the Y axis by `theta` radians (three.js rotation.y convention). */
export function rotateY([x, y, z], theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [x * c + z * s, y, -x * s + z * c];
}

/**
 * Given a unit direction vector, returns the rotation.y angle that, when applied
 * to a mesh, brings that direction to face the camera sitting on the +Z axis.
 */
export function angleToFaceCameraZ([x, , z]) {
  return Math.atan2(x, z);
}

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function clamp01(t) {
  return Math.min(1, Math.max(0, t));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function formatCoord(lat, lon) {
  const latAbs = Math.abs(lat).toFixed(4);
  const lonAbs = Math.abs(lon).toFixed(4);
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${latAbs}° ${latDir}, ${lonAbs}° ${lonDir}`;
}
