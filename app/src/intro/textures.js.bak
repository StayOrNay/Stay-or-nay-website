import * as THREE from 'three';
import { BALI, toRad, angularDistanceRad } from './geo';

// Texture resolution — kept modest so per-pixel generation stays fast on mobile
// and the globe still reads crisp at the app's mobile-first screen size.
const TW = 512;
const TH = 256;

const LAND_THRESHOLD = 0.55;

const baliLonRad = toRad(BALI.lon);
const baliLatRad = toRad(BALI.lat);

// Brand palette (see styles/tokens/colors.css) — reused here so the procedurally
// generated globe reads as part of the same "cartographic" design language.
const OCEAN_SHALLOW = [42, 119, 196]; // --sky-600
const OCEAN_DEEP = [10, 35, 58]; // darker satellite-blue
const LAND_LOW = [26, 160, 107]; // --stay-500
const LAND_HIGH = [14, 106, 71]; // --stay-700
const ICE = [251, 248, 241]; // --paper-050
const CITY_WARM = [247, 197, 110]; // --sun-300 ish

function landField(lonRad, latRad) {
  let v = 0;
  v += Math.sin(lonRad * 1.0 + 0.3) * Math.cos(latRad * 2.1 + 1.1);
  v += 0.6 * Math.sin(lonRad * 2.3 + 2.0) * Math.cos(latRad * 1.7 - 0.4);
  v += 0.4 * Math.sin(lonRad * 4.1 - 1.0) * Math.cos(latRad * 3.3 + 2.7);
  v += 0.3 * Math.sin(lonRad * 7.0 + 1.5) * Math.cos(latRad * 5.2 - 1.3);
  v += 0.2 * Math.sin(lonRad * 11.0 - 2.2) * Math.cos(latRad * 8.0 + 0.6);
  return v;
}

function cloudField(lonRad, latRad) {
  let v = 0;
  v += Math.sin(lonRad * 1.7 - 0.6) * Math.cos(latRad * 2.6 + 0.2);
  v += 0.7 * Math.sin(lonRad * 3.4 + 1.3) * Math.cos(latRad * 4.0 - 1.8);
  v += 0.5 * Math.sin(lonRad * 6.1 - 2.5) * Math.cos(latRad * 6.7 + 1.0);
  v += 0.3 * Math.sin(lonRad * 12.0 + 0.4) * Math.cos(latRad * 10.0 - 0.9);
  return v;
}

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Builds three procedural equirectangular textures purely with canvas pixel math
 * — no binary image assets, so the single-file build stays self-contained:
 *  - day:   stylized brand-colored landmasses/oceans + polar ice
 *  - night: emissive "city lights" map, brightest over the Bali island bump
 *  - the day texture's alpha channel doubles as the cloud mask is NOT used here;
 *    clouds are returned as a separate texture with a transparent background.
 */
export function buildEarthTextures() {
  const dayCanvas = document.createElement('canvas');
  dayCanvas.width = TW;
  dayCanvas.height = TH;
  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = TW;
  nightCanvas.height = TH;
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = TW;
  cloudCanvas.height = TH;

  const dctx = dayCanvas.getContext('2d');
  const nctx = nightCanvas.getContext('2d');
  const cctx = cloudCanvas.getContext('2d');

  const dImg = dctx.createImageData(TW, TH);
  const nImg = nctx.createImageData(TW, TH);
  const cImg = cctx.createImageData(TW, TH);

  for (let y = 0; y < TH; y++) {
    const lat = 90 - (y / (TH - 1)) * 180;
    const latRad = toRad(lat);
    for (let x = 0; x < TW; x++) {
      const lon = (x / (TW - 1)) * 360 - 180;
      const lonRad = toRad(lon);
      const idx = (y * TW + x) * 4;

      let v = landField(lonRad, latRad);
      const dBali = angularDistanceRad(lonRad, latRad, baliLonRad, baliLatRad);
      const baliBump = Math.exp(-(dBali * dBali) / (2 * 0.025 * 0.025));
      v += baliBump * 3.0;

      const isLand = v > LAND_THRESHOLD;
      const poleAmt = Math.max(0, (Math.abs(lat) - 70) / 20);

      if (isLand) {
        const t = Math.min(1, (v - LAND_THRESHOLD) / 1.4);
        let r = LAND_LOW[0] + (LAND_HIGH[0] - LAND_LOW[0]) * t;
        let g = LAND_LOW[1] + (LAND_HIGH[1] - LAND_LOW[1]) * t;
        let b = LAND_LOW[2] + (LAND_HIGH[2] - LAND_LOW[2]) * t;
        if (poleAmt > 0) {
          r += (ICE[0] - r) * poleAmt;
          g += (ICE[1] - g) * poleAmt;
          b += (ICE[2] - b) * poleAmt;
        }
        dImg.data[idx] = r;
        dImg.data[idx + 1] = g;
        dImg.data[idx + 2] = b;
        dImg.data[idx + 3] = 255;

        const cityRoll = hash(x * 0.31, y * 0.71);
        const nearBali = baliBump > 0.15;
        const lightChance = nearBali ? 0.6 : 0.045;
        if (cityRoll < lightChance) {
          const bright = nearBali ? 1 : 0.55 + 0.45 * hash(x * 1.7, y * 0.9);
          nImg.data[idx] = CITY_WARM[0] * bright;
          nImg.data[idx + 1] = CITY_WARM[1] * bright;
          nImg.data[idx + 2] = CITY_WARM[2] * bright * 0.7;
          nImg.data[idx + 3] = 255 * Math.max(0.55, bright);
        } else {
          nImg.data[idx] = 4;
          nImg.data[idx + 1] = 7;
          nImg.data[idx + 2] = 6;
          nImg.data[idx + 3] = 255;
        }
      } else {
        const depth = Math.min(1, Math.max(0, (LAND_THRESHOLD - v) / 1.6));
        dImg.data[idx] = OCEAN_SHALLOW[0] + (OCEAN_DEEP[0] - OCEAN_SHALLOW[0]) * depth;
        dImg.data[idx + 1] = OCEAN_SHALLOW[1] + (OCEAN_DEEP[1] - OCEAN_SHALLOW[1]) * depth;
        dImg.data[idx + 2] = OCEAN_SHALLOW[2] + (OCEAN_DEEP[2] - OCEAN_SHALLOW[2]) * depth;
        dImg.data[idx + 3] = 255;

        nImg.data[idx] = 2;
        nImg.data[idx + 1] = 4;
        nImg.data[idx + 2] = 9;
        nImg.data[idx + 3] = 255;
      }

      const cv = cloudField(lonRad, latRad);
      const cn = (cv + 2.4) / 4.8;
      const alpha = cn > 0.55 ? Math.min(1, (cn - 0.55) / 0.25) : 0;
      cImg.data[idx] = 255;
      cImg.data[idx + 1] = 255;
      cImg.data[idx + 2] = 255;
      cImg.data[idx + 3] = Math.round(alpha * 235);
    }
  }

  dctx.putImageData(dImg, 0, 0);
  nctx.putImageData(nImg, 0, 0);
  cctx.putImageData(cImg, 0, 0);

  const dayTex = new THREE.CanvasTexture(dayCanvas);
  const nightTex = new THREE.CanvasTexture(nightCanvas);
  const cloudTex = new THREE.CanvasTexture(cloudCanvas);
  [dayTex, nightTex, cloudTex].forEach((tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
  });

  return { dayTex, nightTex, cloudTex };
}
