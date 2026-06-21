// Audio engine (Phase 0 spine, extended for the game).
//
// URL-based: callers pass a resolved URL (voices.js for speech, sfx.js for SFX).
// Web Audio with a master gain (volume/mute), an <audio> fallback, and the iOS
// unlock kept intact — resume() inside the first gesture, recovery from the
// iOS-only 'interrupted' state on every play and on return-to-foreground.

let ctx = null;
let master = null;
let voiceGain = null;        // Dada's voice — sits a notch ABOVE SFX so a spoken prompt always reads
let sfxGain = null;          // the juice — a notch below voice
let unlocked = false;
let useWebAudio = true;
let volume = 1;
let muted = false;

// Voice rides clearly above the sound effects (brief 023, item 1a). Clips are
// loudness-normalized to a consistent target, so this relative balance holds
// across all of them; music ducks under voice separately (music.js).
const VOICE_GAIN = 1.0;
const SFX_GAIN = 0.6;        // ≈ -4.4 dB under the voice
let duckHook = null;         // { start, end } registered by music.js — engine stays music-agnostic
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
      // Voice + SFX get their own gains under the master (volume/mute still gate both),
      // so Dada's voice sits clearly above the effects.
      voiceGain = ctx.createGain(); voiceGain.gain.value = VOICE_GAIN; voiceGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = SFX_GAIN; sfxGain.connect(master);
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

function startBuffer(c, buf, node) {
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(node || master || c.destination);
  src.start(0);
  return src;
}

// Music routing (music.js) shares this one iOS-unlocked AudioContext, and registers
// a duck hook so the bed dips under Dada's voice. SFX never duck (too brief).
export function getContext() { return getCtx(); }
export function setDuckHook(h) { duckHook = h; }
const isVoiceUrl = (url) => typeof url === 'string' && !url.includes('/sfx/');
function duckFor(url, durationSec) {
  if (!duckHook || !isVoiceUrl(url)) return;
  duckHook.start();
  setTimeout(() => duckHook && duckHook.end(), (Math.max(0, durationSec) + 0.15) * 1000);
}

// All VOICE playback shares ONE current-voice source — the queue (play) AND the
// exclusive channel (playExclusive, used for counting + the pack reveal). Any new
// voice stops the one currently sounding before it starts, so two of Dada's lines
// can NEVER overlap (audio-first), no matter which path queued them. SFX never
// participate (no /sfx/ url is a "voice") so they still layer freely under speech.
let currentVoiceSrc = null;
function stopCurrentVoice() { if (currentVoiceSrc) { try { currentVoiceSrc.stop(); } catch (_) {} currentVoiceSrc = null; } }

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
        const voice = isVoiceUrl(url);
        if (voice) stopCurrentVoice();       // a queued voice line replaces any voice still sounding
        const src = startBuffer(c, buf, voice ? voiceGain : sfxGain);
        if (voice) { currentVoiceSrc = src; src.onended = () => { if (currentVoiceSrc === src) currentVoiceSrc = null; }; }
        duckFor(url, buf.duration);
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

// Play on the shared voice channel, replacing whatever voice is sounding: rapid
// counts ("one… two… three…") and pack-reveal names replace rather than overlap,
// and — because it's the SAME currentVoiceSrc the queue uses — a queued line and
// an exclusive line can never sound together either. Returns the clip duration.
export function playExclusive(url) {
  if (useWebAudio) {
    const c = getCtx();
    if (c) {
      const go = async () => {
        let buf = buffers.get(url);
        if (buf === undefined) buf = await preload(url);
        if (!buf) { playFallback(url); return 0; }
        stopCurrentVoice();
        const src = c.createBufferSource();
        src.buffer = buf;
        src.connect(voiceGain || master || c.destination); // playExclusive is always voice (counts, pack names)
        src.onended = () => { if (currentVoiceSrc === src) currentVoiceSrc = null; };
        src.start(0);
        currentVoiceSrc = src;
        duckFor(url, buf.duration);
        return buf.duration;
      };
      if (c.state !== 'running') return c.resume().then(go, () => { playFallback(url); return 0; });
      return go();
    }
  }
  playFallback(url);
  return Promise.resolve(0);
}

// ---- The single VOICE queue (audio-first: two voice lines NEVER overlap) ----
// Every spoken line goes through here: each waits for the previous to finish +
// a calm beat, so Dada is never talking over himself. SFX (play) stay immediate
// and parallel; counting (playExclusive) deliberately replaces. clearVoice()
// drops anything pending (called on scene change) so voice can't bleed forward.
const vq = [];          // { url, gap, resolve }
let vBusy = false;
let vGen = 0;
export function clearVoice() { vGen += 1; vq.splice(0).forEach((it) => it.resolve(0)); }
export function speak(url, after = 0.6) {
  return new Promise((resolve) => { vq.push({ url, gap: after, resolve }); pumpVoice(); });
}
export function speakSequence(urls, between = 0.12, after = 0.6) {
  if (!urls || !urls.length) return Promise.resolve(0);
  let last = Promise.resolve(0);
  urls.forEach((u, i) => { const isLast = i === urls.length - 1; last = new Promise((resolve) => vq.push({ url: u, gap: isLast ? after : between, resolve })); });
  pumpVoice();
  return last;
}
async function pumpVoice() {
  if (vBusy) return;
  vBusy = true;
  const myGen = vGen;
  while (vq.length && myGen === vGen) {
    const it = vq.shift();
    const dur = (await play(it.url)) || 0;
    if (myGen !== vGen) { it.resolve(dur); break; }
    if (dur > 0 || it.gap > 0) await new Promise((r) => setTimeout(r, (dur + it.gap) * 1000));
    it.resolve(dur);
  }
  vBusy = false;
  // If clearVoice() bumped the generation mid-loop while a next-scene line was
  // already queued, the loop exits on the stale gen — re-pump so that newer line
  // isn't stranded (voice would otherwise go silent until the next scene change).
  if (vq.length) pumpVoice();
}

// Back-compat: existing callers' voice sequences route through the one queue.
export function playSequence(urls, gap = 0.12) { return speakSequence(urls, gap, 0.6); }

let currentVoiceEl = null;
function playFallback(url) {
  let el = elements.get(url);
  if (!el) { el = new Audio(url); elements.set(url, el); }
  el.muted = muted;
  el.volume = Math.max(0, Math.min(1, volume * (isVoiceUrl(url) ? VOICE_GAIN : SFX_GAIN))); // mirror the voice-over-SFX balance
  if (isVoiceUrl(url)) { // mirror the WebAudio voice mutex on the <audio> fallback path
    if (currentVoiceEl && currentVoiceEl !== el) { try { currentVoiceEl.pause(); } catch (_) {} }
    currentVoiceEl = el;
  }
  try {
    el.currentTime = 0;
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
    if (duckHook && isVoiceUrl(url)) {
      let ended = false;
      const done = () => { if (ended) return; ended = true; if (duckHook) duckHook.end(); };
      duckHook.start();
      el.addEventListener('ended', done, { once: true });
      el.addEventListener('pause', done, { once: true });
      setTimeout(done, 4000); // safety — never leave the bed ducked
    }
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

// Inert test hook — the live gain split (voice sits above SFX). No side effects.
export function __gains() {
  getCtx();
  return { voice: voiceGain ? voiceGain.gain.value : null, sfx: sfxGain ? sfxGain.gain.value : null, master: master ? master.gain.value : null };
}
