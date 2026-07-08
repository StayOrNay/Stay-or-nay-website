// In-browser media compression.
//
// Why this exists: the site runs on Supabase's Free plan, where the Storage
// upload limit is a hard 50 MB per file (a platform cap — see
// https://supabase.com/docs/guides/storage/uploads/file-limits). Real review
// videos (a 5-minute walkthrough) are routinely 150-500 MB, so they'd be
// rejected with "The object exceeded the maximum allowed size".
//
// Instead of paying for Pro, we shrink oversized videos right in the
// visitor's browser BEFORE they ever reach Supabase, targeting a size
// comfortably under the cap. Photos are downscaled the same way on the rare
// chance one is over the limit. Anything already small is passed through
// untouched, so small uploads stay instant.
//
// The heavy lifting is done by ffmpeg.wasm, loaded on demand from a CDN the
// first time a big file actually needs compressing (nothing is added to the
// app bundle, and visitors who only upload small files never download it).
// We use the SINGLE-THREADED core on purpose: the multi-threaded build needs
// COOP/COEP cross-origin-isolation headers, which this static Cloudflare
// Pages deploy doesn't set. Single-thread is slower but works everywhere.

// The hard ceiling is 50 MB (Supabase Free plan). Goal: preserve as much
// quality as possible and only shrink a file when it's actually over the
// limit — then spend nearly the whole 50 MB budget so the result is as sharp
// as it can be while still fitting. Anything already under the target is
// uploaded at full original quality, untouched.
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
// Safe margin below the hard cap so container overhead never pushes us over.
const TARGET_BYTES = 47 * 1024 * 1024;

// Pinned CDN URLs. ffmpeg/util come as ESM from esm.sh; the wasm core is the
// UMD single-thread build from unpkg. Versions are matched pairs.
const FFMPEG_ESM = 'https://esm.sh/@ffmpeg/ffmpeg@0.12.10';
const UTIL_ESM = 'https://esm.sh/@ffmpeg/util@0.12.1';
const CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

let ffmpegPromise = null;
let utilPromise = null;

function loadUtil() {
  if (!utilPromise) utilPromise = import(/* @vite-ignore */ UTIL_ESM);
  return utilPromise;
}

// Lazily construct and load a single shared ffmpeg instance.
async function getFfmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import(/* @vite-ignore */ FFMPEG_ESM),
        loadUtil(),
      ]);
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

export function isVideoFile(file) {
  return (file.type || '').startsWith('video/');
}
export function isImageFile(file) {
  return (file.type || '').startsWith('image/');
}

// Read a video's duration (seconds) without decoding it fully.
function readVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : null);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the video — it may be an unsupported format.'));
    };
    v.src = url;
  });
}

function swapExt(name, ext) {
  const dot = name.lastIndexOf('.');
  return (dot > 0 ? name.slice(0, dot) : name) + '.' + ext;
}

/**
 * Compress a single video to land under the upload cap. Returns the original
 * File untouched if it's already small enough.
 *
 * @param {File} file
 * @param {(fraction:number)=>void} [onProgress] 0..1 progress for this file
 */
export async function compressVideoIfNeeded(file, onProgress) {
  if (file.size <= TARGET_BYTES) return file;

  const ffmpeg = await getFfmpeg();
  const { fetchFile } = await loadUtil();

  const duration = await readVideoDuration(file);
  // Budget: spend nearly the whole target size on this clip. Total bits we can
  // afford (with a little headroom), minus the audio track, spread across the
  // duration — that's the highest video bitrate that still fits under 50 MB.
  const audioBps = 128_000;
  let videoKbps;
  if (duration) {
    const totalBits = TARGET_BYTES * 8 * 0.94;
    const videoBps = Math.max(500_000, Math.floor(totalBits / duration) - audioBps);
    videoKbps = Math.round(videoBps / 1000);
  } else {
    videoKbps = 2500;
  }

  // Pick the largest sensible resolution the available bitrate can support —
  // pushing 1080p at a low bitrate looks worse (blocky) than a crisp 720p, so
  // match the frame size to the budget. Never upscale (min with source width).
  const maxDim = videoKbps >= 3500 ? 1920 : videoKbps >= 1500 ? 1280 : 960;

  const progressHandler = ({ progress }) => {
    if (onProgress && Number.isFinite(progress)) {
      onProgress(Math.min(1, Math.max(0, progress)));
    }
  };
  ffmpeg.on('progress', progressHandler);

  const inName = 'in_' + Math.random().toString(36).slice(2);
  const outName = 'out_' + Math.random().toString(36).slice(2) + '.mp4';
  try {
    await ffmpeg.writeFile(inName, await fetchFile(file));
    await ffmpeg.exec([
      '-i', inName,
      // Cap the long edge at maxDim; keep aspect ratio, force even dims.
      '-vf', `scale='min(${maxDim},iw)':-2`,
      '-c:v', 'libx264',
      // 'fast' compresses more efficiently than 'veryfast' — better quality at
      // the same size — for a modest extra encode time.
      '-preset', 'fast',
      '-b:v', `${videoKbps}k`,
      '-maxrate', `${Math.round(videoKbps * 1.15)}k`,
      '-bufsize', `${videoKbps * 2}k`,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outName,
    ]);
    const data = await ffmpeg.readFile(outName);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    // If, against expectations, it's still over the cap, hand back the smaller
    // of the two so the caller can surface a clear error rather than a
    // mysterious Supabase rejection.
    const out = new File([blob], swapExt(file.name, 'mp4'), { type: 'video/mp4' });
    return out.size < file.size ? out : file;
  } finally {
    ffmpeg.off('progress', progressHandler);
    try { await ffmpeg.deleteFile(inName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outName); } catch { /* ignore */ }
  }
}

/**
 * Downscale/re-encode an oversized image to a JPEG under the cap. Most photos
 * (even large drone JPGs) are already well under 50 MB, so this usually
 * passes the file straight through.
 */
export async function compressImageIfNeeded(file) {
  if (file.size <= TARGET_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const maxDim = 2560;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85)
  );
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], swapExt(file.name, 'jpg'), { type: 'image/jpeg' });
}

/**
 * Run the whole selected media set through compression, reporting overall
 * progress. Videos that need it are transcoded; everything else is passed
 * through. Returns the compressed File list (same order as input) plus a flag
 * for whether anything actually got compressed.
 *
 * @param {File[]} files
 * @param {(info:{index:number,total:number,name:string,phase:string,fraction:number})=>void} [onProgress]
 */
export async function prepareMediaForUpload(files, onProgress) {
  const out = [];
  let changed = false;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const report = (phase, fraction) =>
      onProgress?.({ index: i, total: files.length, name: file.name, phase, fraction });

    let result = file;
    if (isVideoFile(file) && file.size > TARGET_BYTES) {
      report('compressing', 0);
      result = await compressVideoIfNeeded(file, (f) => report('compressing', f));
      report('compressing', 1);
    } else if (isImageFile(file) && file.size > TARGET_BYTES) {
      report('compressing', 0);
      result = await compressImageIfNeeded(file);
      report('compressing', 1);
    }
    if (result !== file) changed = true;
    out.push(result);
  }
  return { files: out, changed };
}
