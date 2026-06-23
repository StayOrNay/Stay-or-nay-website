import React, { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { mapboxgl } from '../lib/mapbox';
import { BALI, formatCoord } from './geo';
import { baliLightPreset } from './daynight';

// --- Timeline (ms) — matches the reference spin → flyTo cinematic --------
const SPIN_MS = 2600;
const FLY_MS = 5200;
const LABEL_DELAY_MS = 350;
const FADE_MS = 500;

const START_CENTER = [-40, 18];
const SPIN_LNG_DELTA = 230;
const ISLAND_ZOOM = 7.6;

function gibsCloudUrl() {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday UTC — guaranteed processed
  const day = d.toISOString().slice(0, 10);
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${day}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
}

/**
 * Cinematic globe splash, modeled on a Mapbox GL JS reference: real photoreal
 * satellite imagery via Mapbox's Standard Satellite style, native `globe`
 * projection, a smoothstep-eased spin, then a flyTo landing on Bali with a
 * real local-time day/night lighting preset. A light NASA GIBS cloud pass
 * sits on top as a bonus layer — its failure never blocks the intro.
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
        zoom: 1.4,
        pitch: 0,
        interactive: false,
        attributionControl: true, // required by Mapbox's terms
      });
    } catch (err) {
      setFailed(true);
      window.setTimeout(finish, 400);
      return undefined;
    }

    let raf = null;
    let labelTimeoutId = null;
    let fadeTimeoutId = null;
    let finishTimeoutId = null;
    let loadWatchdogId = null;

    const goToEnd = () => {
      if (raf) cancelAnimationFrame(raf);
      if (labelTimeoutId) clearTimeout(labelTimeoutId);
      if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
      if (finishTimeoutId) clearTimeout(finishTimeoutId);
      if (loadWatchdogId) clearTimeout(loadWatchdogId);
      try {
        map.jumpTo({ center: [BALI.lon, BALI.lat], zoom: ISLAND_ZOOM, pitch: 30, bearing: -10 });
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

    const flyToBali = () => {
      map.flyTo({
        center: [BALI.lon, BALI.lat],
        zoom: ISLAND_ZOOM,
        pitch: 30,
        bearing: -10,
        duration: FLY_MS,
        curve: 1.5,
        essential: true,
      });
      finishTimeoutId = window.setTimeout(() => {
        if (skipRef.current) return;
        labelTimeoutId = window.setTimeout(() => {
          if (skipRef.current) return;
          setShowLabel(true);
          fadeTimeoutId = window.setTimeout(() => {
            if (skipRef.current) return;
            setFading(true);
            window.setTimeout(finish, FADE_MS);
          }, LABEL_DELAY_MS + 900);
        }, 0);
      }, FLY_MS);
    };

    const runSpin = () => {
      const start = performance.now();
      const [startLng, startLat] = START_CENTER;
      const spin = (now) => {
        const t = Math.min((now - start) / SPIN_MS, 1);
        const e = t * t * (3 - 2 * t); // smoothstep
        map.setCenter([startLng + e * SPIN_LNG_DELTA, startLat * (1 - e)]);
        if (t < 1) {
          raf = requestAnimationFrame(spin);
        } else {
          flyToBali();
        }
      };
      raf = requestAnimationFrame(spin);
    };

    loadWatchdogId = window.setTimeout(() => {
      if (!completedRef.current) {
        setFailed(true);
        finish();
      }
    }, 5000);

    map.on('load', () => {
      clearTimeout(loadWatchdogId);
      try {
        map.setConfigProperty('basemap', 'lightPreset', baliLightPreset());
      } catch (err) {
        // Older style revisions may not support config properties — non-fatal.
      }
      addCloudLayer();
      runSpin();
    });

    map.on('error', (e) => {
      // Tile/network hiccups (e.g. a single failed cloud tile) must never
      // abort the cinematic — just log for debugging.
      // eslint-disable-next-line no-console
      console.warn('Mapbox tile error (non-fatal):', e && e.error);
    });

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      completedRef.current = true;
      goToEndRef.current = null;
      if (raf) cancelAnimationFrame(raf);
      if (labelTimeoutId) clearTimeout(labelTimeoutId);
      if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
      if (finishTimeoutId) clearTimeout(finishTimeoutId);
      if (loadWatchdogId) clearTimeout(loadWatchdogId);
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
