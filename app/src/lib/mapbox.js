import mapboxgl from 'mapbox-gl';

// Public ("pk.") Mapbox access token — these are designed to be embedded in
// client-side code (this is how every Mapbox-powered website ships them).
export const MAPBOX_TOKEN =
  'pk.eyJ1Ijoic3RheW9ybmF5IiwiYSI6ImNtcTk3YnZzZjAwNGEyenBhYmN4YXhucmMifQ.ma2M8g7sBGr494NiKTu1pw';

mapboxgl.accessToken = MAPBOX_TOKEN;

export { mapboxgl };
