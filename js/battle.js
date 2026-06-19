// Battle logic — the retrieve step. A gentle, turn-based, ALWAYS-A-WIN battle.
// Three Leitner-driven question types (compare / match / blend); the engine picks
// what's on Alex's growth edge. No engine here loses or hurts his Pokémon — that
// guarantee lives in the scene (there is simply no enemy-damage mechanic).

import * as mastery from './mastery.js';
import { CVC_WORDS, wordBuildable, ROSTER, sameSound } from './data.js';

// 4 HP = one of each question type per battle: compare(-1) + match(-1) + blend(-2,
// charged) faints the wild after exactly the 3 shuffled turns, in any order.
export const WILD_MAX_HP = 4;
export const BATTLE_BOND = 2;   // a win feeds the Train→Evolution loop

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function pickWild() {
  const spawnable = ROSTER.filter((p) => p.zones.length);
  return spawnable[Math.floor(Math.random() * spawnable.length)];
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
  else if (q.type === 'blend') { for (const ch of q.word) mastery.recordLetter(ch, firstTry); }
}

// One of each type per battle, shuffled — variety + guaranteed coverage, WILD_MAX_HP hits to win.
export const battlePlan = () => shuffle(['compare', 'match', 'blend']);
