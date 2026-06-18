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

// Settings (grown-up): volume + mute
export const getSettings = () => read('settings', { volume: 1, muted: false });
export const setSettings = (s) => write('settings', s);

// Grown-up reset — wipes all of this app's saved progress.
export function resetAll() {
  clearAll();
}
