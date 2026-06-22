// Battle logic — the retrieve step. Phase 12 (Battle 2.0): gentle REAL stakes — a
// back-and-forth he can actually lose, with a warm "tuckered out, try again" soft
// landing (the no-lose-by-construction rule, founder-evolved within no-shame /
// no-dead-end). Three Leitner-driven question types (compare / match / blend).

import * as mastery from './mastery.js';
import { CVC_WORDS, wordBuildable, graphemes, ROSTER, sameSound, LEGENDARY_IDS } from './data.js';

// Tunables. His Pokémon has hearts now; a wrong answer costs one. The wild's HP is
// a little higher so battles are a real exchange (misses extend them), not a fixed
// 3-turn clear. The spiral floor eases the wild quietly after a losing streak.
export const PLAYER_MAX_HP = 3;     // hearts (pictures, never a number shown to Alex)
export const WILD_MAX_HP = 6;
export const SPIRAL_THRESHOLD = 3;  // losses in a row before the next battle quietly eases
export const SPIRAL_EASE_HP = 3;    // the eased wild's starting HP (reverts the moment he wins)
export const BATTLE_BOND = 2;   // a win feeds the Train→Evolution loop

// Type wheel — a GENTLE hint only (no required choice, no win-gating). The set of
// defending types each attacking type is super-effective against (standard chart).
const SUPER_EFFECTIVE = {
  normal: [], fire: ['grass', 'ice', 'bug', 'steel'], water: ['fire', 'ground', 'rock'],
  electric: ['water', 'flying'], grass: ['water', 'ground', 'rock'], ice: ['grass', 'ground', 'flying', 'dragon'],
  fighting: ['normal', 'ice', 'rock', 'dark', 'steel'], poison: ['grass', 'fairy'],
  ground: ['fire', 'electric', 'poison', 'rock', 'steel'], flying: ['grass', 'fighting', 'bug'],
  psychic: ['fighting', 'poison'], bug: ['grass', 'psychic', 'dark'], rock: ['fire', 'ice', 'flying', 'bug'],
  ghost: ['psychic', 'ghost'], dragon: ['dragon'], dark: ['psychic', 'ghost'], steel: ['ice', 'rock', 'fairy'],
  fairy: ['fighting', 'dragon', 'dark'],
};
// The attacker type that's strong against the defender (for the hint icon), or null.
export function superType(atkTypes = [], defTypes = []) {
  for (const a of atkTypes) if ((SUPER_EFFECTIVE[a] || []).some((d) => defTypes.includes(d))) return a;
  return null;
}
export const isSuperEffective = (atk, def) => !!superType(atk, def);

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function pickWild() {
  // Reserved legendaries are special/story-only — not casual battle opponents either.
  const spawnable = ROSTER.filter((p) => p.zones.length && !LEGENDARY_IDS.has(p.id));
  return spawnable[Math.floor(Math.random() * spawnable.length)];
}

// A wild of a specific type — for Story Quest type-battles (e.g. a Fire foe at the
// volcano, so bringing Water actually matters). Falls back to any if none found.
export function pickWildOfType(type) {
  const pool = ROSTER.filter((p) => p.zones.length && !LEGENDARY_IDS.has(p.id) && (p.types || []).includes(type));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : pickWild();
}

export function numberChoices(t, count) {
  const set = new Set([t]);
  const cands = [];
  if (t > 10) cands.push(t - 10);
  cands.push(t - 1, t + 1, t + 10, t - 2, t + 2, t - 3, t + 3);
  for (const c of cands) { if (c >= 1 && c <= 20 && c !== t) set.add(c); if (set.size >= count) break; }
  while (set.size < count) set.add(1 + Math.floor(Math.random() * 20));
  return shuffle([...set].slice(0, count));
}

export function letterChoices(t, count) {
  const set = new Set([t]);
  for (const c of shuffle(mastery.unlockedLetters().filter((c) => c !== t && !sameSound(c, t)))) { set.add(c); if (set.size >= count) break; }
  return shuffle([...set].slice(0, count));
}

// Compare two numbers (magnitude/ordering) — the new cognitive target. Keep a
// clear gap (>= 3) so it's a real magnitude judgment, not a 16-vs-17 coin flip.
export function makeCompare(avoid) {
  const a = mastery.pickTarget(avoid);
  let b = a, guard = 0;
  while ((b === a || Math.abs(b - a) < 3) && guard++ < 20) b = mastery.pickTarget(a);
  if (Math.abs(b - a) < 3) b = a + 3 <= 20 ? a + 3 : a - 3;
  const bigger = Math.random() < 0.5;
  return { type: 'compare', a, b, bigger, answer: bigger ? Math.max(a, b) : Math.min(a, b) };
}

// Find-the-match — discriminate the called target among distractors (number or sound).
export function makeMatch(avoid) {
  if (mastery.unlockedLetters().length >= 3 && Math.random() < 0.4) {
    const t = mastery.pickLetterTarget(avoid);
    return { type: 'match', kind: 'letter', target: t, choices: letterChoices(t, mastery.letterChoiceCount(t)) };
  }
  const t = mastery.pickTarget(avoid);
  return { type: 'match', kind: 'number', target: t, choices: numberChoices(t, mastery.choiceCount(t)) };
}

// Blend-to-charge — tap the sounds in order to power up a charged hit.
export function makeBlend() {
  const unlocked = mastery.unlockedLetterSet();
  const buildable = CVC_WORDS.filter((w) => wordBuildable(w, unlocked));
  return { type: 'blend', word: buildable[Math.floor(Math.random() * buildable.length)] || 'sat' };
}

// Record the outcome against the Leitner boxes (gentle: a miss just means "needs practice").
export function recordQuestion(q, firstTry) {
  if (q.type === 'compare') { mastery.record(q.a, firstTry, 2); mastery.record(q.b, firstTry, 2); }
  else if (q.type === 'match') { q.kind === 'letter' ? mastery.recordLetter(q.target, firstTry) : mastery.record(q.target, firstTry); }
  else if (q.type === 'blend') { for (const g of graphemes(q.word)) mastery.recordLetter(g, firstTry); } // a digraph is one sound
}

// One of each type per battle, shuffled — variety + guaranteed coverage, WILD_MAX_HP hits to win.
export const battlePlan = () => shuffle(['compare', 'match', 'blend']);
