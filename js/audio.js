// Audio engine.
//
// Uses the Web Audio API (the reliable iOS path: create a context, decode the
// clip ahead of time, then resume() inside the first user gesture). Falls back
// to an <audio> element if Web Audio is unavailable so playback is rock-solid.
//
// iOS Safari blocks all audio until the first user gesture. It also has an
// iOS-only context state, 'interrupted', entered after a phone call, Siri,
// Control Center sounds, or a lock/unlock. We recover from ANY non-running
// state on every tap (a tap is a user gesture, the only guaranteed way back),
// and opportunistically on return-to-foreground — so sound never dies silently.

import { clipUrl } from './voices.js';

let ctx = null;
let unlocked = false;
let useWebAudio = true;
const buffers = new Map();   // url -> AudioBuffer
const elements = new Map();  // url -> HTMLAudioElement (fallback)

function getCtx() {
  if (!ctx && useWebAudio) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      ctx = new AC();
    } else {
      useWebAudio = false;
    }
  }
  return ctx;
}

// Resume the context if it is in any non-running state ('suspended' or the
// iOS-only 'interrupted'). Safe to call repeatedly; no-op when already running.
function resumeIfNeeded() {
  if (!useWebAudio || !ctx) return;
  if (ctx.state !== 'running' && typeof ctx.resume === 'function') {
    ctx.resume().catch(() => { /* will retry on the next tap */ });
  }
}

// When the app comes back to the foreground (after lock/unlock or app-switch),
// try to revive an interrupted context. A subsequent tap guarantees recovery.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resumeIfNeeded();
  });
}

// Safari historically needed the callback form of decodeAudioData; modern
// Safari returns a promise. Support both.
function decode(audioCtx, data) {
  try {
    const p = audioCtx.decodeAudioData(data);
    if (p && typeof p.then === 'function') return p;
  } catch (_) { /* fall through to callback form */ }
  return new Promise((resolve, reject) => audioCtx.decodeAudioData(data, resolve, reject));
}

// Fetch + decode a clip ahead of time so the first tap plays instantly.
// Safe to call before any user gesture (decoding works on a suspended context).
export async function preload(name) {
  const url = clipUrl(name);

  if (useWebAudio) {
    const c = getCtx();
    if (c) {
      if (buffers.has(url)) return;
      try {
        const res = await fetch(url);
        const data = await res.arrayBuffer();
        buffers.set(url, await decode(c, data));
        return;
      } catch (err) {
        console.warn('[audio] Web Audio preload failed; using <audio> fallback.', err);
        useWebAudio = false;
      }
    }
  }

  if (!elements.has(url)) {
    const el = new Audio(url);
    el.preload = 'auto';
    elements.set(url, el);
  }
}

// Unlock iOS audio. MUST be called synchronously inside a user-gesture handler.
export function unlock() {
  if (unlocked) return;
  unlocked = true;
  getCtx();
  resumeIfNeeded();
}

// Play a clip by logical name. Recovers a suspended/interrupted context first,
// then plays (scheduling the source only once the context is actually running).
export function play(name) {
  const url = clipUrl(name);

  if (useWebAudio) {
    const c = getCtx();
    if (c) {
      const startBuffered = () => {
        const buf = buffers.get(url);
        if (!buf) return false;
        const src = c.createBufferSource();
        src.buffer = buf;
        src.connect(c.destination);
        src.start(0);
        return true;
      };
      const playNow = () => {
        if (startBuffered()) return;
        // Not decoded yet: load on demand, then play (context already running).
        preload(name).then(() => { if (!startBuffered()) playFallback(url); });
      };

      // resume() must run synchronously inside the gesture; start once running.
      if (c.state !== 'running') {
        c.resume().then(playNow, () => playFallback(url));
      } else {
        playNow();
      }
      return;
    }
  }

  playFallback(url);
}

function playFallback(url) {
  let el = elements.get(url);
  if (!el) { el = new Audio(url); elements.set(url, el); }
  try {
    el.currentTime = 0;
    const p = el.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => console.warn('[audio] playback blocked', err));
    }
  } catch (err) {
    console.warn('[audio] playback failed', err);
  }
}
