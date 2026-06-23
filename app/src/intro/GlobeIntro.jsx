import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BALI, formatCoord, easeInOutCubic, clamp01, lerp } from './geo';
import { buildTerminatorPolygon } from './solar';

// --- Timeline (ms) — lands precisely on Bali within ~3.6s total ----------
const SPIN_MS = 1200;
const FLY_MS = 1500;
const LABEL_MS = 500;
const FADE_MS = 400;

const SPIN_START_ZOOM = 1.35;
const LAND_ZOOM = 13.2;

const SATELLITE_TILES = [
  'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg',
];

function gibsCloudUrl() {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday UTC — guaranteed processed
  const day = d.toISOString().slice(0, 10);
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${day}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
}

function buildStyle() {
  return {
    version: 8,
    projection: { type: 'globe' },
    sources: {
      satellite: {
        type: 'raster',
        tiles: SATELLITE_TILES,
        tileSize: 256,
        maxzoom: 14,
        attribution: '© EOX IT Services GmbH — Sentinel-2 cloudless',
      },
      clouds: {
        type: 'raster',
        tiles: [gibsCloudUrl()],
        tileSize: 256,
        maxzoom: 9,
        attribution: 'NASA EOSDIS GIBS / VIIRS SNPP',
      },
      terminator: {
        type: 'geojson',
        data: buildTerminatorPolygon(),
      },
    },
    layers: [
      { id: 'space', type: 'background', paint: { 'background-color': '#000208' } },
      { id: 'satellite', type: 'raster', source: 'satellite' },
      {
        id: 'clouds',
        type: 'raster',
        source: 'clouds',
        paint: {
          'raster-opacity': 0.5,
          'raster-saturation': -1,
          'raster-contrast': 0.55,
          'raster-brightness-min': 0.5,
        },
      },
      {
        id: 'terminator',
        type: 'fill',
        source: 'terminator',
        paint: { 'fill-color': '#00030c', 'fill-opacity': 0.5 },
      },
      { id: 'sky', type: 'sky', paint: { 'sky-type': 'atmosphere', 'sky-atmosphere-sun-intensity': 9 } },
    ],
    fog: {
      range: [0.5, 9],
      color: 'rgba(150,190,255,0.25)',
      'high-color': '#0b1a2b',
      'space-color': '#000208',
      'horizon-blend': 0.06,
      'star-intensity': 0.55,
    },
  };
}

/**
 * Cinematic photorealistic globe splash: real Sentinel-2 satellite imagery
 * (EOX s2cloudless), a live NASA GIBS cloud pass, and a real sun-position
 * day/night terminator — spins briefly, then flies down and lands precisely
 * on Bali within ~3.6 seconds before handing off to the app.
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
      map = new maplibregl.Map({
        container,
        style: buildStyle(),
        center: [BALI.lon - 150, 8],
        zoom: SPIN_START_ZOOM,
        interactive: false,
        attributionControl: { compact: true },
      });
    } catch (err) {
      setFailed(true);
      window.setTimeout(finish, 600);
      return undefined;
    }

    let raf = null;
    let labelTimeoutId = null;
    let fadeTimeoutId = null;
    let flyTimeoutId = null;
    let finishTimeoutId = null;
    let spinDone = false;
    const start = performance.now();
    const startLng = BALI.lon - 150;

    const goToEnd = () => {
      if (raf) cancelAnimationFrame(raf);
      if (labelTimeoutId) clearTimeout(labelTimeoutId);
      if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
      if (finishTimeoutId) clearTimeout(finishTimeoutId);
      map.jumpTo({ center: [BALI.lon, BALI.lat], zoom: LAND_ZOOM });
      setShowLabel(true);
      setFading(true);
      window.setTimeout(finish, 250);
    };
    goToEndRef.current = goToEnd;

    const spinTick = () => {
      const elapsed = performance.now() - start;
      const t = easeInOutCubic(clamp01(elapsed / SPIN_MS));
      const lng = lerp(startLng, BALI.lon, t);
      map.jumpTo({ center: [lng, lerp(8, BALI.lat, t)], zoom: SPIN_START_ZOOM });

      if (elapsed >= SPIN_MS) {
        spinDone = true;
      } else {
        raf = requestAnimationFrame(spinTick);
      }

      if (spinDone) {
        map.flyTo({
          center: [BALI.lon, BALI.lat],
          zoom: LAND_ZOOM,
          duration: FLY_MS,
          curve: 1.3,
          essential: true,
        });
        labelTimeoutId = window.setTimeout(() => {
          if (skipRef.current) return;
          setShowLabel(true);
        }, FLY_MS);
        fadeTimeoutId = window.setTimeout(() => {
          if (skipRef.current) return;
          setFading(true);
        }, FLY_MS + LABEL_MS);
        finishTimeoutId = window.setTimeout(() => {
          if (skipRef.current) return;
          finish();
        }, FLY_MS + LABEL_MS + FADE_MS);
      }
    };

    const onLoad = () => {
      raf = requestAnimationFrame(spinTick);
    };

    map.on('load', onLoad);
    map.on('error', () => {
      // Tile/network failure: never show a black screen — bail straight
      // into the app rather than hang on a broken intro.
      if (!completedRef.current) {
        setFailed(true);
        finish();
      }
    });

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      completedRef.current = true;
      goToEndRef.current = null;
      if (raf) cancelAnimationFrame(raf);
      if (labelTimeoutId) clearTimeout(labelTimeoutId);
      if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
      if (flyTimeoutId) clearTimeout(flyTimeoutId);
      if (finishTimeoutId) clearTimeout(finishTimeoutId);
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
    <div style={{ position: 'absolute', inset: 0, background: '#000208', overflow: 'hidden' }}>
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
