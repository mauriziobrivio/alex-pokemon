// Entry point: audio unlock on the splash, a tiny scene router with a lifecycle,
// and SW registration.
//
// Scene lifecycle: each navigation bumps an epoch. Scenes receive a ctx with
// ctx.after(ms, fn) (a setTimeout that no-ops if the scene is no longer current)
// and ctx.alive() — so deferred audio/timers never bleed into the next scene.

import { clear } from './ui.js';
import * as audio from './audio.js';
import { clip } from './voices.js';
import { SFX_URLS } from './sfx.js';
import { ROSTER } from './data.js';
import { getStarterId, getSettings } from './game.js';
import { renderStarter } from './scenes/starter.js';
import { renderHome } from './scenes/home.js';
import { renderWorldmap } from './scenes/worldmap.js';
import { renderCatch } from './scenes/catch.js';
import { renderPokedex } from './scenes/pokedex.js';

const app = document.getElementById('app');
const scenes = { starter: renderStarter, home: renderHome, worldmap: renderWorldmap, catch: renderCatch, pokedex: renderPokedex };

let epoch = 0;

function go(name, params = {}) {
  const render = scenes[name];
  if (!render) return;
  const myEpoch = ++epoch; // anything from the previous scene is now stale
  const ctx = {
    go,
    alive: () => myEpoch === epoch,
    after: (ms, fn) => setTimeout(() => { if (myEpoch === epoch) fn(); }, ms),
  };
  const node = render(params, ctx);
  node.classList.add('scene');
  clear(app);
  app.append(node);
  node.classList.add('scene-enter');
  requestAnimationFrame(() => node.classList.add('scene-enter-active'));
}

function boot() {
  const s = getSettings();
  audio.setVolume(typeof s.volume === 'number' ? s.volume : 1);
  audio.setMuted(!!s.muted);

  audio.preloadAll([clip.greeting(), ...SFX_URLS]).catch(() => {});

  const splash = document.getElementById('splash');
  let entered = false;
  const enter = () => {
    if (entered) return;
    entered = true;
    audio.unlock();
    audio.play(clip.greeting());
    go(getStarterId() ? 'home' : 'starter');
    warmNameClips(); // populate the SW cache so names work offline later
  };
  splash.addEventListener('pointerup', enter);
  splash.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); enter(); }
  });
}

// Background warm-fetch of the 151 name clips (gentle concurrency). On first
// online launch this fills the service-worker cache so names play offline later.
function warmNameClips() {
  setTimeout(() => {
    const urls = ROSTER.map((p) => clip.name(p.id));
    let i = 0;
    const pump = () => { if (i >= urls.length) return; const u = urls[i++]; fetch(u).catch(() => {}).finally(pump); };
    for (let k = 0; k < 4; k++) pump();
  }, 3500);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch((err) => console.warn('[sw] registration failed', err));
  });
}
