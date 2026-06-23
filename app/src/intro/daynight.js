/**
 * Real local-time-based lighting preset for Mapbox's "Standard" style family.
 * Bali sits in a fixed UTC+8 zone (no DST), so the local hour can be derived
 * directly from the current UTC time — no need for a hand-rolled sun model.
 */
export function baliLightPreset(date = new Date()) {
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
  const localHour = (utcHours + 8) % 24;

  if (localHour >= 5.5 && localHour < 7) return 'dawn';
  if (localHour >= 7 && localHour < 17.5) return 'day';
  if (localHour >= 17.5 && localHour < 19) return 'dusk';
  return 'night';
}
