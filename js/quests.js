// Gentle, optional quests + the sticker collection.
//
// HARD RULE (charter): quests are invitations, never pressure. No streaks, no
// timers, no "quest failed", no FOMO, no nagging. A quest he ignores simply waits
// or changes; missing one costs NOTHING. The reward is a sticker he can SEE —
// never points or numbers he can't read. Progress is tracked passively.

import { read, write } from './storage.js';
import { ZONES, zoneById } from './data.js';

// Visible rewards only (no numbers). On-style art (assets/stickers/st-*.png),
// the agreed Pokémon-world + cute mix. Cycled so the collection stays varied.
const STICKERS = [
  'assets/stickers/st-pokeball.png', 'assets/stickers/st-greatball.png', 'assets/stickers/st-badge.png',
  'assets/stickers/st-berry.png', 'assets/stickers/st-bolt.png', 'assets/stickers/st-star.png',
  'assets/stickers/st-medal.png', 'assets/stickers/st-trophy.png', 'assets/stickers/st-rainbow.png',
  'assets/stickers/st-balloon.png', 'assets/stickers/st-sunflower.png', 'assets/stickers/st-moon.png',
];

const pickZone = () => ZONES[Math.floor(Math.random() * ZONES.length)];

// Small, observable, kid-legible goals. Each is a fresh invitation.
const TEMPLATES = [
  () => { const z = pickZone(); return { kind: 'catch-in-zone', zone: z.id, need: 3, prompt: `Catch 3 Pokémon in the ${z.name}!` }; },
  () => ({ kind: 'catch-any', need: 5, prompt: 'Catch 5 Pokémon!' }),
  () => ({ kind: 'evolve', need: 1, prompt: 'Help one of your Pokémon evolve!' }),
];

function newQuest() {
  const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]();
  return { ...t, progress: 0, done: false };
}

export function getActiveQuest() {
  let q = read('quest', null);
  if (!q) { q = newQuest(); write('quest', q); }
  return q;
}

export const getStickers = () => read('stickers', []);
function awardSticker() {
  const s = getStickers();
  const sticker = STICKERS[s.length % STICKERS.length];
  s.push(sticker);
  write('stickers', s);
  return sticker;
}

// The voice line for the active quest (reuses existing clips where it fits).
export function questZoneSuggest(q) {
  return q && q.kind === 'catch-in-zone' ? q.zone : null;
}

function advance(matches) {
  const q = getActiveQuest();
  if (q.done) return;
  if (matches(q)) {
    q.progress += 1;
    if (q.progress >= q.need) { q.done = true; q.reward = awardSticker(); }
    write('quest', q);
  }
}

// Passive progress hooks (called from catch.js / evolve.js).
export const onCatch = (zoneId) => advance((q) => q.kind === 'catch-any' || (q.kind === 'catch-in-zone' && q.zone === zoneId));
export const onEvolve = () => advance((q) => q.kind === 'evolve');

// Home calls this on entry: if the active quest just finished, return its reward
// and roll a fresh one. Otherwise null. (No failure path — only completion.)
export function takeCompleted() {
  const q = getActiveQuest();
  if (!q.done) return null;
  const done = { prompt: q.prompt, reward: q.reward };
  write('quest', newQuest());
  return done;
}
