import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { mapboxgl } from '../../lib/mapbox';
import { baliLightPreset } from '../../intro/daynight';
import { BALI, EXPLORE_ZOOM } from '../../intro/geo';

/**
 * Applies the "is this pin the one being talked about right now" styling.
 *
 * There are three states a pin can be in and they are deliberately
 * distinguishable at a glance, because the pin and the villa card in the
 * side list are two views of the same thing and the user has to be able to
 * tell instantly which card belongs to which pin:
 *   - active  : the selected villa. Scaled up, white ring on the badge,
 *               a pulsing halo, name label turned solid, lifted above its
 *               neighbours so it can never be occluded by another pin.
 *   - hovered : the card under the cursor in the side list. Same lift and
 *               a soft ring, but no halo — enough to answer "which one is
 *               that?" without competing with the actual selection.
 *   - idle    : everything else.
 */
function applyMarkerState(entry, { active, hovered }) {
  const { wrap, inner, badge, ring, label } = entry;
  inner.style.transform = active ? 'scale(1.16)' : hovered ? 'scale(1.08)' : 'scale(1)';
  badge.style.borderColor = active ? '#fff' : hovered ? 'rgba(255,255,255,0.6)' : 'transparent';
  // The pulse keyframes drive opacity, so the animation is gated behind a
  // class rather than left running invisibly on all 40-odd pins.
  ring.classList.toggle('is-on', !!active);
  ring.style.opacity = active ? '1' : '0';
  label.style.background = active || hovered ? 'rgba(10,18,16,0.9)' : 'rgba(10,18,16,0.55)';
  label.style.borderColor = active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.14)';
  // Mapbox writes `transform` on the wrapper (see the note below) but never
  // touches z-index, so this is a safe property to own.
  wrap.style.zIndex = active ? '5' : hovered ? '4' : '';
}

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
    "font-family:'Hanken Grotesk',system-ui,-apple-system,sans-serif;font-size:11.5px;font-weight:600;" +
    'color:#fff;background:rgba(10,18,16,0.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);' +
    'padding:3px 10px;border-radius:999px;margin-bottom:5px;white-space:nowrap;letter-spacing:0.005em;' +
    'border:1px solid rgba(255,255,255,0.14);box-shadow:0 1px 6px rgba(0,0,0,0.28);' +
    'text-shadow:0 1px 2px rgba(0,0,0,0.4);max-width:184px;overflow:hidden;text-overflow:ellipsis;' +
    'transition:background 180ms ease,border-color 180ms ease;';
  label.textContent = villa.name;

  // The badge sits inside a relatively-positioned shell so the selection
  // halo can be absolutely positioned around it without affecting layout.
  const badgeShell = document.createElement('div');
  badgeShell.style.cssText = 'position:relative;display:flex;';

  const ring = document.createElement('div');
  ring.className = 'snay-pin-ring';
  ring.style.cssText =
    `position:absolute;inset:-5px;border-radius:999px;border:2px solid ${tone};` +
    'pointer-events:none;opacity:0;transition:opacity 200ms ease;';

  const badge = document.createElement('div');
  badge.style.cssText =
    `display:flex;align-items:center;gap:5px;padding:4px 9px 4px 5px;background:${tone};color:#fff;` +
    "border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,0.35);font-family:'Space Mono',monospace;" +
    'font-weight:700;font-size:12px;border:2px solid transparent;transition:border-color 160ms ease;';
  badge.innerHTML =
    `<span style="width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,0.25);display:inline-flex;align-items:center;justify-content:center;font-size:11px;line-height:1;">${isStay ? '✓' : '✕'}</span>${villa.score}`;

  const tail = document.createElement('div');
  tail.style.cssText = `width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${tone};`;

  badgeShell.appendChild(ring);
  badgeShell.appendChild(badge);

  inner.appendChild(label);
  inner.appendChild(badgeShell);
  inner.appendChild(tail);

  return { wrap, inner, badge, ring, label };
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
  { villas, selectedId, hoveredId = null, onSelect, onHover, onMoveEnd, center = [BALI.lon, BALI.lat], zoom = EXPLORE_ZOOM },
  ref,
) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const loadedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  const onMoveEndRef = useRef(onMoveEnd);
  const villasRef = useRef(villas);
  const selectedIdRef = useRef(selectedId);
  const hoveredIdRef = useRef(hoveredId);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onHoverRef.current = onHover;
  }, [onHover]);

  useEffect(() => {
    onMoveEndRef.current = onMoveEnd;
  }, [onMoveEnd]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    hoveredIdRef.current = hoveredId;
  }, [hoveredId]);

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
      const parts = buildMarkerEl(v);
      const { wrap } = parts;
      wrap.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelectRef.current) onSelectRef.current(v.id);
      });
      // Hovering a pin lights up its card in the side list, exactly as
      // hovering the card lights up the pin — the link between the two runs
      // in both directions so neither view feels like the "real" one.
      wrap.addEventListener('mouseenter', () => {
        if (onHoverRef.current) onHoverRef.current(v.id);
      });
      wrap.addEventListener('mouseleave', () => {
        if (onHoverRef.current) onHoverRef.current(null);
      });
      const marker = new mapboxgl.Marker({ element: wrap, anchor: 'bottom' })
        .setLngLat([v.lon, v.lat])
        .addTo(map);
      const entry = { marker, ...parts };
      markersRef.current[v.id] = entry;
      applyMarkerState(entry, {
        active: v.id === selectedIdRef.current,
        hovered: v.id === hoveredIdRef.current,
      });
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
    /**
     * Fly the camera to one villa's pin.
     *
     * `offset` is the whole point of this signature: the Explore screen
     * floats a panel over the left third of the map, so centering the pin
     * would park it underneath that panel. The caller passes the pixel
     * offset for whatever chrome is currently covering the map (a left
     * panel on desktop, the bottom sheet on mobile) and the pin lands in
     * the part the user can actually see. `minZoom` keeps an already
     * close-in camera from zooming *out* just because a pin was clicked.
     */
    flyToVilla(id, { offset = [0, 0], zoom: toZoom = 14, pitch = 45, duration = 1200 } = {}) {
      const map = mapRef.current;
      const v = (villasRef.current || []).find((x) => x.id === id);
      if (!v || !map || typeof v.lon !== 'number' || typeof v.lat !== 'number') return;
      map.flyTo({
        center: [v.lon, v.lat],
        zoom: Math.max(map.getZoom(), toZoom),
        pitch,
        offset,
        duration,
        essential: true,
        curve: 1.3,
      });
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

    // Clicking bare map — anywhere that isn't a pin — dismisses the current
    // selection, the way every map app behaves. Marker clicks can't reach
    // here: markers are DOM elements layered above the canvas and they call
    // stopPropagation anyway, so this only ever fires on the map itself.
    map.on('click', () => {
      if (onSelectRef.current) onSelectRef.current(null);
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
    Object.entries(markersRef.current).forEach(([id, entry]) => {
      applyMarkerState(entry, { active: id === selectedId, hovered: id === hoveredId });
    });
  }, [selectedId, hoveredId]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
});
