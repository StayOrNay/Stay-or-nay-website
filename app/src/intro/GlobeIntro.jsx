import React, { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { mapboxgl } from '../lib/mapbox';
import { BALI, EXPLORE_ZOOM } from './geo';
import { baliLightPreset } from './daynight';
import { antisolarPoint, hemisphereRing, angularDistanceDeg, MAJOR_CITIES } from './terminator';

// --- Timeline (ms) — ONE single overlapping flight, not two sequential
// beats. Rotation, zoom, and pitch are all driven off the SAME elapsed-time
// fraction (t, 0..1) across the whole FLIGHT_MS duration, rather than
// "spin fully stops, THEN zoom starts." Splitting those into a rotation
// phase followed by a separate zoom phase — even with matched velocities
// at the seam — still read as "two spins": a full rotation visibly comes
// to a stop, then a beat later something else (the zoom) starts, and that
// stop-then-go always reads as two separate motions no matter how smooth
// each one is on its own. Overlapping them removes the stop: the rotation
// is still decelerating while the zoom-in is already ramping up, so the
// last bit of "slowing down" and the start of "zooming into Bali" happen
// at the same time, as one continuous motion.
const PRE_DELAY_MS = 0; // no hold — motion starts on frame one
const FLIGHT_MS = 5500; // a second longer than before, to give the turbo ramp-up room to build
const LABEL_DELAY_MS = 350;
const FADE_MS = 500;

const SPIN_ZOOM = 1.5; // low zoom so the whole globe is on screen while it spins
// Exactly ONE revolution, not two. Two full laps (720°) was the actual
// cause of repeated "it looks like two spins" reports across several
// easing-curve rewrites — tuning the curve never fixed it because the
// problem wasn't the curve, it was the camera visibly passing its own
// starting meridian a second time mid-animation. A single lap only ever
// crosses that meridian once, right at the very end where it's supposed
// to land on Bali — there's nothing left to read as "a second spin".
const SPIN_LNG_DELTA = 360;
// Rotation happens at Bali's latitude the whole time, starting one full
// turn east of Bali's longitude, so it lands exactly on Bali by t=1 — the
// same instant the zoom-in and pitch also finish, with nothing left over.
const START_CENTER = [BALI.lon - SPIN_LNG_DELTA, BALI.lat];
// Lands at the exact same center/zoom the live Explore map opens with
// (see SatelliteMap) — one continuous shot into the real, interactive map
// rather than a zoom that then cuts to a second, differently-framed map.
const ISLAND_ZOOM = EXPLORE_ZOOM;

const PITCH_PEAK = 48;
const PITCH_RISE_AT = 0.68; // fraction of the WHOLE flight pitch starts rising into 3D
const PITCH_FLAT_BY = 0.97; // fraction of the WHOLE flight pitch is back to flat (2D) on landing

// Rotation: maximum velocity right on frame one — "spin faster" — then a
// long, continuous deceleration the rest of the way ("...and then slow
// down") down to a dead stop exactly at t=1. Quintic ease-out rather than
// the previous build-up curve: 1-(1-t)^5 front-loads almost all of the
// angular speed into the opening of the flight, so the spin itself reads
// as fast immediately rather than ramping up to it, while the back half
// reads as a clear, gradual slow-down rather than still accelerating.
function spinEase(t) {
  return 1 - (1 - t) ** 5;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t); // zero velocity at both t=0 and t=1
}

// Zoom: held near-zero across most of the flight — including through the
// slow-down — and only really ramps in during the final stretch, so
// "zoom into Bali" plays as the next beat after the spin has visibly
// slowed, not something happening throughout. Cubing smoothstep (vs.
// squaring before) pushes the rise even later while keeping the same
// zero-velocity endpoints: (smoothstep(t))^3 is still exactly 0 at t=0 and
// still has zero slope at t=1, it just stays flatter for longer first.
function zoomEase(t) {
  const s = smoothstep(t);
  return s * s * s;
}

// 0 -> rises -> peaks -> falls -> 0, confined to [PITCH_RISE_AT, PITCH_FLAT_BY]
// and flat outside it — the 3D tilt only kicks in during the back portion
// of the flight where the zoom-in is actually happening, and is flat
// (2D) again by landing.
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

const CLOUD_OPACITY = 0.45;
// Clouds fade out as the camera's zoom crosses this range — fully gone
// well before the cloud source's own maxzoom (9) would otherwise force it
// to stretch a low-res tile over a much closer view (the "blurry over the
// streets" bug). Tied to the actual zoom value rather than the zoom beat's
// timing, so it disappears at the right ALTITUDE regardless of how the
// easing curve moves through that altitude.
const CLOUD_FADE_START_ZOOM = 5;
const CLOUD_FADE_END_ZOOM = 8;

const ICE_CAP_RADIUS_DEG = 5.6; // just past the 85.0511° Web-Mercator clip line
const ICE_CAP_COLOR = '#eef2f5';
const ICE_CAP_OPACITY = 0.88;

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
    slot: 'bottom', // explicit slot — keeps stacking vs. clouds/ice-caps deterministic
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
    slot: 'bottom',
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
    slot: 'bottom',
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
    slot: 'bottom',
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

function setCloudOpacity(map, factor) {
  try {
    map.setPaintProperty('clouds', 'raster-opacity', CLOUD_OPACITY * factor);
  } catch (err) {
    // Layer may not exist yet (style still loading, or the cloud tile
    // fetch failed) — bonus layer only, never let it throw.
  }
}

// A small circle of constant latitude IS a circle around a geographic
// pole — no spherical-trig bearing/distance math needed (and that math is
// degenerate exactly at the poles anyway: cos(90°) collapses the bearing
// term and atan2(0,0) returns 0 for every bearing in JS, which is why this
// doesn't reuse terminator.js's hemisphereRing/destinationPoint here).
function capRing(poleLat, radiusDeg, steps = 72) {
  const lat = poleLat > 0 ? 90 - radiusDeg : -90 + radiusDeg;
  const ring = [];
  for (let i = 0; i <= steps; i++) {
    const lon = -180 + (360 * i) / steps;
    ring.push([lon, lat]);
  }
  return ring;
}

// The NASA GIBS cloud tiles are Web-Mercator (EPSG:3857), which is
// mathematically undefined above ~85.0511°N/S — there is no real tile
// data for the actual poles, full stop, no parameter fixes that. At the
// spin's wide zoomed-out view the entire sphere (both poles included) is
// on screen, so that gap reads as the clouds visibly stopping short of
// the poles. A small pale disc capping each pole covers the gap — and is
// geographically true to life besides: real polar caps do look white and
// icy from space.
function addIceCaps(map) {
  [['ice-cap-north', 90], ['ice-cap-south', -90]].forEach(([id, poleLat]) => {
    try {
      if (map.getSource(id)) return;
      map.addSource(id, {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [capRing(poleLat, ICE_CAP_RADIUS_DEG)] } },
      });
      map.addLayer({
        id,
        type: 'fill',
        source: id,
        slot: 'bottom',
        paint: { 'fill-color': ICE_CAP_COLOR, 'fill-opacity': ICE_CAP_OPACITY },
      });
    } catch (err) {
      // Decorative only — never let it block the intro.
    }
  });
}

/**
 * Cinematic globe splash: real photoreal satellite imagery via Mapbox's
 * Standard Satellite style, native `globe` projection, a real astronomical
 * day/night terminator with a scatter of city lights on the night side,
 * and real local-time lighting once landed. Driven entirely by a single
 * hand-rolled requestAnimationFrame loop calling jumpTo every frame (never
 * separate Mapbox animations stitched together), this is ONE overlapping
 * flight, not a rotation beat followed by a zoom beat: the globe spins one
 * full revolution starting at full speed on the very first frame, and
 * while that rotation is still decelerating the camera is already zooming
 * in toward Bali (FLIGHT_MS total) — landing at the exact center/zoom/
 * projection the live Explore map opens with, so the shot continues
 * straight into the real app rather than cutting to a second,
 * differently-framed map. Config properties (lightPreset) are set on
 * 'style.load' per Mapbox's docs. A light NASA GIBS cloud pass sits on top
 * as a bonus layer — its failure never blocks the intro.
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
        // Set basemap config (label visibility, lighting) HERE, at
        // construction time, rather than via map.setConfigProperty() inside
        // a 'style.load' handler. The latter is a known source of a
        // silent failure: calling setConfigProperty before the style's
        // 'basemap' import has fully resolved throws "Style import not
        // found: basemap" (mapbox-gl-js#12841) — and our style.load
        // handler wrapped that call in try/catch, so on the live site the
        // error was being swallowed every time, leaving every label off
        // with no visible error at all. Passing config directly in the
        // style/constructor is Mapbox's own documented fix: the basemap
        // renders with these already applied from the very first frame,
        // no event-timing race possible.
        config: {
          basemap: {
            lightPreset: baliLightPreset(),
            showPlaceLabels: true,
            showPointOfInterestLabels: true,
            showRoadLabels: true,
          },
        },
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
        setCloudOpacity(map, 0);
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
          slot: 'bottom', // explicit slot — keeps stacking vs. night/ice-caps deterministic
          // Hard cutoff matching the source's own maxzoom: past this the
          // raster would just be the same z9 tile stretched over a much
          // closer view (overzoomed → blurry) — exactly what was making
          // street-level Bali look hazy. The opacity fade below (tied to
          // CLOUD_FADE_START/END_ZOOM) already takes it to 0 well before
          // this, so this is a backstop, not the primary fix.
          maxzoom: 9,
          paint: {
            // This is yesterday's real VIIRS pass, so the cloud cover it
            // shows is genuinely uneven already — thick over some regions,
            // clear over others. Pushed contrast/brightness-min punch up
            // that real variation (denser white clouds read brighter and
            // more solid, clear sky/ocean recedes further into the
            // basemap) rather than laying down one flat haze everywhere.
            'raster-opacity': CLOUD_OPACITY,
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

    // ONE hand-rolled rAF loop calling jumpTo every frame — never separate
    // Mapbox animations stitched together, and no internal phase
    // branching either: rotation, zoom, and pitch are all just functions
    // of the same elapsed-time fraction t, running simultaneously for the
    // whole flight rather than one finishing before the next starts.
    const TOTAL_MS = PRE_DELAY_MS + FLIGHT_MS;

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

        // Single shared time fraction — rotation, zoom, and pitch all read
        // off this same t every frame, simultaneously, for the entire
        // flight. There is no point where one of these is "done" and
        // another "starts": spinEase is still easing lng toward Bali while
        // zoomEase is already pulling the camera in, which is what makes
        // the deceleration and the zoom-in feel like one continuous motion
        // instead of a stop followed by a separate second movement.
        const t = Math.min(Math.max((elapsed - PRE_DELAY_MS) / FLIGHT_MS, 0), 1);
        const spinT = spinEase(t);
        const zoomT = zoomEase(t);

        const lng = START_CENTER[0] + (BALI.lon - START_CENTER[0]) * spinT;
        const zoom = SPIN_ZOOM + (ISLAND_ZOOM - SPIN_ZOOM) * zoomT;
        const pitch = PITCH_PEAK * pitchProgress(t);
        // Fades out in step with the zoom-in (not a separate later beat),
        // so it's gone by the time the real, local lightPreset takes over.
        const nightFactor = 1 - zoomT;

        map.jumpTo({ center: [lng, BALI.lat], zoom, pitch, bearing: 0 });
        setNightOpacity(map, nightFactor);
        // Driven by the actual zoom value (altitude), not by beat timing —
        // so clouds are reliably gone by the time the view is actually
        // close enough to read as "street level", regardless of how the
        // easing curve moves through that zoom range.
        const cloudFade =
          1 - Math.min(1, Math.max(0, (zoom - CLOUD_FADE_START_ZOOM) / (CLOUD_FADE_END_ZOOM - CLOUD_FADE_START_ZOOM)));
        setCloudOpacity(map, cloudFade);

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
    //
    // Must bail out immediately if flightStarted is already true. This used
    // to unconditionally reset flightStarted = false here and call
    // startFlightWhenReady() again — which, since the container almost
    // always already has real dimensions well before 1200ms, just started
    // a SECOND, fully independent runFlight() loop on top of the one
    // already mid-animation. Two concurrent rAF loops both calling jumpTo
    // every frame is exactly what made the intro look like "it spins once,
    // cuts, and spins again": at the 1200ms mark the camera would snap back
    // to START_CENTER as the new loop's t=0 frame overwrote the original
    // loop's in-progress position, then replay the whole spin from
    // scratch. This was the actual bug behind every "two spins" report —
    // not the easing curve, which is why repeated curve rewrites never
    // fixed it.
    const flightFallbackId = window.setTimeout(() => {
      if (flightStarted) return;
      flightStarted = true;
      runFlight();
    }, 1200);

    map.on('style.load', () => {
      // Basemap config (lightPreset, label visibility) is now set in the
      // Map constructor's `config` option above — not here — so there's
      // nothing left to do for that on every style.load.
      // Order matters: each layer below renders on top of the previous
      // one (no explicit 'before' needed since night/ice-caps share the
      // 'bottom' slot and are added after clouds) — so the night-dark
      // overlay correctly darkens both the clouds and the ice caps
      // underneath it, instead of clouds showing through at full
      // brightness over the night side like before.
      addCloudLayer();
      try {
        addIceCaps(map);
      } catch (err) {
        // Decorative only — never let it block the intro.
      }
      try {
        addNightLayers(map);
      } catch (err) {
        // Decorative only — never let it block the intro.
      }
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
          {/* Landing caption — its own fade-in-then-fade-away (not just the
              whole-screen fade at the very end), so "BALI, INDONESIA" reads
              as its own beat: appears as the camera settles, holds a moment,
              then dissolves before the cut into the real map. Driven by a
              CSS keyframe (triggered once showLabel flips true) rather than
              extra timers, so it can't drift out of sync with the existing
              label/fade timeline. */}
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              letterSpacing: '0.14em',
              color: 'var(--sky-300)',
              marginBottom: 10,
              textShadow: '0 1px 6px rgba(0,0,0,0.6)',
              opacity: 0,
              animation: showLabel ? 'baliCaptionFade 1900ms ease-out forwards' : 'none',
            }}
          >
            BALI, INDONESIA
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

      <style>{`
        @keyframes baliCaptionFade {
          0% { opacity: 0; transform: translateY(8px); }
          20% { opacity: 1; transform: translateY(0); }
          72% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
