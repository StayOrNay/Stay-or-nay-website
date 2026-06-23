import React, { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { mapboxgl } from '../lib/mapbox';
import { BALI, formatCoord } from './geo';
import { baliLightPreset } from './daynight';

// --- Timeline (ms) — three beats driven by one continuous rAF loop (no
// separate Mapbox animations chained together, so there's still no visible
// cut): a static pre-roll so the globe is actually loaded before anything
// moves, then a full-Earth-view spin, then a quick zoom into Bali. --------
const PRE_DELAY_MS = 1000; // hold still so tiles/style have a moment to load
const SPIN_MS = 2000; // full-Earth-view spin
const ZOOM_MS = 1400; // quick zoom into Bali
const LABEL_DELAY_MS = 350;
const FADE_MS = 500;

const SPIN_ZOOM = 1.5;
const SPIN_LNG_DELTA = 300; // a near-full revolution — unmistakably "spinning"
const START_CENTER = [BALI.lon - SPIN_LNG_DELTA, 12];
const ISLAND_ZOOM = 7.6;

// The spin covers most of the distance to Bali at a constant full-Earth
// zoom; the zoom-in beat covers the last stretch plus the entire zoom/pitch
// change, so the "quick zoom" reads as a distinct, fast final move.
const SPIN_COVERS = 0.9;
const SPIN_END_CENTER = [
  START_CENTER[0] + (BALI.lon - START_CENTER[0]) * SPIN_COVERS,
  START_CENTER[1] + (BALI.lat - START_CENTER[1]) * SPIN_COVERS,
];

const PITCH_PEAK = 48;

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

// Pitch rises into a 3D tilt early in the zoom-in beat, then eases back to
// flat (2D) before that beat ends, so it's clearly "landed" rather than
// still tilting when it settles on Bali. `t` is local progress [0,1] within
// the zoom-in beat only — flat during the pre-roll and the spin.
function zoomInPitchProgress(t) {
  const flatBy = 0.8;
  if (t >= flatBy) return 0;
  return Math.sin(Math.PI * Math.min(t / flatBy, 1));
}

function gibsCloudUrl() {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday UTC — guaranteed processed
  const day = d.toISOString().slice(0, 10);
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${day}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
}

/**
 * Cinematic globe splash: real photoreal satellite imagery via Mapbox's
 * Standard Satellite style, native `globe` projection, real local-time
 * day/night lighting. The whole sequence is one continuous, hand-driven
 * flight (a single requestAnimationFrame loop calling jumpTo every frame)
 * rather than separate Mapbox animations stitched together — there's no
 * visible cut between beats, only a change in rate of motion: (1) a brief
 * static hold so the globe is actually loaded before anything moves, (2) a
 * steady full-Earth-view spin, (3) a quick ease-out zoom into Bali with
 * pitch rising into a 3D tilt then flattening back to 2D as it lands.
 * Config properties (lightPreset) are set on 'style.load' per Mapbox's
 * docs. A light NASA GIBS cloud pass sits on top as a bonus layer — its
 * failure never blocks the intro.
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

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      finish();
      return undefined;
    }

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

    // One continuous, hand-rolled flight (a single rAF loop calling jumpTo
    // every frame) — never two separate Mapbox animations stitched
    // together, so there's no visible cut between beats. The loop just
    // changes behavior by elapsed time: hold still, then spin, then zoom in.
    const runFlight = () => {
      const startTime = performance.now();

      const tick = (now) => {
        if (skipRef.current) return;
        const elapsed = now - startTime;

        if (elapsed < PRE_DELAY_MS) {
          // Hold on the static full-Earth view — gives the style/tiles a
          // moment to actually load before any motion starts, so we're
          // never visibly spinning a half-loaded globe.
          rafId = requestAnimationFrame(tick);
          return;
        }

        if (elapsed < PRE_DELAY_MS + SPIN_MS) {
          // Spin: constant full-Earth zoom, steady rotation speed.
          const tSpin = (elapsed - PRE_DELAY_MS) / SPIN_MS;
          const lng = START_CENTER[0] + (SPIN_END_CENTER[0] - START_CENTER[0]) * tSpin;
          const lat = START_CENTER[1] + (SPIN_END_CENTER[1] - START_CENTER[1]) * tSpin;
          map.jumpTo({ center: [lng, lat], zoom: SPIN_ZOOM, pitch: 0, bearing: 0 });
          rafId = requestAnimationFrame(tick);
          return;
        }

        const tZoomRaw = Math.min((elapsed - PRE_DELAY_MS - SPIN_MS) / ZOOM_MS, 1);
        const tZoom = easeOutQuint(tZoomRaw);

        const lng = SPIN_END_CENTER[0] + (BALI.lon - SPIN_END_CENTER[0]) * tZoom;
        const lat = SPIN_END_CENTER[1] + (BALI.lat - SPIN_END_CENTER[1]) * tZoom;
        const zoom = SPIN_ZOOM + (ISLAND_ZOOM - SPIN_ZOOM) * tZoom;
        const pitch = PITCH_PEAK * zoomInPitchProgress(tZoomRaw);

        map.jumpTo({ center: [lng, lat], zoom, pitch, bearing: 0 });

        if (tZoomRaw < 1) {
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

    // Starts immediately — does not wait for 'load' — so the timer-driven
    // pre-roll is what guarantees load time, rather than gating on a 'load'
    // event that could fire late or never on a bad connection.
    runFlight();

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

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      completedRef.current = true;
      goToEndRef.current = null;
      if (rafId) cancelAnimationFrame(rafId);
      if (labelTimeoutId) clearTimeout(labelTimeoutId);
      if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
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
