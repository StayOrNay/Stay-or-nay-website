import React, { useEffect, useRef } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { mapboxgl } from '../../lib/mapbox';
import { baliLightPreset } from '../../intro/daynight';
import { BALI } from '../../intro/geo';

/**
 * A satellite map with a single draggable pin, for placing a review's exact
 * location. Airbnb never gives an exact address, so rather than guess from the
 * listing we let the reviewer drop the pin themselves — precise, reliable, and
 * with no scraping.
 *
 * Controlled: `value` is {lon, lat} | null; `onChange(lon, lat)` fires when the
 * pin is dragged or the map is tapped. When `value` changes from the outside
 * (e.g. after geocoding the typed area) the pin and camera follow it — but a
 * change that merely echoes the current pin position (i.e. came from a drag)
 * does NOT re-fly the camera, so dragging stays smooth.
 */
export function LocationPicker({ value, onChange, initialCenter }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const start = value || initialCenter || { lon: BALI.lon, lat: BALI.lat };
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/standard-satellite',
      center: [start.lon, start.lat],
      zoom: value ? 15 : 10,
      dragRotate: false,
      touchPitch: false,
      config: {
        basemap: {
          lightPreset: baliLightPreset(),
          showPlaceLabels: true,
          showPointOfInterestLabels: true,
          showRoadLabels: true,
        },
      },
    });
    mapRef.current = map;

    const marker = new mapboxgl.Marker({ color: '#14875A', draggable: true })
      .setLngLat([start.lon, start.lat])
      .addTo(map);
    markerRef.current = marker;

    marker.on('dragend', () => {
      const { lng, lat } = marker.getLngLat();
      onChangeRef.current?.(lng, lat);
    });
    map.on('click', (e) => {
      marker.setLngLat(e.lngLat);
      onChangeRef.current?.(e.lngLat.lng, e.lngLat.lat);
    });
    map.on('error', () => { /* non-fatal tile errors */ });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value change (e.g. geocoded area) → move pin + fly there, unless
  // the pin is already essentially at that spot (change came from a drag).
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!value || !map || !marker) return;
    const cur = marker.getLngLat();
    if (Math.abs(cur.lng - value.lon) < 1e-6 && Math.abs(cur.lat - value.lat) < 1e-6) return;
    marker.setLngLat([value.lon, value.lat]);
    map.flyTo({ center: [value.lon, value.lat], zoom: Math.max(map.getZoom(), 15), duration: 800 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lon, value?.lat]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
