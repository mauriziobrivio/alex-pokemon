// The adaptive push: a 3-box Leitner system over the number items 1–20.
//
//   Box 1 — new / missed: appears most, full ten-frame scaffold.
//   Box 2 — getting it:    appears less, ten-frame shown briefly then fades.
//   Box 3 — mastered:      appears rarely (maintenance), bare numeral.
//
// First-tap-correct promotes; a miss returns the item to Box 1 — gently, never
// punitively (a miss just means "needs more practice"; the encounter still ends
// in a catch). As 1–10 settle into Box 3, the struggling teens come to dominate
// what Alex meets, with zero tuning from us.

import { NUMBERS, isTeen } from './data.js';
import { read, write } from './storage.js';

const KEY = 'mastery.numbers';
const BOX_WEIGHT = { 1: 6, 2: 3, 3: 1 };

function load() {
  const saved = read(KEY, null);
  const boxes = {};
  for (const n of NUMBERS) boxes[n] = (saved && saved[n]) || 1;
  return boxes;
}
let boxes = load();

const save = () => write(KEY, boxes);

export const getBox = (n) => boxes[n] || 1;

// Record the outcome of an encounter for its target number.
export function record(n, firstTryCorrect) {
  if (firstTryCorrect) boxes[n] = Math.min(3, getBox(n) + 1);
  else boxes[n] = 1;
  save();
}

// Weighted pick of the next target number — Box 1 items come up most often.
// `avoid` keeps us from repeating the immediately-previous target back-to-back.
export function pickTarget(avoid = null) {
  const pool = NUMBERS.filter((n) => n !== avoid);
  const candidates = pool.length ? pool : NUMBERS;
  const weighted = [];
  for (const n of candidates) {
    const w = BOX_WEIGHT[getBox(n)] || 1;
    for (let i = 0; i < w; i++) weighted.push(n);
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
}

// How much scaffold to show for the target this encounter.
//   'full' — numeral + full ten-frame, persistent
//   'fade' — numeral + ten-frame shown briefly, then fades
//   'bare' — numeral only
export function scaffold(n) {
  const box = getBox(n);
  if (!isTeen(n)) return box === 1 ? 'fade' : 'bare'; // 1–10: he's solid; light support
  if (box === 1) return 'full';
  if (box === 2) return 'fade';
  return 'bare';
}

// Number of answer choices: a touch harder as an item is mastered.
export const choiceCount = (n) => (getBox(n) >= 3 ? 4 : 3);

// Snapshot for a debug/parent view (not shown to Alex).
export const snapshot = () => ({ ...boxes });
