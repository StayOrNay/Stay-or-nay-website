import React, { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { mapboxgl } from '../lib/mapbox';
import { BALI, EXPLORE_ZOOM, formatCoord } from './geo';
import { baliLightPreset } from './daynight';
import { antisolarPoint, hemisphereRing, angularDistanceDeg, MAJOR_CITIES } from './terminator';

// --- Timeline (ms) — three explicit beats: a held pre-roll on the full
// globe, THEN a couple of seconds where the whole Earth is visible and
// visibly spinning, THEN a zoom-in that lands on Bali. The spin always
// ends exactly on Bali's longitude/latitude, so the zoom phase only ever
// has to animate zoom/pitch — never position — which is what keeps the
// hand-off between beats seamless rather than a jump.
const PRE_DELAY_MS = 500; // hold on the spinning globe before motion starts
const SPIN_MS = 2600; // full-Earth-view spin — "see the whole globe" for 2-3s
const ZOOM_MS = 1500; // zoom in from full globe to landing on Bali
const LABEL_DELAY_MS = 350;
const FADE_MS = 500;

const SPIN_ZOOM = 1.5; // low zoom so the whole globe is on screen while it spins
const SPIN_LNG_DELTA = 720; // exactly two full revolutions (multiple of 360°)
// Spin happens at Bali's latitude the whole time, starting two full turns
// east of Bali's longitude — so when the spin finishes, the center is
// already sitting exactly on Bali, and the zoom phase only has to animate
// zoom/pitch (never position), which is what keeps the hand-off seamless.
const START_CENTER = [BALI.lon - SPIN_LNG_DELTA, BALI.lat];
// Lands at the exact same center/zoom the live Explore map opens with
// (see SatelliteMap) — one continuous shot into the real, interactive map
// rather than a zoom that then cuts to a second, differently-framed map.
const ISLAND_ZOOM = EXPLORE_ZOOM;

const PITCH_PEAK = 48;
const PITCH_RISE_AT = 0.12; // fraction of the ZOOM phase pitch starts rising into 3D
const PITCH_FLAT_BY = 0.85; // fraction by which pitch is back to flat (2D) on landing

// One single S-curve used for BOTH the spin's longitude and the zoom-in's
// zoom/pitch envelope. Velocity is zero at both ends of this curve, so the
// spin eases to a dead stop exactly when the zoom-in's own ease-in begins
// at zero speed too — position, zoom, and pitch all have matching (zero)
// velocity right at the spin/zoom hand-off, which is what removes the
// "kick" that made the two beats read as separate shots instead of one.
function easeInOutQuint(t) {
  return t < 0.5 ? 16 * t ** 5 : 1 - ((-2 * t + 2) ** 5) / 2;
}

// 0 -> rises -> peaks -> falls -> 0, confined to [PITCH_RISE_AT, PITCH_FLAT_BY]
// and flat outside it. Driven off the zoom phase's raw (linear) time, not
// its eased progress, so the tilt reads as its own smooth temporal arc: 3D
// while approaching, flat (2D) again once landed.
function pitchProgress(t) {
  if (t <= PITCH_RISE_AT || t >= PITCH_FLAT_BY) return 0;
  const local = (t - PITCH_RISE_AT) / (PITCH_FLAT_BY - PITCH_RISE_AT);
  return Math.sin(Math.PI * local);
}

function gibsCloudUrl() {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday UTC — guaranteed processed
  const day = d.toISOString().slice(0, 10);
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${day}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
}

const NIGHT_CORE_OPACITY = 0.6;
const NIGHT_EDGE_OPACITY = 0.28;
const CITY_GLOW_OPACITY = 0.35;
const CITY_CORE_OPACITY = 0.9;

/**
 * Adds the day/night hemisphere darkening + city-light glow layers, built
 * once from the real subsolar position at mount time. Geographic, not
 * camera-relative — these sit at fixed lon/lat, so as the spin moves the
 * camera across the globe, night and day sweep past exactly where they
 * really currently are, with no per-frame recomputation needed.
 */
function addNightLayers(map) {
  const night = antisolarPoint(new Date());

  const ringToCoords = (ring) => ring.map(([lon, lat]) => [lon, lat]);
  const core = ringToCoords(hemisphereRing(night, 84));
  const edge = ringToCoords(hemisphereRing(night, 90));

  map.addSource('night-core', {
    type: 'geojson',
    data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [core] } },
  });
  map.addLayer({
    id: 'night-core',
    type: 'fill',
    source: 'night-core',
    paint: { 'fill-color': '#03060f', 'fill-opacity': NIGHT_CORE_OPACITY },
  });

  // Annulus between the 84° core and the true 90° terminator — a softer,
  // lower-opacity band so the edge reads as a gradient rather than a hard line.
  map.addSource('night-edge', {
    type: 'geojson',
    data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [edge, core.slice().reverse()] } },
  });
  map.addLayer({
    id: 'night-edge',
    type: 'fill',
    source: 'night-edge',
    paint: { 'fill-color': '#03060f', 'fill-opacity': NIGHT_EDGE_OPACITY },
  });

  const nightCities = MAJOR_CITIES.filter(
    ([, lon, lat]) => angularDistanceDeg(lon, lat, night.lon, night.lat) < 88,
  );
  const cityFeatures = nightCities.map(([name, lon, lat, weight]) => ({
    type: 'Feature',
    properties: { weight },
    geometry: { type: 'Point', coordinates: [lon, lat] },
  }));
  map.addSource('city-lights', { type: 'geojson', data: { type: 'FeatureCollection', features: cityFeatures } });
  map.addLayer({
    id: 'city-glow',
    type: 'circle',
    source: 'city-lights',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 1, 6, 3, 16],
      'circle-color': '#ffd98a',
      'circle-blur': 1,
      'circle-opacity': CITY_GLOW_OPACITY,
    },
  });
  map.addLayer({
    id: 'city-core',
    type: 'circle',
    source: 'city-lights',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 1, 1.4, 3, 3],
      'circle-color': '#fff6e0',
      'circle-blur': 0.2,
      'circle-opacity': CITY_CORE_OPACITY,
    },
  });
}

function setNightOpacity(map, factor) {
  try {
    map.setPaintProperty('night-core', 'fill-opacity', NIGHT_CORE_OPACITY * factor);
    map.setPaintProperty('night-edge', 'fill-opacity', NIGHT_EDGE_OPACITY * factor);
    map.setPaintProperty('city-glow', 'circle-opacity', CITY_GLOW_OPACITY * factor);
    map.setPaintProperty('city-core', 'circle-opacity', CITY_CORE_OPACITY * factor);
  } catch (err) {
    // Layers may not exist yet (style still loading) or map may be torn
    // down — this overlay is decorative only, never let it throw.
  }
}

/**
 * Cinematic globe splash: real photoreal satellite imagery via Mapbox's
 * Standard Satellite style, native `globe` projection, a real astronomical
 * day/night terminator with a scatter of city lights on the night side,
 * and real local-time lighting once landed. Driven entirely by a single
 * hand-rolled requestAnimationFrame loop calling jumpTo every frame (never
 * separate Mapbox animations stitched together), the sequence holds on
 * the full globe (PRE_DELAY_MS), spins it a couple of full revolutions
 * while the whole Earth stays on screen (SPIN_MS), then zooms in to land
 * on Bali (ZOOM_MS) — at the exact center/zoom/projection the live Explore
 * map opens with, so the shot continues straight into the real app rather
 * than cutting to a second, differently-framed map. Config properties
 * (lightPreset) are set on 'style.load' per Mapbox's docs. A light NASA
 * GIBS cloud pass sits on top as a bonus layer — its failure never blocks
 * the intro.
 */
export function GlobeIntro({ onComplete }) {
  const containerRef = useRef(null);
  const skipRef = useRef(false);
  const completedRef = useRef(false);
  const goToEndRef = useRef(null);
  const [showLabel, setShowLabel] = useState(false);
  const [fading, setFading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const finish = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      if (onComplete) onComplete();
    };

    // Deliberately NOT checking prefers-reduced-motion here. This used to
    // skip straight to finish() whenever the OS-level "Reduce Motion" /
    // "Remove animations" setting was on — which is exactly why the globe
    // intro looked broken on mobile: the phone had that setting enabled,
    // so the entire animation was silently bypassed every single time, no
    // matter how the timing/sizing code was tuned. The intro is meant to
    // always play; it's also short and skippable via the Skip button.

    let map;
    try {
      map = new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/standard-satellite',
        projection: 'globe',
        center: START_CENTER,
        zoom: SPIN_ZOOM,
        pitch: 0,
        interactive: false,
        attributionControl: true, // required by Mapbox's terms
      });
    } catch (err) {
      setFailed(true);
      window.setTimeout(finish, 400);
      return undefined;
    }

    let labelTimeoutId = null;
    let fadeTimeoutId = null;
    let rafId = null;

    const goToEnd = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (labelTimeoutId) clearTimeout(labelTimeoutId);
      if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
      try {
        map.jumpTo({ center: [BALI.lon, BALI.lat], zoom: ISLAND_ZOOM, pitch: 0, bearing: 0 });
        setNightOpacity(map, 0);
      } catch (err) {
        // ignore — we're tearing down anyway
      }
      setShowLabel(true);
      setFading(true);
      window.setTimeout(finish, FADE_MS);
    };
    goToEndRef.current = goToEnd;

    const addCloudLayer = () => {
      try {
        if (map.getSource('clouds')) return;
        map.addSource('clouds', {
          type: 'raster',
          tiles: [gibsCloudUrl()],
          tileSize: 256,
          maxzoom: 9,
        });
        map.addLayer({
          id: 'clouds',
          type: 'raster',
          source: 'clouds',
          paint: {
            // This is yesterday's real VIIRS pass, so the cloud cover it
            // shows is genuinely uneven already — thick over some regions,
            // clear over others. Pushed contrast/brightness-min punch up
            // that real variation (denser white clouds read brighter and
            // more solid, clear sky/ocean recedes further into the
            // basemap) rather than laying down one flat haze everywhere.
            'raster-opacity': 0.45,
            'raster-saturation': -1,
            'raster-contrast': 0.75,
            'raster-brightness-min': 0.35,
            'raster-brightness-max': 1,
          },
        });
      } catch (err) {
        // Bonus layer only — never let a cloud-tile failure affect the intro.
      }
    };

    // Three beats, but still just ONE hand-rolled rAF loop calling jumpTo
    // every frame — never separate Mapbox animations stitched together, so
    // there's still nothing for a visual seam to happen between. Which beat
    // is active is purely a function of elapsed time; position only ever
    // moves during the spin (always finishing exactly on Bali), so the
    // zoom beat picking up from there never has to jump anywhere.
    const TOTAL_MS = PRE_DELAY_MS + SPIN_MS + ZOOM_MS;

    const runFlight = () => {
      // Anchor elapsed time to the FIRST rendered frame, not to the instant
      // this function was called. On mobile, the gap between "map
      // constructed" and "browser actually paints a frame" can be a full
      // second or more (slower JS engines, WebGL/shader compilation, style
      // parsing) — if startTime were captured here, that gap would eat
      // straight into the timeline before the loop ever ticks once.
      // Anchoring to the first tick's own timestamp means the full
      // duration is always available no matter how slow the device was to
      // get going.
      let startTime = null;

      const tick = (now) => {
        if (skipRef.current) return;
        if (startTime === null) startTime = now;
        const elapsed = now - startTime;

        let lng = START_CENTER[0];
        let zoom = SPIN_ZOOM;
        let pitch = 0;
        let nightFactor = 1;

        if (elapsed < PRE_DELAY_MS) {
          // Held on the full globe, already spinning-in-place visually via
          // the style's own rotation cue — camera itself doesn't move yet.
          lng = START_CENTER[0];
        } else if (elapsed < PRE_DELAY_MS + SPIN_MS) {
          // Beat 1: spin the whole way to Bali's longitude while staying
          // zoomed out far enough to see the entire globe.
          const spinT = easeInOutQuint(Math.min((elapsed - PRE_DELAY_MS) / SPIN_MS, 1));
          lng = START_CENTER[0] + (BALI.lon - START_CENTER[0]) * spinT;
          zoom = SPIN_ZOOM;
          pitch = 0;
        } else {
          // Beat 2: position is already exactly on Bali — only zoom and
          // pitch animate from here, landing on the island. The night
          // overlay fades out across this same beat so it's gone by the
          // time the real, local lightPreset takes over down on Bali.
          const zoomTRaw = Math.min((elapsed - PRE_DELAY_MS - SPIN_MS) / ZOOM_MS, 1);
          const zoomT = easeInOutQuint(zoomTRaw);
          lng = BALI.lon;
          zoom = SPIN_ZOOM + (ISLAND_ZOOM - SPIN_ZOOM) * zoomT;
          pitch = PITCH_PEAK * pitchProgress(zoomTRaw);
          nightFactor = 1 - zoomT;
        }

        map.jumpTo({ center: [lng, BALI.lat], zoom, pitch, bearing: 0 });
        setNightOpacity(map, nightFactor);

        if (elapsed < TOTAL_MS) {
          rafId = requestAnimationFrame(tick);
          return;
        }

        rafId = null;
        labelTimeoutId = window.setTimeout(() => {
          if (skipRef.current) return;
          setShowLabel(true);
          fadeTimeoutId = window.setTimeout(() => {
            if (skipRef.current) return;
            setFading(true);
            window.setTimeout(finish, FADE_MS);
          }, LABEL_DELAY_MS + 700);
        }, 200);
      };

      rafId = requestAnimationFrame(tick);
    };

    // Don't start the flight until the container actually has real pixel
    // dimensions. This is the real mobile bug: on phones the app shell can
    // still be 0x0 (or the wrong size) for a beat after mount — webfonts
    // loading, the URL bar settling, `dvh` recalculating — and Mapbox
    // constructs its WebGL canvas at whatever size the container has *right
    // then*. If that's 0x0, the canvas renders nothing, and because the
    // flight is elapsed-time-based (not frame-count-based), by the time the
    // container resizes to its real size the animation has already silently
    // played out against an invisible canvas — it looks exactly like "the
    // globe doesn't spin" even though the code ran. Waiting for a real size
    // (or forcing one after a short grace period) fixes that at the source.
    let flightStarted = false;
    const startFlightWhenReady = () => {
      if (flightStarted) return;
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        flightStarted = true;
        try {
          map.resize();
        } catch (err) {
          // ignore
        }
        runFlight();
      }
    };
    startFlightWhenReady();
    // Safety net: if the container is somehow still collapsed after a short
    // grace period (shouldn't happen, but better than the intro hanging
    // forever), start anyway rather than leave the splash frozen.
    const flightFallbackId = window.setTimeout(() => {
      flightStarted = false;
      startFlightWhenReady();
      if (!flightStarted) {
        flightStarted = true;
        runFlight();
      }
    }, 1200);

    map.on('style.load', () => {
      try {
        map.setConfigProperty('basemap', 'lightPreset', baliLightPreset());
      } catch (err) {
        // Older style revisions may not support config properties — non-fatal.
      }
      try {
        addNightLayers(map);
      } catch (err) {
        // Decorative only — never let it block the intro.
      }
      addCloudLayer();
    });

    map.on('error', (e) => {
      // Tile/network hiccups (e.g. a single failed cloud tile) must never
      // abort the cinematic — just log for debugging. The spin/flyTo
      // timeline above runs on its own fixed schedule regardless.
      // eslint-disable-next-line no-console
      console.warn('Mapbox tile error (non-fatal):', e && e.error);
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
      startFlightWhenReady();
    });
    resizeObserver.observe(container);

    // Mobile browsers (mainly mobile Safari) hand the page a viewport
    // height that doesn't match what's actually visible once the
    // address-bar/toolbar settles, which can leave the globe's canvas sized
    // wrong right at construction — the spin still runs, it just renders
    // into a stale-sized canvas and looks frozen. A couple of forced
    // resizes right after mount, plus listening for the visual viewport
    // and orientation actually changing, keeps the canvas honest without
    // depending on the CSS fix alone.
    const forceResize = () => {
      try {
        map.resize();
      } catch (err) {
        // ignore — map may already be torn down
      }
    };
    const resizeTimeouts = [50, 250, 600].map((ms) => window.setTimeout(forceResize, ms));
    window.addEventListener('orientationchange', forceResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', forceResize);
    }

    return () => {
      completedRef.current = true;
      goToEndRef.current = null;
      if (rafId) cancelAnimationFrame(rafId);
      if (labelTimeoutId) clearTimeout(labelTimeoutId);
      if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
      clearTimeout(flightFallbackId);
      resizeTimeouts.forEach((id) => clearTimeout(id));
      window.removeEventListener('orientationchange', forceResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', forceResize);
      }
      resizeObserver.disconnect();
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSkip = () => {
    skipRef.current = true;
    if (goToEndRef.current) goToEndRef.current();
  };

  return (
    // The whole intro fades out as one layer (rather than a separate
    // opaque "blackout" overlay) — by the time it does, the real Explore
    // map underneath is already mounted, tile-loaded, and camera-matched
    // (see App.jsx / SatelliteMap), so this reveals it directly: one
    // continuous shot, not a cut.
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#03040a',
        overflow: 'hidden',
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms var(--ease-in-out)`,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {failed && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0C1714',
            color: 'var(--paper-100)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
          }}
        >
          Loading StayOrNay…
        </div>
      )}

      <button
        type="button"
        onClick={handleSkip}
        style={{
          position: 'absolute',
          top: 'var(--gutter)',
          right: 'var(--gutter)',
          padding: '8px 16px',
          borderRadius: 'var(--radius-pill)',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: 'var(--paper-100)',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          zIndex: 2,
        }}
      >
        Skip
      </button>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 var(--gutter) var(--space-8)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <div
          style={{
            opacity: showLabel ? 1 : 0,
            transform: showLabel ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 400ms var(--ease-out), transform 400ms var(--ease-out)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              letterSpacing: '0.08em',
              color: 'var(--sky-300)',
              marginBottom: 8,
              textShadow: '0 1px 6px rgba(0,0,0,0.6)',
            }}
          >
            {formatCoord(BALI.lat, BALI.lon).toUpperCase()}
          </div>
          <div
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: '-0.01em',
              textShadow: '0 1px 6px rgba(0,0,0,0.6)',
            }}
          >
            <span style={{ color: 'var(--paper-050)' }}>Stay</span>
            <span style={{ color: 'var(--ink-400)' }}>Or</span>
            <span style={{ color: 'var(--nay-400)' }}>Nay</span>
          </div>
        </div>
      </div>
    </div>
  );
}
