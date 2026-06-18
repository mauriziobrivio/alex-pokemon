// Game state accessors over localStorage (starter, Pokédex, settings).

import { read, write, clearAll } from './storage.js';

// Starter / companion
export const getStarterId = () => read('starter', null);
export const setStarterId = (id) => write('starter', id);

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
