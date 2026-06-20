// Game state accessors over localStorage (starter, Pokédex, settings).

import { read, write, clearAll } from './storage.js';
import { BOND_COST, BOND_FIRST_COST } from './data.js';

// Starter / companion
export const getStarterId = () => read('starter', null);
export const setStarterId = (id) => write('starter', id);

// Bond meters — per Pokémon id, filled by Training. No decay, no timers, no
// pressure: a gentle, generous path the child chooses.
export const getBonds = () => read('bonds', {});
export const getBond = (id) => (id == null ? 0 : getBonds()[id] || 0);
export function addBond(id, n = 1) {
  if (id == null) return 0; // never write a junk bonds[null] key
  const b = getBonds();
  b[id] = (b[id] || 0) + n;
  write('bonds', b);
  return b[id];
}
export function resetBond(id) {
  if (id == null) return;
  const b = getBonds();
  b[id] = 0;
  write('bonds', b);
}
// The first evolution overall is a touch cheaper, for the early dopamine.
export const anyEvolved = () => !!read('anyEvolved', false);
export const markAnyEvolved = () => write('anyEvolved', true);
export const bondCost = () => (anyEvolved() ? BOND_COST : BOND_FIRST_COST);

// Pokédex — { [id]: timesCaught }
export const getPokedex = () => read('pokedex', {});
export const isCaught = (id) => !!getPokedex()[id];
export const caughtCount = () => Object.keys(getPokedex()).length;
export function recordCatch(id) {
  const dex = getPokedex();
  dex[id] = (dex[id] || 0) + 1;
  write('pokedex', dex);
  return dex;
}

// --- Collection (Phase 6): foils + discovery milestones ---
// A card earns its FOIL when its Pokémon is caught on the FIRST try — earned by
// skill (instant recognition), NEVER gambled, no luck, no rarity tier. Once
// earned it persists. markFoil returns true only on the first time it's earned,
// so the pack reveal can add an extra sparkle.
export const getFoils = () => read('foils', {});
export const isFoil = (id) => !!getFoils()[id];
export function markFoil(id) {
  if (id == null) return false;
  const f = getFoils();
  if (f[id]) return false;
  f[id] = 1;
  write('foils', f);
  return true;
}

// Discovery milestones — spoken warmly when the collection crosses a threshold,
// once each, ascending. CELEBRATORY, never a nag: we announce what's *found*,
// never what's missing, and there's no "complete the set" pressure anywhere.
export const MILESTONES = [10, 25, 50, 100, 150, 200, 251];
// Returns the highest milestone just crossed (or null) and records it so each is
// spoken exactly once. Call at the end of a pack reveal (the moment of earning).
export function takeMilestone() {
  const count = caughtCount();
  const last = read('milestone', 0);
  let hit = null;
  for (const m of MILESTONES) if (count >= m && m > last) hit = m;
  if (hit != null) write('milestone', hit);
  return hit;
}

// --- "My Words" (Phase 9): the CVC words Alex has built in Train ---
// A growing review wall he can revisit and re-blend. Distinct words, most-recent
// first; generously capped (above the full CVC set) so a built word is never lost.
export const getWords = () => read('words', []);
export function recordWord(word) {
  if (!word) return getWords();
  const list = read('words', []).filter((w) => w !== word); // move-to-front, no dupes
  list.unshift(word);
  const capped = list.slice(0, 80);
  write('words', capped);
  return capped;
}

// --- Sticker scene (Phase 11, slice 2): the calm creative board ---
// His decorated picture, kept between sessions (a child's creation matters). Shape:
// { bg: 'board' | <zoneId>, items: [{ t: 's'|'p', r: <sticker src | Pokémon id>, x, y }] }
// where x,y are percentages of the canvas so it scales across screens.
export const getBoard = () => read('board', { bg: 'board', items: [] });
export const setBoard = (b) => write('board', b);

// Settings (grown-up): voice/SFX volume + mute, and the music bed volume + mute
// (music defaults to a gentle low level, beneath Dada's voice).
export const getSettings = () => read('settings', { volume: 1, muted: false, music: 0.5, musicMuted: false });
export const setSettings = (s) => write('settings', s);

// Grown-up reset — wipes all of this app's saved progress.
export function resetAll() {
  clearAll();
}
