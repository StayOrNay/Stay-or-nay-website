import React, { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { mapboxgl } from '../lib/mapbox';
import { BALI, formatCoord } from './geo';
import { baliLightPreset } from './daynight';

// --- Timeline (ms) — back to three explicit beats, per feedback: a held
// pre-roll on the full globe, THEN a couple of seconds where the whole
// Earth is visible and visibly spinning, THEN a zoom-in that lands on
// Bali. The spin and zoom phases are joined at a single shared point (the
// spin always ends exactly on Bali's longitude/latitude, so the zoom phase
// starts from precisely where the spin left off) — there's still no seam
// because position never jumps between phases, only zoom/pitch change.
const PRE_DELAY_MS = 900; // hold on the spinning globe before motion starts
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
const ISLAND_ZOOM = 7.6;

const PITCH_PEAK = 48;
const PITCH_RISE_AT = 0.12; // fraction of the ZOOM phase pitch starts rising into 3D
const PITCH_FLAT_BY = 0.85; // fraction by which pitch is back to flat (2D) on landing

// Smooth accelerate-then-decelerate — used for the spin so it visibly winds
// up to speed and winds back down, rather than spinning at a constant rate.
function easeInOutSine(t) {
  return (1 - Math.cos(Math.PI * t)) / 2;
}

// Ease-out: maximum velocity right at the start of the zoom, smoothly
// decelerating all the way into the landing.
function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
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

/**
 * Cinematic globe splash: real photoreal satellite imagery via Mapbox's
 * Standard Satellite style, native `globe` projection, real local-time
 * day/night lighting. Driven entirely by a single hand-rolled
 * requestAnimationFrame loop calling jumpTo every frame (never separate
 * Mapbox animations stitched together), the sequence holds on the full
 * globe (PRE_DELAY_MS), spins it a couple of full revolutions while the
 * whole Earth stays on screen (SPIN_MS), then zooms in to land on Bali
 * (ZOOM_MS) with pitch rising into a 3D tilt and flattening back to 2D on
 * landing. The spin always finishes exactly on Bali's lon/lat, so the
 * zoom phase only ever animates zoom/pitch — never position — which is
 * what keeps the hand-off between phases seamless. Config properties
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
      } catch (err) {
        // ignore — we're tearing down anyway
      }
      setShowLabel(true);
      setFading(true);
      window.setTimeout(finish, 250);
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
            'raster-opacity': 0.4,
            'raster-saturation': -1,
            'raster-contrast': 0.5,
            'raster-brightness-min': 0.5,
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

        if (elapsed < PRE_DELAY_MS) {
          // Held on the full globe, already spinning-in-place visually via
          // the style's own rotation cue — camera itself doesn't move yet.
          lng = START_CENTER[0];
        } else if (elapsed < PRE_DELAY_MS + SPIN_MS) {
          // Beat 1: spin the whole way to Bali's longitude while staying
          // zoomed out far enough to see the entire globe.
          const spinT = easeInOutSine(Math.min((elapsed - PRE_DELAY_MS) / SPIN_MS, 1));
          lng = START_CENTER[0] + (BALI.lon - START_CENTER[0]) * spinT;
          zoom = SPIN_ZOOM;
          pitch = 0;
        } else {
          // Beat 2: position is already exactly on Bali — only zoom and
          // pitch animate from here, landing on the island.
          const zoomTRaw = Math.min((elapsed - PRE_DELAY_MS - SPIN_MS) / ZOOM_MS, 1);
          const zoomT = easeOutQuint(zoomTRaw);
          lng = BALI.lon;
          zoom = SPIN_ZOOM + (ISLAND_ZOOM - SPIN_ZOOM) * zoomT;
          pitch = PITCH_PEAK * pitchProgress(zoomTRaw);
        }

        map.jumpTo({ center: [lng, BALI.lat], zoom, pitch, bearing: 0 });

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
    <div style={{ position: 'absolute', inset: 0, background: '#03040a', overflow: 'hidden' }}>
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

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--paper-100)',
          opacity: fading ? 1 : 0,
          transition: `opacity ${FADE_MS}ms var(--ease-in-out)`,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
    </div>
  );
}
