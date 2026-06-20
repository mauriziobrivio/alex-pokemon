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

// All nine zones — one Catch engine, nine backdrops + spawn pools. Openly
// selectable (no locks); Dada may suggest one. Backgrounds lazy-load per zone.
export const ZONES = [
  { id: 'meadow', name: 'Meadow', background: 'assets/backgrounds/bg-meadow.png', suggested: true },
  { id: 'forest', name: 'Forest', background: 'assets/backgrounds/bg-forest.png' },
  { id: 'beach', name: 'Beach', background: 'assets/backgrounds/bg-beach.png' },
  { id: 'mountain', name: 'Mountain', background: 'assets/backgrounds/bg-mountain.png' },
  { id: 'desert', name: 'Desert', background: 'assets/backgrounds/bg-desert.png' },
  { id: 'volcano', name: 'Volcano', background: 'assets/backgrounds/bg-volcano.png' },
  { id: 'snowfield', name: 'Snowfield', background: 'assets/backgrounds/bg-snowfield.png' },
  { id: 'grove', name: 'Mystic Grove', background: 'assets/backgrounds/bg-grove.png' },
  { id: 'cave', name: 'Cave', background: 'assets/backgrounds/bg-cave.png' },
  { id: 'ocean', name: 'Ocean Depths', background: 'assets/backgrounds/bg-ocean.png' }, // Phase 7
];
export const zoneById = (id) => ZONES.find((z) => z.id === id) || ZONES[0];

// Ocean Depths (Phase 7) — the deep-water / fully-aquatic species live here; the
// Beach stays shore/surface. An expert-curated, explicit list (not a pure type
// rule, since "deep water" isn't a type) — extend it as later generations add
// deep-water Pokémon. Re-homed OUT of the Beach below.
export const OCEAN_IDS = new Set([
  72, 73, 90, 91, 98, 99, 116, 117, 118, 119, 120, 121, 129, 130, 131,
  138, 139, 140, 141, 230,            // Gen 1 deep-water + fossils (+ Kingdra)
  170, 171, 211, 222, 223, 224, 226,  // Gen 2 deep-water
  318, 319, 320, 321, 339, 340, 341, 342, 349, 350, // Gen 3: Carvanha/Sharpedo, Wailmer/Wailord, Barboach/Whiscash, Corphish/Crawdaunt, Feebas/Milotic
  363, 364, 365, 366, 367, 368, 369, 370,           // Spheal line, Clamperl/Huntail/Gorebyss, Relicanth, Luvdisc
]);

// Alex's favourites — gifted in the starter moment (not caught).
export const STARTER_IDS = [25, 4, 1]; // Pikachu, Charmander, Bulbasaur

const BY_ID = new Map(ROSTER.map((p) => [p.id, p]));
export const pokemonById = (id) => BY_ID.get(id) || null;

// Pokémon that live in a given zone. The Ocean Depths is the curated deep-water
// set; the Beach is shore/surface (its deep-water residents re-homed to Ocean).
// zonePool is the single source of truth for spawning + the binder, so every
// Pokémon still has ≥1 home (the ocean residents gain Ocean as they leave Beach).
export function zonePool(zoneId) {
  if (zoneId === 'ocean') return ROSTER.filter((p) => OCEAN_IDS.has(p.id));
  if (zoneId === 'beach') return ROSTER.filter((p) => p.zones.includes('beach') && !OCEAN_IDS.has(p.id));
  return ROSTER.filter((p) => p.zones.includes(zoneId));
}

// The next evolution stage (direct child, first that exists in the Gen-1 roster),
// or null at the end of the line. Uses evolvesTo so branches (Eevee) don't
// mis-route. Evolution is earned by Training, independent of catch-zones.
export function nextStageId(id) {
  const p = pokemonById(id);
  if (!p || !p.evolvesTo) return null;
  for (const nid of p.evolvesTo) if (pokemonById(nid)) return nid;
  return null;
}

// --- Phonics: letter-sounds in Jolly Phonics order (groups 1–3 for Phase 2) ---
// Group 1 alone (s a t i p n) builds real CVC words — the whole point of the order.
export const LETTERS = [
  's', 'a', 't', 'i', 'p', 'n',        // group 1
  'c', 'k', 'e', 'h', 'r', 'm', 'd',   // group 2
  'g', 'o', 'u', 'l', 'f', 'b',        // group 3
];
export const LETTER_START_UNLOCKED = 6; // group 1 is available from the start
export const isVowel = (ch) => 'aeiou'.includes(ch);

// The SOUND each letter makes (phoneme key). 'c' and 'k' both say /k/ — homophones
// must never be each other's distractor (a correct sound can't be a "wrong" answer).
export const LETTER_SOUND = { s: 's', a: 'a', t: 't', i: 'i', p: 'p', n: 'n', c: 'k', k: 'k',
  e: 'e', h: 'h', r: 'r', m: 'm', d: 'd', g: 'g', o: 'o', u: 'u', l: 'l', f: 'f', b: 'b' };
export const sameSound = (a, b) => LETTER_SOUND[a] === LETTER_SOUND[b];

// CVC words for build-a-word. Train only offers words whose letters are all
// unlocked, so the buildable set grows as Alex masters more sounds.
export const CVC_WORDS = [
  'sat', 'tap', 'pin', 'nap', 'pat', 'tip', 'sit', 'tin', 'pit', 'pan', 'tan', 'sap',
  'cat', 'hat', 'mat', 'rat', 'hen', 'men', 'ten', 'pen', 'net', 'can', 'man', 'ran',
  'mad', 'sad', 'had', 'dad', 'cap', 'map', 'ram', 'ham', 'kit', 'kid', 'red', 'set',
  'dog', 'log', 'fog', 'big', 'dig', 'pig', 'sun', 'fun', 'run', 'bun', 'bug', 'hug',
  'mug', 'rug', 'bed', 'leg', 'lip', 'hot', 'pot', 'top', 'mop', 'hop', 'cup', 'cut',
  'bat', 'bad', 'bag', 'fan', 'fin', 'gap', 'lab', 'lad', 'nut', 'tub', 'bin', 'fit',
];
export const wordBuildable = (word, unlocked) => [...word].every((c) => unlocked.has(c));

// Bond meter cost (Train interactions to evolve). The first evolution is a touch
// cheaper for the early dopamine; tune from watching Alex.
export const BOND_COST = 10;
export const BOND_FIRST_COST = 8;

// --- Catch, deeper (Phase 5) — gentle stakes, both one-line tunables ---
// Wrong taps in ONE encounter before the wild gently hops away. Each wrong tap
// first just removes that option (a narrowing hint), so 2 = one hint, then a
// kind escape. Raise to soften (rarer escapes); the encounter stays errorless.
export const MISSES_TO_ESCAPE = 2;
// A catching outing is up to this many encounters (caught OR escaped), then a
// warm soft-stop. This is pacing & a happy stopping place — NEVER scarcity:
// no energy, no refill wait, no lockout; Alex can start another outing at once.
export const OUTING_LENGTH = 10;
