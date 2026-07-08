import * as THREE from 'three';

/**
 * Earth surface material: blends day/night textures based on a world-space
 * sun direction, and overlays a drifting cloud layer baked into the same
 * fragment pass (cheaper than a second sphere + keeps cloud shadowing simple).
 */
export function createEarthMaterial({ dayTex, nightTex, cloudTex }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTex },
      nightTexture: { value: nightTex },
      cloudTexture: { value: cloudTex },
      sunDirection: { value: new THREE.Vector3(0.85, 0.25, 0.45).normalize() },
      cloudOffset: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalW;
      void main() {
        vUv = uv;
        vNormalW = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D dayTexture;
      uniform sampler2D nightTexture;
      uniform sampler2D cloudTexture;
      uniform vec3 sunDirection;
      uniform float cloudOffset;
      varying vec2 vUv;
      varying vec3 vNormalW;

      void main() {
        float light = dot(normalize(vNormalW), normalize(sunDirection));
        float mixAmt = smoothstep(-0.25, 0.25, light);

        vec3 dayColor = texture2D(dayTexture, vUv).rgb;
        vec3 nightColor = texture2D(nightTexture, vUv).rgb;
        vec3 surface = mix(nightColor, dayColor, mixAmt);

        vec2 cloudUv = vUv + vec2(cloudOffset, 0.0);
        vec4 clouds = texture2D(cloudTexture, cloudUv);
        float cloudLight = mix(0.16, 1.0, mixAmt);
        surface = mix(surface, vec3(1.0) * cloudLight, clouds.a * 0.8);

        float terminatorGlow = smoothstep(0.12, -0.05, abs(light)) * 0.18;
        surface += vec3(1.0, 0.66, 0.32) * terminatorGlow * (1.0 - mixAmt * 0.5);

        gl_FragColor = vec4(surface, 1.0);
      }
    `,
  });
}

/** Thin glowing shell around the globe, fresnel-style, additive + backside. */
export function createAtmosphereMaterial(colorHex = '#3B8FD9') {
  return new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(colorHex) },
      intensity: { value: 1 },
    },
    vertexShader: `
      varying vec3 vNormalW;
      void main() {
        vNormalW = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float intensity;
      varying vec3 vNormalW;
      void main() {
        float rim = pow(0.68 - dot(vNormalW, vec3(0.0, 0.0, 1.0)), 3.0);
        gl_FragColor = vec4(glowColor, clamp(rim, 0.0, 1.0) * intensity);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

/** Sparse starfield points scattered on a large shell behind the globe. */
export function createStarfield(count = 900, radius = 14) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = radius * (0.65 + Math.random() * 0.35);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xe9ece7,
    size: 0.045,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}
