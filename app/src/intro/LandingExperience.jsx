import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'mapbox-gl/dist/mapbox-gl.css';
import { mapboxgl } from '../lib/mapbox';
import { BALI, EXPLORE_ZOOM } from './geo';
import { addAtmosphere, setAtmosphere, CITY_TWINKLE_AMP, CLOUD_FADE_START_ZOOM, CLOUD_FADE_END_ZOOM } from './atmosphere';
import { markLandingSeen } from '../context/ImmersiveContext';
import './landing.css';

/**
 * The cinematic landing experience — replaces the auto-playing GlobeIntro.
 *
 * A real Mapbox satellite globe (same style + token as the live Explore
 * map) sits behind a minimal hero. Instead of a fixed 5.5s flight, the
 * globe travels a worldwide destination showcase (Bali → Santorini → Tulum
 * → …) until the visitor clicks "Explore the world" — then the camera
 * dives from orbit to the exact center/zoom the live Explore map opens
 * with (BALI / EXPLORE_ZOOM, shared via intro/geo.js), and the whole
 * landing fades out over the already-mounted real map underneath: one
 * continuous shot from space into the interactive app, no cut.
 *
 * Below the hero, the landing scrolls through the brand story: the
 * verdict-stamp scene (scroll-scrubbed), how verdicts work, the trust
 * band ("0 bookings taken. Ever."), and a final CTA. "Skip" (top right)
 * jumps straight into the app for returning visitors.
 */

// The site is Bali-first for now, so the world tour is OFF: the globe
// spins in and holds on Bali. When it's time to go global again, flip
// WORLD_TOUR to true — the full destination cycle below comes back.
const WORLD_TOUR = false;
const DESTS = [
  { name: 'BALI, INDONESIA', lng: BALI.lon, lat: BALI.lat },
  { name: 'SANTORINI, GREECE', lng: 25.4615, lat: 36.3932 },
  { name: 'TULUM, MEXICO', lng: -87.4654, lat: 20.2114 },
  { name: 'PHUKET, THAILAND', lng: 98.3923, lat: 7.8804 },
  { name: 'AMALFI COAST, ITALY', lng: 14.6027, lat: 40.634 },
  { name: 'CAPE TOWN, SOUTH AFRICA', lng: 18.4241, lat: -33.9249 },
];
const SHOWCASE_ZOOM = 1.6;
const CYCLE_MS = 6500;
const TRAVEL_MS = 4200;
const FADE_MS = 650;
// Opening beat: one full revolution, fast on frame one and decelerating to
// a dead stop on Bali (same single-lap quintic as the old GlobeIntro — two
// laps or a late ramp-up both read as "two spins", see GlobeIntro history).
const OPEN_SPIN_MS = 3800;
const OPEN_SPIN_DELTA = 360;

function coordStr(d) {
  const la = `${Math.abs(d.lat).toFixed(4)}° ${d.lat < 0 ? 'S' : 'N'}`;
  const lo = `${Math.abs(d.lng).toFixed(4)}° ${d.lng < 0 ? 'W' : 'E'}`;
  return `${la} · ${lo} — ${d.name}`;
}

const CHECKS = [
  ['s', 'Pool actually private'],
  ['s', 'Photos match reality'],
  ['n', 'Construction next door'],
  ['s', 'Wifi speed tested'],
  ['s', 'Staff & host honesty'],
  ['n', '“Sea view” from the roof only'],
  ['s', 'Noise at 7am checked'],
  ['s', 'Real distance to the beach'],
  ['n', 'Listing photos 5 years old'],
  ['s', 'Verified stay — receipts shown'],
];

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const phase = (p, a, b) => clamp01((p - a) / (b - a));

export function LandingExperience({ onComplete }) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const globeRef = useRef(null);
  const mapRef = useRef(null);
  const destIdxRef = useRef(0);
  const cycleRef = useRef(null);
  const divingRef = useRef(false);
  const completedRef = useRef(false);

  const heroRef = useRef(null);
  const progressRef = useRef(null);
  const chipTextRef = useRef(null);
  const sceneRef = useRef(null);
  const cardARef = useRef(null);
  const cardBRef = useRef(null);
  const stampStayRef = useRef(null);
  const stampNayRef = useRef(null);
  const shockARef = useRef(null);
  const shockBRef = useRef(null);
  const contourRefs = useRef([]);

  const [diving, setDiving] = useState(false);
  const [fading, setFading] = useState(false);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    markLandingSeen(); // future visits skip straight to the map
    if (onComplete) onComplete();
  };

  /* ----- Mapbox globe ----- */
  useEffect(() => {
    const container = globeRef.current;
    if (!container) return undefined;

    let map;
    try {
      map = new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/standard-satellite',
        projection: 'globe',
        // Starts one full turn west of Bali — the opening spin below
        // travels that lap and lands exactly on the first destination.
        center: [DESTS[0].lng - OPEN_SPIN_DELTA, DESTS[0].lat],
        zoom: SHOWCASE_ZOOM,
        pitch: 0,
        bearing: 0,
        interactive: false,
        attributionControl: true,
        // Clean globe: no labels at orbit altitude — they cluttered the
        // showcase. Set at construction time (not style.load) to avoid the
        // "Style import not found: basemap" race (mapbox-gl-js#12841).
        // Always 'day' — NOT baliLightPreset(). The time-of-day preset
        // darkened the whole basemap during Bali's night (i.e. most of the
        // day in Europe), and stacked with the terminator overlay it made
        // the hero island unreadable. The geographic night polygon +
        // city lights already tell the day/night story; the base imagery
        // stays bright so you can always SEE Bali.
        config: {
          basemap: {
            lightPreset: 'day',
            showPlaceLabels: false,
            showPointOfInterestLabels: false,
            showRoadLabels: false,
            showTransitLabels: false,
          },
        },
      });
    } catch (err) {
      // WebGL unavailable — skip straight into the app rather than block.
      window.setTimeout(finish, 300);
      return undefined;
    }
    mapRef.current = map;

    map.on('error', (e) => {
      // Tile hiccups are non-fatal; the showcase keeps running regardless.
      // eslint-disable-next-line no-console
      console.warn('Landing globe tile error (non-fatal):', e && e.error);
    });

    // Real-Earth dressing: yesterday's clouds, the true day/night
    // terminator, twinkling city lights, polar caps (shared with the old
    // intro via atmosphere.js). Faded by ALTITUDE, not by beat timing — a
    // slow ticker reads the camera's actual zoom every ~120ms, so during
    // the Explore dive the clouds are reliably gone before street level
    // and the night polygon never darkens the landing frame, no matter
    // how the flyTo easing moves through those altitudes.
    map.on('style.load', () => addAtmosphere(map));
    const atmosphereTicker = window.setInterval(() => {
      const m = mapRef.current;
      if (!m) return;
      let zoom = SHOWCASE_ZOOM;
      try {
        zoom = m.getZoom();
      } catch (err) {
        return;
      }
      const clouds = 1 - Math.min(1, Math.max(0, (zoom - CLOUD_FADE_START_ZOOM) / (CLOUD_FADE_END_ZOOM - CLOUD_FADE_START_ZOOM)));
      const night = 1 - Math.min(1, Math.max(0, (zoom - 2.2) / 3.2));
      const twinkle = 1 + CITY_TWINKLE_AMP * Math.sin(Date.now() / 260);
      setAtmosphere(m, { night, clouds, twinkle });
    }, 120);

    // Pulsing marker that travels with the featured destination.
    const markerEl = document.createElement('div');
    markerEl.className = 'landing-pulse-marker';
    markerEl.innerHTML = '<span class="ring"></span><span class="core"></span><span class="marker-label">BALI</span>';
    const marker = new mapboxgl.Marker({ element: markerEl })
      .setLngLat([DESTS[0].lng, DESTS[0].lat])
      .addTo(map);

    // Opening spin: hand-rolled rAF jumpTo loop (one lap, quintic ease-out
    // — max velocity on frame one, decelerating to a stop on Bali).
    // Anchored to the first rendered frame so slow devices still get the
    // full spin, and cancelled instantly if the visitor dives or skips.
    let spinRafId = null;
    const runOpeningSpin = () => {
      let startTime = null;
      const tick = (now) => {
        if (divingRef.current || completedRef.current) return;
        if (startTime === null) startTime = now;
        const t = Math.min((now - startTime) / OPEN_SPIN_MS, 1);
        const spinT = 1 - (1 - t) ** 5;
        try {
          map.jumpTo({
            center: [DESTS[0].lng - OPEN_SPIN_DELTA * (1 - spinT), DESTS[0].lat],
            zoom: SHOWCASE_ZOOM,
            pitch: 0,
            bearing: 0,
          });
        } catch (err) {
          return; // map torn down mid-spin
        }
        if (t < 1) spinRafId = requestAnimationFrame(tick);
      };
      spinRafId = requestAnimationFrame(tick);
    };
    runOpeningSpin();

    const goToDest = (i) => {
      const d = DESTS[i];
      marker.setLngLat([d.lng, d.lat]);
      const label = markerEl.querySelector('.marker-label');
      if (label) label.textContent = d.name.split(',')[0];
      try {
        map.easeTo({
          center: [d.lng, d.lat],
          zoom: SHOWCASE_ZOOM,
          duration: TRAVEL_MS,
          easing: (t) => 1 - Math.pow(1 - t, 3),
        });
      } catch (err) {
        // map may be mid-teardown
      }
      const el = chipTextRef.current;
      if (el) {
        el.classList.add('swap');
        window.setTimeout(() => {
          el.textContent = coordStr(d);
          el.classList.remove('swap');
        }, 450);
      }
    };

    if (WORLD_TOUR) {
      cycleRef.current = window.setInterval(() => {
        if (divingRef.current || document.hidden) return;
        const root = rootRef.current;
        // Pause the world tour while the visitor is reading the story below.
        if (root && root.scrollTop > window.innerHeight * 0.6) return;
        destIdxRef.current = (destIdxRef.current + 1) % DESTS.length;
        goToDest(destIdxRef.current);
      }, CYCLE_MS);
    } else {
      // Bali-first: no cycling — reference goToDest so the tour machinery
      // stays warm for when WORLD_TOUR flips back on.
      void goToDest;
    }

    // Keep the canvas honest through URL-bar settling / rotation (the same
    // mobile sizing issue the old intro fixed — see GlobeIntro history).
    const forceResize = () => {
      try {
        map.resize();
      } catch (err) {
        // ignore
      }
    };
    const resizeTimeouts = [50, 250, 600].map((ms) => window.setTimeout(forceResize, ms));
    const resizeObserver = new ResizeObserver(forceResize);
    resizeObserver.observe(container);
    window.addEventListener('orientationchange', forceResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', forceResize);

    return () => {
      completedRef.current = true;
      if (spinRafId) cancelAnimationFrame(spinRafId);
      clearInterval(atmosphereTicker);
      if (cycleRef.current) clearInterval(cycleRef.current);
      resizeTimeouts.forEach((id) => clearTimeout(id));
      resizeObserver.disconnect();
      window.removeEventListener('orientationchange', forceResize);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', forceResize);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----- scroll engine: progress bar + verdict scene scrub + reveals ----- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const stampIn = (el, p, angle) => {
      if (!el) return;
      const e = easeOut(p);
      el.style.opacity = p <= 0 ? 0 : Math.min(1, p * 2.2);
      el.style.transform = `rotate(${angle}deg) scale(${3.2 - e * 2.2})`;
    };
    const shock = (el, p) => {
      if (!el) return;
      if (p <= 0 || p >= 1) {
        el.style.opacity = 0;
        return;
      }
      el.style.opacity = (1 - p) * 0.8;
      el.style.transform = `scale(${1 + p * 60})`;
    };

    const onScroll = () => {
      const sy = root.scrollTop;
      const max = root.scrollHeight - root.clientHeight;
      if (progressRef.current) progressRef.current.style.width = `${max > 0 ? (sy / max) * 100 : 0}%`;

      const scene = sceneRef.current;
      if (!scene) return;
      const rect = scene.getBoundingClientRect();
      const total = scene.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const p = clamp01(-rect.top / total);

      contourRefs.current.forEach((path, i) => {
        if (path) path.style.strokeDashoffset = 2000 * (1 - phase(p, 0, 0.25 + i * 0.05));
      });

      const cardA = cardARef.current;
      const cardB = cardBRef.current;
      const stampStay = stampStayRef.current;
      const stampNay = stampNayRef.current;

      const a1 = phase(p, 0.02, 0.18);
      if (cardA) {
        cardA.style.opacity = a1;
        cardA.style.transform = `translateY(${(1 - easeOut(a1)) * 120}px) rotate(${-3 + easeOut(a1) * 3}deg)`;
      }
      stampIn(stampStay, phase(p, 0.2, 0.3), -10);
      shock(shockARef.current, phase(p, 0.28, 0.4));
      const exit1 = phase(p, 0.42, 0.52);
      if (exit1 > 0) {
        if (cardA) {
          cardA.style.opacity = 1 - exit1;
          cardA.style.transform = `translateY(${-easeOut(exit1) * 160}px) rotate(${-easeOut(exit1) * 6}deg)`;
        }
        if (stampStay) {
          stampStay.style.opacity = Math.max(0, 1 - exit1 * 1.6);
          stampStay.style.transform = `rotate(-10deg) scale(1) translateY(${-easeOut(exit1) * 140}px)`;
        }
      }

      const a3 = phase(p, 0.5, 0.64);
      if (cardB) {
        cardB.style.opacity = a3;
        cardB.style.transform = `translateY(${(1 - easeOut(a3)) * 120}px) rotate(${3 - easeOut(a3) * 3}deg)`;
      }
      stampIn(stampNay, phase(p, 0.66, 0.76), 8);
      shock(shockBRef.current, phase(p, 0.74, 0.86));
      const exit2 = phase(p, 0.9, 1);
      if (exit2 > 0) {
        if (cardB) cardB.style.opacity = 1 - exit2;
        if (stampNay) stampNay.style.opacity = Math.max(0, 1 - exit2 * 1.6);
      }
    };

    root.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add('inview');
          io.unobserve(en.target);
        });
      },
      { root, threshold: 0.2 },
    );
    root.querySelectorAll('.landing-reveal, .landing-step').forEach((el) => io.observe(el));

    return () => {
      root.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, []);

  /* ----- checks marquee ----- */
  useEffect(() => {
    const mq = rootRef.current && rootRef.current.querySelector('.landing-marquee');
    if (!mq) return undefined;
    let x = 0;
    let rafId = null;
    const loop = () => {
      x -= 0.55;
      const w = mq.scrollWidth / 3;
      if (w > 0 && -x >= w) x += w;
      mq.style.transform = `translateX(${x}px)`;
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  /* ----- the dive: orbit → Explore map camera, then fade to the real app ----- */
  const dive = () => {
    if (divingRef.current) return;
    divingRef.current = true;
    setDiving(true);
    if (cycleRef.current) clearInterval(cycleRef.current);
    const root = rootRef.current;
    if (root) root.scrollTo({ top: 0, behavior: 'auto' });

    const map = mapRef.current;
    if (!map) {
      setFading(true);
      window.setTimeout(finish, FADE_MS);
      return;
    }
    let done = false;
    const handoff = () => {
      if (done) return;
      done = true;
      setFading(true);
      window.setTimeout(finish, FADE_MS);
    };
    // Two-beat "3D swim": dive from orbit into a tilted, banked swoop over
    // the island (pitch 58°, bearing swung to -24°), then a slower settle
    // that levels the camera out onto the EXACT shot the live Explore map
    // opens with (BALI / EXPLORE_ZOOM / pitch 0 / bearing 0) — so the
    // fade-out still reveals a perfectly camera-matched real map.
    const SWOOP_MS = 3400;
    const SETTLE_MS = 1900;
    try {
      map.flyTo({
        center: [BALI.lon, BALI.lat],
        zoom: EXPLORE_ZOOM - 1.1,
        pitch: 58,
        bearing: -24,
        duration: SWOOP_MS,
        curve: 1.35,
        essential: true,
      });
      map.once('moveend', () => {
        if (done) return;
        try {
          map.easeTo({
            center: [BALI.lon, BALI.lat],
            zoom: EXPLORE_ZOOM,
            pitch: 0,
            bearing: 0,
            duration: SETTLE_MS,
            easing: (t) => t * t * (3 - 2 * t), // zero-velocity landing
            essential: true,
          });
          map.once('moveend', handoff);
        } catch (err) {
          handoff();
        }
      });
      // Backstop: if a moveend never fires (tab hidden, teardown race),
      // hand off anyway rather than strand the visitor on a frozen globe.
      window.setTimeout(handoff, SWOOP_MS + SETTLE_MS + 1500);
    } catch (err) {
      handoff();
    }
  };

  const skip = (path) => {
    if (divingRef.current) return;
    divingRef.current = true;
    const map = mapRef.current;
    try {
      if (map) map.jumpTo({ center: [BALI.lon, BALI.lat], zoom: EXPLORE_ZOOM, pitch: 0, bearing: 0 });
    } catch (err) {
      // tearing down anyway
    }
    // Deep entrances ("Sign in" → /you) route BEFORE the fade reveals the
    // app, so the destination screen is what the fade lands on.
    if (typeof path === 'string') navigate(path);
    setFading(true);
    window.setTimeout(finish, FADE_MS);
  };

  const scrollToStory = () => {
    const scene = sceneRef.current;
    if (scene) scene.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div ref={rootRef} className={`landing${fading ? ' fading' : ''}`}>
      <div className="landing-progress"><span ref={progressRef} /></div>

      {/* HERO */}
      <header ref={heroRef} className={`landing-hero${diving ? ' diving' : ''}`}>
        <div ref={globeRef} className="landing-globe" />
        <div className="landing-vignette" />

        <div className="landing-bar">
          <div className="landing-wordmark"><span className="pin" />StayOrNay</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="landing-skip" onClick={() => skip('/you')}>Sign in</button>
            <button type="button" className="landing-skip" onClick={() => skip()}>Skip</button>
          </div>
        </div>

        <div className="landing-hero-content">
          <div className="landing-kicker">Independent villa verdicts · Worldwide</div>
          <h1 className="landing-h1">
            <span className="word w-stay"><span>Stay</span></span>{' '}
            <span className="word w-or"><span>or</span></span>{' '}
            <span className="word w-nay"><span>Nay?</span></span>
          </h1>
          <p className="landing-sub">Honest verdicts from real stays — so you book with a good feeling.</p>
          <div className="landing-chip">
            <span className="dot" />
            <span ref={chipTextRef} className="dest-text">{coordStr(DESTS[0])}</span>
          </div>
          <div className="landing-ctas">
            <button type="button" className="landing-btn landing-btn-primary" onClick={dive}>Explore Bali</button>
            <button type="button" className="landing-btn landing-btn-ghost" onClick={scrollToStory}>How it works</button>
          </div>
        </div>

        <div className="landing-scrollhint"><span>Scroll</span><span className="line" /></div>
      </header>

      {/* VERDICT SCENE */}
      <section ref={sceneRef} className="landing-verdict-scene">
        <div className="landing-verdict-sticky">
          <svg className="landing-contours" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
            <path ref={(el) => { contourRefs.current[0] = el; }} d="M-50,650 C200,560 340,700 560,620 C780,540 900,660 1250,560" />
            <path ref={(el) => { contourRefs.current[1] = el; }} d="M-50,540 C240,460 380,600 600,510 C820,430 960,560 1250,450" />
            <path ref={(el) => { contourRefs.current[2] = el; }} d="M-50,430 C260,360 420,490 640,410 C860,330 1000,450 1250,350" />
            <path ref={(el) => { contourRefs.current[3] = el; }} d="M-50,320 C280,260 460,380 680,300 C900,230 1040,340 1250,250" />
          </svg>
          <div className="landing-verdict-heading">
            <div className="landing-mono-tag">The verdict system</div>
            <h2>One stay. One verdict.</h2>
          </div>

          <div ref={cardARef} className="landing-vcard">
            <div className="photo landing-photo-a"><span className="coord-stamp">-8.6478° S · 115.1385° E · BALI</span></div>
            <h3>Villa Cahaya, Canggu</h3>
            <div className="meta">EXAMPLE VERDICT · 3 NIGHTS · VERIFIED STAY</div>
            <p>“The photos undersold it. Private pool actually private, and the sunrise over the rice fields — unreal.”</p>
            <span className="verified">✓ Verified stayer</span>
          </div>
          <div ref={stampStayRef} className="landing-stamp stay">STAY</div>

          <div ref={cardBRef} className="landing-vcard">
            <div className="photo landing-photo-b"><span className="coord-stamp">36.3932° N · 25.4615° E · SANTORINI</span></div>
            <h3>Villa Thera View, Santorini</h3>
            <div className="meta">EXAMPLE VERDICT · 4 NIGHTS · VERIFIED STAY</div>
            <p>“‘Caldera view’ — if you lean off the roof. Cruise-ship crowds outside the gate by 9am.”</p>
            <span className="verified nay">✓ Verified stayer</span>
          </div>
          <div ref={stampNayRef} className="landing-stamp nay">NAY</div>
          <div ref={shockARef} className="landing-shockwave" />
          <div ref={shockBRef} className="landing-shockwave nay" />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="landing-how">
        <div className="landing-section-head landing-reveal">
          <div className="landing-mono-tag">How it works</div>
          <h2>Truth, in three steps.</h2>
        </div>
        <div className="landing-steps">
          <article className="landing-step">
            <span className="num">01</span>
            <h3>Someone really stays</h3>
            <p>Every review starts with a verified stay — a real person, a real booking, real receipts. No drive-by opinions.</p>
          </article>
          <article className="landing-step">
            <span className="num">02</span>
            <h3>We check the claims</h3>
            <p>Photos vs reality, noise, wifi, the “private” pool — the things listings exaggerate are exactly what we verify.</p>
          </article>
          <article className="landing-step">
            <span className="num">03</span>
            <h3>One honest verdict</h3>
            <p>Stay or Nay. That's it. Then you book wherever you like — with a good feeling in your stomach.</p>
          </article>
        </div>
      </section>

      {/* TRUST BAND */}
      <section className="landing-trust">
        <div className="landing-trust-grid">
          <div className="cell landing-reveal"><div className="big accent">0</div><div className="label">Bookings taken. Ever.</div></div>
          <div className="cell landing-reveal"><div className="big accent">0</div><div className="label">Paid placements</div></div>
          <div className="cell landing-reveal"><div className="big">100%</div><div className="label">Verified stays</div></div>
        </div>
        <p className="promise landing-reveal">We never sell villas. <b>We only tell the truth about them.</b></p>
      </section>

      {/* CHECKS MARQUEE */}
      <section className="landing-marquee-section">
        <div className="landing-marquee">
          {[...CHECKS, ...CHECKS, ...CHECKS].map(([kind, label], i) => (
            <span key={i} className="landing-check">
              <span className={`mark ${kind}`}>{kind === 's' ? '✓' : '✕'}</span>
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="landing-final">
        <h2 className="landing-reveal">Book anywhere.<br />With a <em>good feeling.</em></h2>
        <p className="landing-reveal">Check the verdict first — on any villa, anywhere in the world.</p>
        <button type="button" className="landing-btn landing-btn-dark landing-btn-big landing-reveal" onClick={dive}>
          Explore Bali →
        </button>
      </section>

      <footer className="landing-footer">StayOrNay · Independent villa verdicts, worldwide</footer>
    </div>
  );
}
