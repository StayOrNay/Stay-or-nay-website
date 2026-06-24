import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { mapboxgl } from '../../lib/mapbox';
import { baliLightPreset } from '../../intro/daynight';
import { BALI, EXPLORE_ZOOM } from '../../intro/geo';
import { addBaliTownLabels } from '../../intro/baliTowns';

function buildMarkerEl(villa) {
  const isStay = villa.verdict === 'stay';
  const tone = isStay ? '#14875A' : '#D9472E';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform 160ms ease;';

  const label = document.createElement('div');
  label.style.cssText =
    "font-family:'Space Mono',monospace;font-size:10px;font-weight:700;color:#fff;background:rgba(12,23,20,0.72);" +
    'padding:2px 7px;border-radius:999px;margin-bottom:4px;white-space:nowrap;letter-spacing:0.02em;';
  label.textContent = villa.name;

  const badge = document.createElement('div');
  badge.style.cssText =
    `display:flex;align-items:center;gap:5px;padding:4px 9px 4px 5px;background:${tone};color:#fff;` +
    "border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,0.35);font-family:'Space Mono',monospace;" +
    'font-weight:700;font-size:12px;border:2px solid transparent;transition:border-color 160ms ease;';
  badge.innerHTML =
    `<span style="width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,0.25);display:inline-flex;align-items:center;justify-content:center;font-size:11px;line-height:1;">${isStay ? '✓' : '✕'}</span>${villa.score}`;

  const tail = document.createElement('div');
  tail.style.cssText = `width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${tone};`;

  wrap.appendChild(label);
  wrap.appendChild(badge);
  wrap.appendChild(tail);

  return { wrap, badge };
}

/**
 * Real interactive satellite map — Mapbox's photorealistic Standard Satellite
 * style, centered on Bali, with clickable Google-Earth-style POI pins: a
 * small name label always visible, tap to open the villa's review.
 */
export const SatelliteMap = forwardRef(function SatelliteMap(
  // Same center/zoom the globe intro lands its zoom-in on (see GlobeIntro's
  // ISLAND_ZOOM/BALI) — kept as one shared shot rather than two maps with
  // slightly different framing.
  { villas, selectedId, onSelect, onMoveEnd, center = [BALI.lon, BALI.lat], zoom = EXPLORE_ZOOM },
  ref,
) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const onSelectRef = useRef(onSelect);
  const onMoveEndRef = useRef(onMoveEnd);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onMoveEndRef.current = onMoveEnd;
  }, [onMoveEnd]);

  useImperativeHandle(ref, () => ({
    recenter() {
      if (mapRef.current) mapRef.current.flyTo({ center, zoom, pitch: 0, bearing: 0, duration: 900 });
    },
    flyToVilla(id) {
      const v = villas.find((x) => x.id === id);
      if (v && mapRef.current) mapRef.current.flyTo({ center: [v.lon, v.lat], zoom: 14, pitch: 45, duration: 1100 });
    },
  }));

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/standard-satellite',
      projection: 'globe', // matches the intro's projection exactly, for a seamless handoff
      center,
      zoom,
      dragRotate: false,
      touchPitch: false,
      attributionControl: true,
      // Set basemap config (label visibility, lighting) here, at
      // construction time, instead of via map.setConfigProperty() inside a
      // 'style.load' handler. setConfigProperty throws "Style import not
      // found: basemap" if called before the style's basemap import has
      // fully resolved (mapbox-gl-js#12841) — and that call used to be
      // wrapped in try/catch, so on the live site the error was silently
      // swallowed every time, which is exactly why the satellite photo was
      // showing with zero place/POI/road labels: just a satellite photo,
      // no names, no roads, nothing. Passing config directly here is
      // Mapbox's own documented fix — it applies from the first rendered
      // frame, with no event-timing race to lose.
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

    map.on('style.load', () => {
      try {
        addBaliTownLabels(map);
      } catch (err) {
        // Decorative only — never let it block the map.
      }
    });

    map.on('load', () => {
      villas.forEach((v) => {
        if (typeof v.lon !== 'number' || typeof v.lat !== 'number') return;
        const { wrap, badge } = buildMarkerEl(v);
        wrap.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelectRef.current) onSelectRef.current(v.id);
        });
        const marker = new mapboxgl.Marker({ element: wrap, anchor: 'bottom' })
          .setLngLat([v.lon, v.lat])
          .addTo(map);
        markersRef.current[v.id] = { marker, wrap, badge };
      });
    });

    map.on('error', (e) => {
      // eslint-disable-next-line no-console
      console.warn('Mapbox tile error (non-fatal):', e && e.error);
    });

    // Lets the Explore screen's "Bali, Indonesia · N verdicts" header follow
    // wherever the camera actually is, instead of being hardcoded — fires
    // once the map first settles (so the label is correct from the very
    // first frame, not just after the user's first pan) and again on every
    // subsequent pan/zoom/fly that ends.
    const reportCenter = () => {
      if (onMoveEndRef.current) {
        const c = map.getCenter();
        onMoveEndRef.current({ lon: c.lng, lat: c.lat });
      }
    };
    map.on('moveend', reportCenter);
    map.once('load', reportCenter);

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, { wrap, badge }]) => {
      const active = id === selectedId;
      wrap.style.transform = active ? 'scale(1.12)' : 'scale(1)';
      badge.style.borderColor = active ? '#fff' : 'transparent';
    });
  }, [selectedId]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
});
