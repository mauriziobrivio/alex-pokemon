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

import { NUMBERS, isTeen, LETTERS, LETTER_START_UNLOCKED } from './data.js';
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

// Record the outcome of an encounter for its target number. `maxBox` caps how
// far a correct answer may promote (without ever demoting) — Battle's magnitude
// comparison passes maxBox=2 so it can't push a teen to the bare-numeral box and
// strip the Catch ten-frame, which only genuine recognition (Catch/Train) should.
export function record(n, firstTryCorrect, maxBox = 3) {
  if (firstTryCorrect) boxes[n] = Math.max(getBox(n), Math.min(maxBox, getBox(n) + 1));
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

// --- Letter-sounds: a parallel 3-box Leitner over the Jolly Phonics letters ---
// Unlocked letters have box >= 1; locked letters have box 0. Mastering a letter
// (reaching Box 3) unlocks the next one, so the buildable word set grows.

const LKEY = 'mastery.letters';
const LUKEY = 'mastery.lettersUnlocked';

let unlockedCount = read(LUKEY, LETTER_START_UNLOCKED);
let letterBoxes = (() => {
  const saved = read(LKEY, null) || {};
  const b = {};
  for (const ch of LETTERS) b[ch] = saved[ch] || 0;
  for (let i = 0; i < unlockedCount; i++) if (!b[LETTERS[i]]) b[LETTERS[i]] = 1;
  return b;
})();

const saveLetters = () => { write(LKEY, letterBoxes); write(LUKEY, unlockedCount); };

export const unlockedLetters = () => LETTERS.slice(0, unlockedCount);
export const unlockedLetterSet = () => new Set(unlockedLetters());
export const getLetterBox = (ch) => letterBoxes[ch] || 0;

export function recordLetter(ch, firstTryCorrect) {
  const cur = letterBoxes[ch] || 1;
  if (firstTryCorrect) {
    letterBoxes[ch] = Math.min(3, cur + 1);
    if (letterBoxes[ch] === 3 && unlockedCount < LETTERS.length) {
      unlockedCount += 1;                       // master one -> introduce the next
      const next = LETTERS[unlockedCount - 1];
      if (!letterBoxes[next]) letterBoxes[next] = 1;
    }
  } else {
    letterBoxes[ch] = 1;
  }
  saveLetters();
}

export function pickLetterTarget(avoid = null) {
  const pool = unlockedLetters().filter((c) => c !== avoid);
  const candidates = pool.length ? pool : unlockedLetters();
  const weighted = [];
  for (const c of candidates) {
    const w = BOX_WEIGHT[getLetterBox(c) || 1] || 1;
    for (let i = 0; i < w; i++) weighted.push(c);
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
}

export const letterChoiceCount = (ch) => (getLetterBox(ch) >= 3 ? 4 : 3);
