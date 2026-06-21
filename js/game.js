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
// The top stop is a warm high-count "wow", NOT a "you found them all" claim — the
// dex (493, 458 catchable) far outgrew any honest completion line. (Brief 020 follow-up.)
export const MILESTONES = [10, 25, 50, 100, 150, 200, 250];
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

// --- "Read it yourself" (Chapter Four, Part 1): the independent-reading milestone ---
// Words Alex has READ on his own (decoded unprompted), distinct, most-recent first —
// separate from getWords (words he BUILT with the guided scaffold). His FIRST
// independent read is a one-time keepsake (a trophy in his Room).
export const getWordsRead = () => read('wordsRead', []);
export function recordWordRead(word) {
  if (!word) return getWordsRead();
  const list = read('wordsRead', []).filter((w) => w !== word); // move-to-front, no dupes
  list.unshift(word);
  const capped = list.slice(0, 80);
  write('wordsRead', capped);
  return capped;
}
export const firstReadDone = () => !!read('firstReadDone', false);
export const markFirstReadDone = () => write('firstReadDone', true);

// --- Sticker scene (Phase 11, slice 2): the calm creative board ---
// His decorated picture, kept between sessions (a child's creation matters). Shape:
// { bg: 'board' | <zoneId>, items: [{ t: 's'|'p', r: <sticker src | Pokémon id>, x, y }] }
// where x,y are percentages of the canvas so it scales across screens.
export const getBoard = () => read('board', { bg: 'board', items: [] });
export const setBoard = (b) => write('board', b);

// --- My Room (Chapter Four, Part 4): his persistent, customizable home ---
// A place that's HIS — caught Pokémon on shelves, stickers + trophies on display,
// and his own colour choices. Everything is earned or freely chosen (no currency,
// no shop). Shape:
// { wall, floor, rug, bed, curtain: <palette index>,
//   items: [{ t: 'p'|'s'|'r', r: <Pokémon id | sticker src | reward key>, x, y }] }
// where x,y are percentages of the room stage so it scales across screens.
export const getRoom = () => read('room', { wall: 0, floor: 0, rug: 0, bed: 0, curtain: 0, items: [] });
export const setRoom = (r) => write('room', r);

// --- Battle 2.0 (Phase 12): the anti-spiral wellbeing floor ---
// Consecutive battle losses; after a streak the next battle quietly eases so he's
// never stuck in a losing spiral. Resets the moment he wins. (Not a score.)
export const getLossStreak = () => read('lossStreak', 0);
export const recordBattleLoss = () => { const n = getLossStreak() + 1; write('lossStreak', n); return n; };
export const clearBattleLosses = () => write('lossStreak', 0);

// --- Pattern Play (Play & Learn cadence): a gentle persistent difficulty ramp ---
// Counts first-try pattern completions; gates AB → AAB/ABB → ABC. NOT a score —
// it only ever unlocks variety, is never shown to Alex, and never decreases.
export const getPatternWins = () => read('patternWins', 0);
export const recordPatternWin = () => { const n = getPatternWins() + 1; write('patternWins', n); return n; };

// Settings (grown-up): voice/SFX volume + mute, and the music bed volume + mute
// (music defaults to a gentle low level, beneath Dada's voice).
export const getSettings = () => read('settings', { volume: 1, muted: false, music: 0.5, musicMuted: false });
export const setSettings = (s) => write('settings', s);

// Grown-up reset — wipes all of this app's saved progress.
export function resetAll() {
  clearAll();
}
