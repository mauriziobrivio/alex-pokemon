// Static game data: the player's name, the numbers, the zones, the starter trio,
// and roster helpers. The roster itself is generated (js/roster.generated.js).

import { ROSTER } from './roster.generated.js';

export { ROSTER };

// The app is Alex's. The name is fixed (no typing — tap-only), and the greeting
// is a named voice clip ("Hi Alex!").
export const PLAYER_NAME = 'Alex';

// Catch teaches recognition of the numerals 1–20. Each is a mastery item.
export const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);
export const isTeen = (n) => n >= 11 && n <= 20;

// The four Phase 1 zones — one Catch engine, four backdrops + spawn pools.
export const ZONES = [
  { id: 'meadow', name: 'Meadow', background: 'assets/backgrounds/bg-meadow.png', suggested: true },
  { id: 'forest', name: 'Forest', background: 'assets/backgrounds/bg-forest.png' },
  { id: 'beach', name: 'Beach', background: 'assets/backgrounds/bg-beach.png' },
  { id: 'mountain', name: 'Mountain', background: 'assets/backgrounds/bg-mountain.png' },
];
export const zoneById = (id) => ZONES.find((z) => z.id === id) || ZONES[0];

// Alex's favourites — gifted in the starter moment (not caught).
export const STARTER_IDS = [25, 4, 1]; // Pikachu, Charmander, Bulbasaur

const BY_ID = new Map(ROSTER.map((p) => [p.id, p]));
export const pokemonById = (id) => BY_ID.get(id) || null;

// Pokémon that live in a given zone (any type in that zone's pool).
export function zonePool(zoneId) {
  return ROSTER.filter((p) => p.zones.includes(zoneId));
}
