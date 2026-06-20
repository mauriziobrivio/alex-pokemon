// Entry point: audio unlock on the splash, a tiny scene router with a lifecycle,
// and SW registration.
//
// Scene lifecycle: each navigation bumps an epoch. Scenes receive a ctx with
// ctx.after(ms, fn) (a setTimeout that no-ops if the scene is no longer current)
// and ctx.alive() — so deferred audio/timers never bleed into the next scene.

import * as audio from './audio.js';
import * as music from './music.js';
import { clip } from './voices.js';
import { SFX_URLS } from './sfx.js';
import { ROSTER, CVC_WORDS } from './data.js';
import { getStarterId, getSettings } from './game.js';
import { renderStarter } from './scenes/starter.js';
import { renderStory } from './scenes/story.js';
import { renderHome } from './scenes/home.js';
import { renderWorldmap } from './scenes/worldmap.js';
import { renderCatch } from './scenes/catch.js';
import { renderPokedex } from './scenes/pokedex.js';
import { renderTrain } from './scenes/train.js';
import { renderBattle } from './scenes/battle.js';
import { renderGames } from './scenes/games/index.js';
import { renderSubitize } from './scenes/games/subitize.js';
import { renderWhatNext } from './scenes/games/whatnext.js';
import { renderSoundMatch } from './scenes/games/soundmatch.js';
import { renderMyWords } from './scenes/games/mywords.js';

const app = document.getElementById('app');
const scenes = {
  starter: renderStarter, story: renderStory, home: renderHome, worldmap: renderWorldmap, catch: renderCatch,
  pokedex: renderPokedex, train: renderTrain, battle: renderBattle,
  games: renderGames, 'game-subitize': renderSubitize, 'game-whatnext': renderWhatNext, 'game-soundmatch': renderSoundMatch,
  'game-mywords': renderMyWords,
};

let epoch = 0;

function go(name, params = {}) {
  const render = scenes[name];
  if (!render) return;
  const myEpoch = ++epoch; // anything from the previous scene is now stale
  audio.clearVoice();      // drop the leaving scene's pending voice so it can't bleed forward
  const ctx = {
    go,
    alive: () => myEpoch === epoch,
    after: (ms, fn) => setTimeout(() => { if (myEpoch === epoch) fn(); }, ms),
  };
  const node = render(params, ctx);
  node.classList.add('scene');
  // Cross-fade out the current scene; drop any already-leaving scene from a
  // faster-than-fade navigation immediately, so scenes never stack or leak.
  [...app.children].forEach((child) => {
    if (child.classList.contains('scene-leave')) child.remove();
    else { child.classList.add('scene-leave'); setTimeout(() => child.remove(), 320); }
  });
  app.append(node);
  node.classList.add('scene-enter');
  requestAnimationFrame(() => node.classList.add('scene-enter-active'));
}

function boot() {
  const s = getSettings();
  audio.setVolume(typeof s.volume === 'number' ? s.volume : 1);
  audio.setMuted(!!s.muted);
  music.setVolume(typeof s.music === 'number' ? s.music : 0.5);
  music.setMuted(!!s.musicMuted);

  audio.preloadAll([clip.greeting(), ...SFX_URLS]).catch(() => {});

  const splash = document.getElementById('splash');
  let entered = false;
  const enter = () => {
    if (entered) return;
    entered = true;
    audio.unlock();
    music.unlock(); // in-gesture: build the music graph + register the duck hook (iOS unlock)
    // The Story journey is the new front door; first-timers choose a starter first.
    const landing = getStarterId() ? 'story' : 'starter';
    go(landing);                                  // clears the (empty) queue
    if (landing === 'starter') audio.speak(clip.greeting()); // Story owns its own warm welcome
    warmCache(); // populate the SW cache so names/words/sprites work offline later
  };
  splash.addEventListener('pointerup', enter);
  splash.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); enter(); }
  });
}

// Background warm-fetch (gentle concurrency) of long-tail assets the SW doesn't
// precache: all 251 name clips, the 72 word clips, and the Gen-1 sprites. On
// first online launch this fills the SW cache so names, the build-a-word blend,
// and Gen-1 art work offline. The ~100 Gen-2 sprites are deliberately NOT
// bulk-warmed (~34 MB) — they lazily runtime-cache on first encounter, keeping
// the offline budget in check (brief 008). Cached items hit no network.
function warmCache() {
  setTimeout(() => {
    const urls = [
      ...ROSTER.map((p) => clip.name(p.id)),
      ...CVC_WORDS.map((w) => clip.word(w)),
      ...ROSTER.filter((p) => p.id <= 151).map((p) => p.sprite),
    ];
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
