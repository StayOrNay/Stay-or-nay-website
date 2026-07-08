import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { mapboxgl } from '../../lib/mapbox';
import { baliLightPreset } from '../../intro/daynight';
import { BALI, EXPLORE_ZOOM } from '../../intro/geo';

function buildMarkerEl(villa) {
  const isStay = villa.verdict === 'stay';
  const tone = isStay ? '#14875A' : '#D9472E';

  // `wrap` is handed straight to `new mapboxgl.Marker({ element: wrap })`,
  // which means Mapbox owns `wrap.style.transform` exclusively — it writes
  // a translate() to that property on every render to keep the marker
  // pinned to its lngLat. The selected/active scale effect used to be
  // applied directly to `wrap.style.transform` too, which clobbered
  // Mapbox's positioning transform and sent every marker to the map's
  // untranslated origin (top-left corner) until the next pan/zoom forced
  // Mapbox to reassert it. `inner` exists purely so our hover/active
  // styling has a transform property of its own to touch, never
  // Mapbox's.
  const wrap = document.createElement('div');
  wrap.style.cssText = 'cursor:pointer;';

  const inner = document.createElement('div');
  inner.style.cssText = 'display:flex;flex-direction:column;align-items:center;transition:transform 160ms ease;';
  wrap.appendChild(inner);

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

  inner.appendChild(label);
  inner.appendChild(badge);
  inner.appendChild(tail);

  return { wrap, inner, badge };
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
  const loadedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const onMoveEndRef = useRef(onMoveEnd);
  const villasRef = useRef(villas);
  const selectedIdRef = useRef(selectedId);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onMoveEndRef.current = onMoveEnd;
  }, [onMoveEnd]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // Rebuild the villa pins from the CURRENT list. Runs on map load AND every
  // time the villa list changes — the reviews come from an async fetch, so the
  // list is empty when the map first loads and only fills in a moment later;
  // without re-syncing here, those late-arriving villas would never get a pin.
  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    Object.values(markersRef.current).forEach(({ marker }) => marker.remove());
    markersRef.current = {};
    (villasRef.current || []).forEach((v) => {
      if (typeof v.lon !== 'number' || typeof v.lat !== 'number') return;
      const { wrap, inner, badge } = buildMarkerEl(v);
      wrap.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelectRef.current) onSelectRef.current(v.id);
      });
      const marker = new mapboxgl.Marker({ element: wrap, anchor: 'bottom' })
        .setLngLat([v.lon, v.lat])
        .addTo(map);
      markersRef.current[v.id] = { marker, wrap, inner, badge };
      const active = v.id === selectedIdRef.current;
      inner.style.transform = active ? 'scale(1.12)' : 'scale(1)';
      badge.style.borderColor = active ? '#fff' : 'transparent';
    });
  }, []);

  // Keep the pins in sync with the villa list (fixes late-loading reviews).
  useEffect(() => {
    villasRef.current = villas;
    syncMarkers();
  }, [villas, syncMarkers]);

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

    map.on('load', () => {
      loadedRef.current = true;
      syncMarkers();
    });

    map.on('error', (e) => {
      // eslint-disable-next-line no-console
      console.warn('Mapbox tile error (non-fatal):', e && e.error);
    });

    // Lets the Explore screen's "Bali, Indonesia · N verdicts" header follow
    // wherever the camera actually is, instead of being hardcoded — fires
    // once the map first settles (so the label is correct from the very
    // first frame, not just after the user's first pan) and again on every
    // subsequent pan/zoom/fly that ends. Bounds are reported alongside the
    // center so the screen can count only the villas actually visible in
    // the current frame, instead of every villa on the site.
    const reportCenter = () => {
      if (onMoveEndRef.current) {
        const c = map.getCenter();
        const b = map.getBounds();
        onMoveEndRef.current({
          lon: c.lng,
          lat: c.lat,
          bounds: { west: b.getWest(), east: b.getEast(), south: b.getSouth(), north: b.getNorth() },
        });
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
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, { inner, badge }]) => {
      const active = id === selectedId;
      inner.style.transform = active ? 'scale(1.12)' : 'scale(1)';
      badge.style.borderColor = active ? '#fff' : 'transparent';
    });
  }, [selectedId]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
});
