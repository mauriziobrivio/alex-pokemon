// Music manager (Phase 9) — warm, looping background beds that DUCK under Dada's
// voice (audio-first is LAW). Original-style only — never Nintendo's tracks. One
// bed at a time; cross-fades on context change; ref-counted ducking via a hook
// in audio.js; a mute + volume setting (gentle-low default, beneath the voice).
//
// Tracks live in audio/music/<bed>.mp3 and drop in by filename like the voice —
// a missing track simply fails its fetch and the bed stays silent (app fine).
// Shares audio.js's single iOS-unlocked AudioContext (no second context).

import { getContext, setDuckHook } from './audio.js';

const url = (file) => `audio/music/${file}.mp3`;

// zoneId → bed key (the 10 zones). A real track drops in by filename, no code change.
const ZONE_BED = {
  meadow: 'sunny', beach: 'sunny', forest: 'cozy', grove: 'cozy',
  snowfield: 'cool', cave: 'cool', volcano: 'warm', desert: 'warm',
  ocean: 'aquatic', mountain: 'airy',
};
export const bedForZone = (zoneId) => ZONE_BED[zoneId] || 'home';

const BASE = 0.32;        // music sits well below voice (master 1.0)
const DUCK_LEVEL = 0.16;  // dip deeply while Dada speaks
const DUCK_T = 0.18;      // fast dip — low before his first syllable
const RESTORE_T = 0.5;    // gentle swell back
const FADE = 0.9;         // cross-fade time

let ctx = null, musicMaster = null, duckGain = null;
let cur = null;           // { key, source, gain } — source/gain null for an absent/silent bed
let settingsVol = 0.5, muted = false, unlocked = false, duckDepth = 0;
const bufCache = new Map(); // url -> AudioBuffer | null (null = known-absent; don't refetch)

function ramp(param, target, t) {
  try {
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(target, now + t);
  } catch (_) { try { param.value = target; } catch (__) {} }
}
function applyMaster() { if (musicMaster) musicMaster.gain.value = muted ? 0 : settingsVol * BASE; }

function ensureGraph() {
  if (musicMaster) return true;
  ctx = getContext();
  if (!ctx) return false;            // no WebAudio → music simply off
  musicMaster = ctx.createGain();
  duckGain = ctx.createGain();
  duckGain.gain.value = 1;
  applyMaster();
  duckGain.connect(musicMaster).connect(ctx.destination);
  return true;
}

async function loadBuffer(u) {
  if (bufCache.has(u)) return bufCache.get(u);
  try {
    const res = await fetch(u);
    if (!res.ok) throw new Error(String(res.status));
    const buf = await ctx.decodeAudioData(await res.arrayBuffer());
    bufCache.set(u, buf);
    return buf;
  } catch (_) {
    bufCache.set(u, null);           // absent / undecodable → remember, stay silent
    return null;
  }
}

export function setVolume(v) { settingsVol = Math.max(0, Math.min(1, v)); applyMaster(); }
export function setMuted(m) { muted = !!m; applyMaster(); }
export const isMusicMuted = () => muted;
export const current = () => (cur ? cur.key : null);

// Called from main.js enter(), inside the first user gesture (iOS unlock).
export function unlock() {
  if (unlocked) return;
  unlocked = true;
  if (!ensureGraph()) return;
  setDuckHook({ start: duckStart, end: duckEnd });
}
function duckStart() { duckDepth += 1; if (duckGain) ramp(duckGain.gain, DUCK_LEVEL, DUCK_T); }
function duckEnd() { duckDepth = Math.max(0, duckDepth - 1); if (duckDepth === 0 && duckGain) ramp(duckGain.gain, 1, RESTORE_T); }

export function playForZone(zoneId) { play(bedForZone(zoneId)); }

export async function play(key) {
  if (!unlocked || !ensureGraph()) return;
  if (cur && cur.key === key) return;  // already on this bed — don't restart (no loop pop)

  if (cur && cur.gain && cur.source) { // fade the outgoing bed out, then stop it
    const out = cur;
    ramp(out.gain.gain, 0, FADE);
    setTimeout(() => { try { out.source.stop(); } catch (_) {} }, (FADE + 0.1) * 1000);
  }
  cur = { key, source: null, gain: null }; // claim the slot synchronously so concurrent calls dedupe
  const claimed = cur;

  const buf = await loadBuffer(url(key));
  if (claimed !== cur) return;          // a newer play() superseded us mid-load
  if (!buf) return;                     // absent track → silent bed (slot kept so we don't refetch)

  const gain = ctx.createGain();
  gain.gain.value = 0;
  const source = ctx.createBufferSource();
  source.buffer = buf;
  source.loop = true;
  source.connect(gain).connect(duckGain);
  source.start(0);
  ramp(gain.gain, 1, FADE);
  cur.source = source;
  cur.gain = gain;
}

export function stop() {
  if (cur && cur.gain && cur.source) {
    const out = cur;
    ramp(out.gain.gain, 0, FADE);
    setTimeout(() => { try { out.source.stop(); } catch (_) {} }, (FADE + 0.1) * 1000);
  }
  cur = null;
}
