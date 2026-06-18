// Offline cache (Phase 1).
//
// Strategy: stale-while-revalidate. The core shell, scene art, and the gameplay
// audio are precached on install (tolerant — one missing file won't abort the
// rest). Everything else (the 151 Pokémon-name clips, and sprites where present)
// is cached at runtime on first use, so the game becomes fully offline as Alex
// plays. Bump CACHE when any precached file changes.

const CACHE = 'dada-academy-v5';

const CORE = [
  './', './index.html', './manifest.json', './css/styles.css',
  './js/main.js', './js/audio.js', './js/voices.js', './js/sfx.js',
  './js/data.js', './js/storage.js', './js/game.js', './js/mastery.js',
  './js/tenframe.js', './js/ui.js', './js/fx.js', './js/roster.generated.js',
  './js/evolve.js',
  './js/scenes/starter.js', './js/scenes/home.js', './js/scenes/worldmap.js',
  './js/scenes/catch.js', './js/scenes/pokedex.js', './js/scenes/train.js',
  './assets/screens/screen-title.png', './assets/screens/bg-lab.png',
  './assets/screens/screen-worldmap.png', './assets/screens/scene-starter-select.png',
  './assets/screens/bg-evolution.png',
  './assets/backgrounds/bg-meadow.png', './assets/backgrounds/bg-forest.png',
  './assets/backgrounds/bg-beach.png', './assets/backgrounds/bg-mountain.png',
  './assets/characters/dada/dada-greeting.png', './assets/characters/dada/dada-cheering.png',
  './assets/characters/mama/mama-greeting.png',
  './assets/characters/alex/alex-ready.png', './assets/characters/alex/alex-throwing.png',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  './audio/sfx/pop.mp3', './audio/sfx/soft.mp3', './audio/sfx/wobble.mp3',
  './audio/sfx/whoosh.mp3', './audio/sfx/catch.mp3', './audio/sfx/sparkle.mp3',
  './audio/dada/greeting.mp3', './audio/dada/home-welcome.mp3',
  './audio/dada/starter-intro.mp3', './audio/dada/great-choice.mp3',
];
for (let n = 1; n <= 20; n++) CORE.push(`./audio/dada/number-${n}.mp3`, `./audio/dada/prompt-${n}.mp3`, `./audio/dada/reprompt-${n}.mp3`);
for (let i = 1; i <= 4; i++) CORE.push(`./audio/dada/praise-${i}.mp3`);
for (let i = 1; i <= 3; i++) CORE.push(`./audio/dada/catch-cheer-${i}.mp3`);
for (const z of ['meadow', 'forest', 'beach', 'mountain']) CORE.push(`./audio/dada/zone-${z}.mp3`, `./audio/dada/suggest-${z}.mp3`);
// Starter-trio names (Pikachu 25, Charmander 4, Bulbasaur 1) — heard first, so
// precache them; the other 148 name clips warm into cache at runtime (SWR).
for (const id of [25, 4, 1]) CORE.push(`./audio/dada/name-${id}.mp3`);
// Phase 2: phonemes + Train/evolution lines (gameplay audio).
for (const ch of ['s', 'a', 't', 'i', 'p', 'n', 'c', 'k', 'e', 'h', 'r', 'm', 'd', 'g', 'o', 'u', 'l', 'f', 'b']) CORE.push(`./audio/dada/phoneme-${ch}.mp3`);
for (const f of ['which-one-says', 'lets-build', 'you-taught', 'pick-buddy', 'feed-berries', 'is-evolving', 'evolve-cheer']) CORE.push(`./audio/dada/${f}.mp3`);
// Starter evolution lines' sprites (1-6, 25-26) so the first evolutions show offline.
for (const id of [1, 2, 3, 4, 5, 6, 25, 26]) CORE.push(`./sprites/${id}.png`);
// build-a-word whole-word clips (the blend climax) — small; precache all 72.
// (Other sprites + the 151 name clips warm into cache at runtime via main.js.)
const WORDS = ['sat', 'tap', 'pin', 'nap', 'pat', 'tip', 'sit', 'tin', 'pit', 'pan', 'tan', 'sap',
  'cat', 'hat', 'mat', 'rat', 'hen', 'men', 'ten', 'pen', 'net', 'can', 'man', 'ran',
  'mad', 'sad', 'had', 'dad', 'cap', 'map', 'ram', 'ham', 'kit', 'kid', 'red', 'set',
  'dog', 'log', 'fog', 'big', 'dig', 'pig', 'sun', 'fun', 'run', 'bun', 'bug', 'hug',
  'mug', 'rug', 'bed', 'leg', 'lip', 'hot', 'pot', 'top', 'mop', 'hop', 'cup', 'cut',
  'bat', 'bad', 'bag', 'fan', 'fin', 'gap', 'lab', 'lad', 'nut', 'tub', 'bin', 'fit'];
for (const w of WORDS) CORE.push(`./audio/dada/word-${w}.mp3`);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const results = await Promise.allSettled(CORE.map((url) => cache.add(url)));
    const missed = results.map((r, i) => (r.status === 'rejected' ? CORE[i] : null)).filter(Boolean);
    if (missed.length) console.warn('[sw] precache misses (offline may be partial):', missed.length, missed.slice(0, 5));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);

    const networkFetch = fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
        return res;
      })
      .catch(() => null);

    if (cached) { event.waitUntil(networkFetch); return cached; }

    const fresh = await networkFetch;
    if (fresh) return fresh;

    if (req.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return new Response('', { status: 504, statusText: 'Offline' });
  })());
});
