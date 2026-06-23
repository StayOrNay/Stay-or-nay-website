import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildEarthTextures } from './textures';
import { createEarthMaterial, createAtmosphereMaterial, createStarfield } from './materials';
import {
  BALI,
  lonLatToVector3,
  rotateY,
  angleToFaceCameraZ,
  easeInOutCubic,
  clamp01,
  lerp,
  formatCoord,
} from './geo';

// --- Timeline (seconds) ----------------------------------------------------
const PHASE_A_END = 2.2; // fast establishing spin, day/night sweeps as it turns
const PHASE_B_END = 5.0; // ease the spin down + zoom in toward Bali
const PHASE_C_END = 6.4; // final close zoom, light settles, copy fades in
const FADE_MS = 650;

const DIST_FAR = 3.4;
const DIST_MID = 1.75;
const DIST_NEAR = 1.16;
const SPIN_SPEED = 1.45; // rad/s during phase A

/**
 * Cinematic "spinning globe" splash: stylized 3D Earth (procedural textures,
 * no binary assets) spins with a visible day/night terminator, drifting
 * clouds, then eases into a close-up landing on Bali before handing off to
 * the app. Respects prefers-reduced-motion and is always skippable.
 */
export function EarthIntro({ onComplete }) {
  const containerRef = useRef(null);
  const skipRef = useRef(false);
  const completedRef = useRef(false);
  const [showOverlayText, setShowOverlayText] = useState(false);
  const [fading, setFading] = useState(false);

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

    let width = container.clientWidth || 1;
    let height = container.clientHeight || 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 100);
    camera.position.set(0, 0, DIST_FAR);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x0c1714, 1);
    container.appendChild(renderer.domElement);

    const stars = createStarfield();
    scene.add(stars);

    const { dayTex, nightTex, cloudTex } = buildEarthTextures();
    const earthMaterial = createEarthMaterial({ dayTex, nightTex, cloudTex });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), earthMaterial);
    scene.add(globe);

    const atmosphereMaterial = createAtmosphereMaterial('#3B8FD9');
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.04, 64, 64), atmosphereMaterial);
    scene.add(atmosphere);

    const baliDir = lonLatToVector3(BALI.lon, BALI.lat, 1);
    const targetAngle = angleToFaceCameraZ(baliDir);
    const initialSpinAt = SPIN_SPEED * PHASE_A_END;
    const forwardDelta =
      (((targetAngle - initialSpinAt) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const rotationAtPhaseBEnd = initialSpinAt + Math.PI * 2 + forwardDelta;

    const finalBaliWorld = rotateY(baliDir, rotationAtPhaseBEnd);
    const finalSunDir = new THREE.Vector3(
      finalBaliWorld[0] + 0.55,
      finalBaliWorld[1] + 0.22,
      finalBaliWorld[2] + 0.35,
    ).normalize();
    const initialSunDir = earthMaterial.uniforms.sunDirection.value.clone();

    const handleResize = () => {
      width = container.clientWidth || 1;
      height = container.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let raf = null;
    let fadeTimeoutId = null;
    let overlayShown = false;
    let fadeStarted = false;
    let cloudOffset = 0;
    const start = performance.now();

    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const t = skipRef.current ? PHASE_C_END + 10 : elapsed;

      cloudOffset += 0.00018;
      earthMaterial.uniforms.cloudOffset.value = cloudOffset;

      let rotY;
      let dist;

      if (t < PHASE_A_END) {
        rotY = SPIN_SPEED * t;
        dist = DIST_FAR;
      } else if (t < PHASE_B_END) {
        const localT = easeInOutCubic(clamp01((t - PHASE_A_END) / (PHASE_B_END - PHASE_A_END)));
        rotY = lerp(initialSpinAt, rotationAtPhaseBEnd, localT);
        dist = lerp(DIST_FAR, DIST_MID, localT);
      } else if (t < PHASE_C_END) {
        const localT = easeInOutCubic(clamp01((t - PHASE_B_END) / (PHASE_C_END - PHASE_B_END)));
        rotY = rotationAtPhaseBEnd;
        dist = lerp(DIST_MID, DIST_NEAR, localT);
        earthMaterial.uniforms.sunDirection.value
          .copy(initialSunDir)
          .lerp(finalSunDir, localT)
          .normalize();
        atmosphereMaterial.uniforms.intensity.value = lerp(1, 1.6, localT);
        if (!overlayShown && localT > 0.22) {
          overlayShown = true;
          setShowOverlayText(true);
        }
      } else {
        rotY = rotationAtPhaseBEnd;
        dist = DIST_NEAR;
        if (!fadeStarted) {
          fadeStarted = true;
          setFading(true);
          fadeTimeoutId = window.setTimeout(finish, FADE_MS);
        }
      }

      globe.rotation.y = rotY;
      atmosphere.rotation.y = rotY;
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      stars.rotation.y += 0.00025;

      renderer.render(scene, camera);

      if (!completedRef.current) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);

    return () => {
      completedRef.current = true;
      if (raf) cancelAnimationFrame(raf);
      if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
      resizeObserver.disconnect();
      renderer.dispose();
      dayTex.dispose();
      nightTex.dispose();
      cloudTex.dispose();
      earthMaterial.dispose();
      atmosphereMaterial.dispose();
      globe.geometry.dispose();
      atmosphere.geometry.dispose();
      stars.geometry.dispose();
      stars.material.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSkip = () => {
    skipRef.current = true;
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0C1714', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

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
            opacity: showOverlayText ? 1 : 0,
            transform: showOverlayText ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 700ms var(--ease-out), transform 700ms var(--ease-out)',
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
            }}
          >
            <span style={{ color: 'var(--paper-050)' }}>Stay</span>
            <span style={{ color: 'var(--ink-400)' }}>Or</span>
            <span style={{ color: 'var(--nay-400)' }}>Nay</span>
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-300)', marginTop: 4 }}>
            Honest villa reviews, from 10,000 feet
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
