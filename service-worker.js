// Offline cache (Phase 1).
//
// Strategy: stale-while-revalidate. The core shell, scene art, and the gameplay
// audio are precached on install (tolerant — one missing file won't abort the
// rest). Everything else (the 151 Pokémon-name clips, and sprites where present)
// is cached at runtime on first use, so the game becomes fully offline as Alex
// plays. Bump CACHE when any precached file changes.

const CACHE = 'dada-academy-v21';

const CORE = [
  './', './index.html', './manifest.json', './css/styles.css',
  './js/main.js', './js/audio.js', './js/voices.js', './js/sfx.js',
  './js/data.js', './js/storage.js', './js/game.js', './js/mastery.js',
  './js/tenframe.js', './js/ui.js', './js/fx.js', './js/roster.generated.js',
  './js/evolve.js', './js/battle.js', './js/quests.js', './js/cards.js', './js/music.js', './js/typeicon.js', './js/story.js', './js/attention.js',
  './js/scenes/starter.js', './js/scenes/story.js', './js/scenes/home.js', './js/scenes/worldmap.js',
  './js/scenes/catch.js', './js/scenes/pokedex.js', './js/scenes/train.js', './js/scenes/battle.js',
  './js/scenes/games/index.js', './js/scenes/games/_common.js',
  './js/scenes/games/subitize.js', './js/scenes/games/whatnext.js', './js/scenes/games/soundmatch.js', './js/scenes/games/mywords.js',
  './assets/screens/screen-title.png', './assets/screens/bg-lab.png',
  './assets/screens/screen-worldmap.png', './assets/screens/scene-starter-select.png',
  './assets/screens/bg-evolution.png',
  './assets/backgrounds/bg-meadow.png', './assets/backgrounds/bg-forest.png',
  './assets/backgrounds/bg-beach.png', './assets/backgrounds/bg-mountain.png',
  './assets/backgrounds/bg-desert.png', './assets/backgrounds/bg-volcano.png',
  './assets/backgrounds/bg-snowfield.png', './assets/backgrounds/bg-grove.png', './assets/backgrounds/bg-cave.png',
  './assets/backgrounds/bg-ocean.png',
  './assets/ui/card-frame.png', './assets/ui/card-back.png', './assets/ui/pack.png', './assets/ui/foil.png',
  './assets/characters/dada/dada-greeting.png', './assets/characters/dada/dada-cheering.png',
  './assets/characters/mama/mama-greeting.png', './assets/characters/mama/mama-cheering.png',
  './assets/characters/alex/alex-ready.png', './assets/characters/alex/alex-throwing.png',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  './audio/sfx/pop.mp3', './audio/sfx/soft.mp3', './audio/sfx/wobble.mp3',
  './audio/sfx/whoosh.mp3', './audio/sfx/catch.mp3', './audio/sfx/sparkle.mp3',
  './audio/music/home.mp3', // the home bed (other zone beds runtime-cache on first visit)
  './audio/dada/greeting.mp3', './audio/dada/home-welcome.mp3',
  './audio/dada/starter-intro.mp3', './audio/dada/great-choice.mp3',
];
for (let n = 1; n <= 20; n++) CORE.push(`./audio/dada/number-${n}.mp3`, `./audio/dada/prompt-${n}.mp3`, `./audio/dada/reprompt-${n}.mp3`);
for (let i = 1; i <= 4; i++) CORE.push(`./audio/dada/praise-${i}.mp3`);
for (let i = 1; i <= 3; i++) CORE.push(`./audio/dada/catch-cheer-${i}.mp3`);
for (const z of ['meadow', 'forest', 'beach', 'mountain', 'desert', 'volcano', 'snowfield', 'grove', 'cave', 'ocean']) CORE.push(`./audio/dada/zone-${z}.mp3`, `./audio/dada/suggest-${z}.mp3`);
// Starter-trio names (Pikachu 25, Charmander 4, Bulbasaur 1) — heard first, so
// precache them; the other 148 name clips warm into cache at runtime (SWR).
for (const id of [25, 4, 1]) CORE.push(`./audio/dada/name-${id}.mp3`);
// Phase 2: phonemes + Train/evolution lines (gameplay audio).
for (const ch of ['s', 'a', 't', 'i', 'p', 'n', 'c', 'k', 'e', 'h', 'r', 'm', 'd', 'g', 'o', 'u', 'l', 'f', 'b']) CORE.push(`./audio/dada/phoneme-${ch}.mp3`);
for (const f of ['which-one-says', 'lets-build', 'you-taught', 'pick-buddy', 'feed-berries', 'is-evolving', 'evolve-cheer']) CORE.push(`./audio/dada/${f}.mp3`);
// Phase 3: Battle lines.
for (const f of ['battle-start', 'hit-bigger', 'hit-smaller', 'charge-up', 'your-move', 'you-win', 'fainted']) CORE.push(`./audio/dada/${f}.mp3`);
// Phase 4: quest lines.
for (const f of ['quest-catch', 'quest-evolve']) CORE.push(`./audio/dada/${f}.mp3`);
// Phase 5: Catch-deeper lines (gentle escape + outing soft-stop). The ~100 new
// Gen-2 name clips warm into cache at runtime like the other names (not precached).
for (const f of ['escape', 'outing-end']) CORE.push(`./audio/dada/${f}.mp3`);
// Phase 6: collection lines (pack reveal + discovery milestones) — small, precache.
for (const f of ['reveal-foil', 'peek', 'milestone-10', 'milestone-25', 'milestone-50', 'milestone-100', 'milestone-150', 'milestone-200', 'milestone-all']) CORE.push(`./audio/dada/${f}.mp3`);
// Phase 8: counting + Play & Learn prompt lines (small; precache for offline parity).
for (const f of ['thats-enough', 'playlearn-intro', 'game-quick-count', 'game-what-next', 'game-sound-match', 'how-many', 'what-comes-after', 'put-in-order', 'which-start-same', 'which-rhyme']) CORE.push(`./audio/dada/${f}.mp3`);
// Phase 9: the "My Words" review-wall intro line.
CORE.push('./audio/dada/my-words.mp3');
// Phase 10: Story Mode narration (Mama-suggest reuses the suggest-* lines).
for (const f of ['story-intro', 'feather-found', 'story-more', 'story-finale']) CORE.push(`./audio/dada/${f}.mp3`);
CORE.push('./sprites/250.png'); // Ho-Oh — the finale star (precache the set-piece sprite)
// Starter evolution lines' sprites (1-6, 25-26) so the first evolutions show offline.
for (const id of [1, 2, 3, 4, 5, 6, 25, 26]) CORE.push(`./sprites/${id}.png`);
// build-a-word whole-word clips (the blend climax) — small; precache all 72.
// (Other sprites + the 251 name clips warm into cache at runtime via main.js.)
const WORDS = ['sat', 'tap', 'pin', 'nap', 'pat', 'tip', 'sit', 'tin', 'pit', 'pan', 'tan', 'sap',
  'cat', 'hat', 'mat', 'rat', 'hen', 'men', 'ten', 'pen', 'net', 'can', 'man', 'ran',
  'mad', 'sad', 'had', 'dad', 'cap', 'map', 'ram', 'ham', 'kit', 'kid', 'red', 'set',
  'dog', 'log', 'fog', 'big', 'dig', 'pig', 'sun', 'fun', 'run', 'bun', 'bug', 'hug',
  'mug', 'rug', 'bed', 'leg', 'lip', 'hot', 'pot', 'top', 'mop', 'hop', 'cup', 'cut',
  'bat', 'bad', 'bag', 'fan', 'fin', 'gap', 'lab', 'lad', 'nut', 'tub', 'bin', 'fit'];
for (const w of WORDS) CORE.push(`./audio/dada/word-${w}.mp3`);
// Brief 7: the on-style UI icons + reward stickers now exist — precache them so the
// real art is offline-first (and the fallback chip never shows on a cached device).
for (const n of ['tap', 'catch', 'train', 'battle', 'pokedex', 'quest', 'star', 'stickers', 'settings', 'replay', 'bond', 'build-word', 'feed', 'back',
  'games', 'game-subitize', 'game-whatnext', 'game-soundmatch']) CORE.push(`./assets/ui/ic-${n}.png`); // + the Play & Learn corner icons (now on disk)
for (const n of ['pokeball', 'greatball', 'badge', 'berry', 'bolt', 'star', 'medal', 'trophy', 'rainbow', 'balloon', 'sunflower', 'moon']) CORE.push(`./assets/stickers/st-${n}.png`);
// Phase 9: the 18 TCG-style type-symbol badges (js/typeicon.js) — the art is in,
// so precache it for offline-first (the SVG fallback covers any that go missing).
for (const t of ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']) CORE.push(`./assets/ui/type-${t}.png`);

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
