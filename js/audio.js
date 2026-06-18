// Audio engine (Phase 0 spine, extended for the game).
//
// URL-based: callers pass a resolved URL (voices.js for speech, sfx.js for SFX).
// Web Audio with a master gain (volume/mute), an <audio> fallback, and the iOS
// unlock kept intact — resume() inside the first gesture, recovery from the
// iOS-only 'interrupted' state on every play and on return-to-foreground.

let ctx = null;
let master = null;
let unlocked = false;
let useWebAudio = true;
let volume = 1;
let muted = false;
const buffers = new Map();   // url -> AudioBuffer
const pending = new Map();   // url -> Promise<AudioBuffer|null>
const elements = new Map();  // url -> HTMLAudioElement (fallback)

function getCtx() {
  if (!ctx && useWebAudio) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);
    } else {
      useWebAudio = false;
    }
  }
  return ctx;
}

function resumeIfNeeded() {
  if (!useWebAudio || !ctx) return;
  if (ctx.state !== 'running' && typeof ctx.resume === 'function') {
    ctx.resume().catch(() => {});
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resumeIfNeeded(); });
}

function decode(audioCtx, data) {
  try {
    const p = audioCtx.decodeAudioData(data);
    if (p && typeof p.then === 'function') return p;
  } catch (_) {}
  return new Promise((resolve, reject) => audioCtx.decodeAudioData(data, resolve, reject));
}

// Fetch + decode a clip ahead of time. Safe before any gesture. Never throws.
export function preload(url) {
  if (!useWebAudio) {
    if (!elements.has(url)) { const el = new Audio(url); el.preload = 'auto'; elements.set(url, el); }
    return Promise.resolve(null);
  }
  const c = getCtx();
  if (!c) return Promise.resolve(null);
  if (buffers.has(url)) return Promise.resolve(buffers.get(url));
  if (pending.has(url)) return pending.get(url);
  const job = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      const buf = await decode(c, await res.arrayBuffer());
      buffers.set(url, buf);
      return buf;
    } catch (_) {
      return null; // missing clip (e.g. not yet recorded) — silently skip
    } finally {
      pending.delete(url);
    }
  })();
  pending.set(url, job);
  return job;
}

export function preloadAll(urls) { return Promise.all(urls.map(preload)); }

// MUST be called synchronously inside a user-gesture handler (the first tap).
export function unlock() {
  if (unlocked) return;
  unlocked = true;
  getCtx();
  resumeIfNeeded();
}

function startBuffer(c, buf) {
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(master || c.destination);
  src.start(0);
  return src;
}

// Play one clip by URL. Returns a promise that resolves when it (roughly) ends,
// so callers can chain. Resolves immediately-ish for missing clips.
export function play(url) {
  if (useWebAudio) {
    const c = getCtx();
    if (c) {
      const go = async () => {
        let buf = buffers.get(url);
        if (buf === undefined) buf = await preload(url);
        if (!buf) { playFallback(url); return 0; }
        startBuffer(c, buf);
        return buf.duration;
      };
      if (c.state !== 'running') {
        return c.resume().then(go, () => { playFallback(url); return 0; });
      }
      return go();
    }
  }
  playFallback(url);
  return Promise.resolve(0);
}

// Play on a single "voice channel": stop the previous exclusive clip before
// starting the next, so rapid counts ("one… two… three…") replace rather than
// overlap. Returns the clip duration.
let exclusiveSrc = null;
export function playExclusive(url) {
  if (useWebAudio) {
    const c = getCtx();
    if (c) {
      const go = async () => {
        let buf = buffers.get(url);
        if (buf === undefined) buf = await preload(url);
        if (!buf) { playFallback(url); return 0; }
        if (exclusiveSrc) { try { exclusiveSrc.stop(); } catch (_) {} }
        const src = c.createBufferSource();
        src.buffer = buf;
        src.connect(master || c.destination);
        src.onended = () => { if (exclusiveSrc === src) exclusiveSrc = null; };
        src.start(0);
        exclusiveSrc = src;
        return buf.duration;
      };
      if (c.state !== 'running') return c.resume().then(go, () => { playFallback(url); return 0; });
      return go();
    }
  }
  playFallback(url);
  return Promise.resolve(0);
}

// Play clips back-to-back with a small gap (e.g. cheer → Pokémon name).
export async function playSequence(urls, gap = 0.12) {
  for (const url of urls) {
    const dur = (await play(url)) || 0;
    if (dur > 0) await new Promise((r) => setTimeout(r, (dur + gap) * 1000));
  }
}

function playFallback(url) {
  let el = elements.get(url);
  if (!el) { el = new Audio(url); elements.set(url, el); }
  el.muted = muted;
  el.volume = volume;
  try {
    el.currentTime = 0;
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
  } catch (_) {}
}

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = muted ? 0 : volume;
}
export function setMuted(m) {
  muted = !!m;
  if (master) master.gain.value = muted ? 0 : volume;
}
export const isMuted = () => muted;
