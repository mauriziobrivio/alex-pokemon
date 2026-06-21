// Grown-Up Progress View (Chapter Four, Part 2) — a detailed, READ-ONLY, all-local
// snapshot of where Alex is, behind the press-and-hold gear (NEVER shown to Alex).
// The Leitner boxes already drive his difficulty; this just surfaces that insight so
// a grown-up (and IST) can reinforce exactly what he's working on. Honest +
// encouraging: it describes growth and the next kind step, never deficit-shame.

import { el } from './ui.js';
import { NUMBERS, LETTERS, isTeen } from './data.js';
import * as mastery from './mastery.js';
import { caughtCount, getFoils, anyEvolved, getWords, getWordsRead } from './game.js';
import * as story from './story.js';
import { readyToRead } from './scenes/games/readit.js';

const BOX_LABEL = { 0: 'not yet', 1: 'learning', 2: 'getting it', 3: 'mastered' };
const section = (title, body) => el('div', { class: 'progress__section' }, el('h3', { class: 'progress__h' }, title), body);
const stat = (label, val) => el('div', { class: 'progress__stat' }, el('span', { class: 'progress__statlabel' }, label), el('span', { class: 'progress__statval' }, String(val)));
const chip = (box, label) => el('span', { class: `progress__chip box-${box}` }, label);

export function openProgress(root) {
  const nums = mastery.snapshot();        // { 1..20: box }
  const letters = mastery.letterSnapshot(); // { boxes: {ch: box}, unlocked }

  const numGrid = el('div', { class: 'progress__grid progress__grid--num' });
  NUMBERS.forEach((n) => { const b = nums[n] || 1; numGrid.append(el('span', { class: `progress__cell box-${b}` + (isTeen(n) ? ' is-teen' : ''), 'aria-label': `${n}: ${BOX_LABEL[b]}` }, String(n))); });

  const letGrid = el('div', { class: 'progress__grid progress__grid--let' });
  LETTERS.forEach((ch) => { const b = letters.boxes[ch] || 0; letGrid.append(el('span', { class: `progress__cell box-${b}`, 'aria-label': `${ch}: ${BOX_LABEL[b]}` }, ch)); });

  const card = el('div', { class: 'panel progress', role: 'dialog', 'aria-label': "Alex's progress" },
    el('h2', { class: 'panel__title' }, "Alex's progress"),
    section('Numbers 1–20 (teens ringed)', numGrid),
    section('Letter-sounds (Jolly Phonics order)', letGrid),
    el('div', { class: 'progress__legend' }, chip(1, 'learning'), chip(2, 'getting it'), chip(3, 'mastered'), chip(0, 'not yet')),
    section('Reading', el('div', { class: 'progress__stats' },
      stat('Words built', getWords().length),
      stat('Words read on his own', getWordsRead().length))),
    section('Collection & journey', el('div', { class: 'progress__stats' },
      stat('Pokémon met', caughtCount()),
      stat('Sparkly cards (foils)', Object.keys(getFoils()).length),
      stat('Evolved a buddy', anyEvolved() ? 'yes' : 'not yet'),
      stat('Rainbow journey', story.finaleSeen('rainbow') ? 'complete' : 'exploring'),
      stat('Wish-Star journey', story.finaleSeen('wishstar') ? 'complete' : 'exploring'),
      stat('Saving Dada', story.finaleSeen('savedada') ? 'reunited!' : 'on the way'))),
    section("Where he's at — and what's next", el('ul', { class: 'progress__next' }, ...whatsNext(nums, letters).map((t) => el('li', {}, t)))),
    el('button', { class: 'btn', type: 'button', onClick: () => overlay.remove() }, 'Done'),
  );
  const overlay = el('div', { class: 'panel-overlay progress-overlay' }, card);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  root.append(overlay);
}

// Plain-language, honest + encouraging next steps (grown-up facing; describes
// growth + a specific kind action, never the child's deficit).
function whatsNext(nums, letters) {
  const out = [];
  const learningNums = NUMBERS.filter((n) => (nums[n] || 1) < 3);
  const learningTeens = learningNums.filter(isTeen);
  let solidUpTo = 0;
  for (const n of NUMBERS) { if ((nums[n] || 1) >= 2) solidUpTo = n; else break; }
  if (!learningNums.length) out.push('Numbers 1–20 are all mastered — wonderful!');
  else if (learningTeens.length) out.push(`${solidUpTo ? `Solid up to ${solidUpTo}; w` : 'Just starting numbers — w'}orking on the teens ${learningTeens.join(', ')} — practise them in Catch.`);
  else out.push(`Coming along on 1–20; still building ${learningNums.slice(0, 4).join(', ')} — a little Catch helps.`);

  const mastered = LETTERS.filter((c) => (letters.boxes[c] || 0) >= 3);
  const learningL = mastery.unlockedLetters().filter((c) => { const b = letters.boxes[c] || 0; return b >= 1 && b < 3; });
  if (mastered.length) out.push(`Strong sounds: ${mastered.join(' ')}${learningL.length ? `; learning ${learningL.join(', ')}` : ''}.`);
  else out.push(`Just starting the sounds: ${mastery.unlockedLetters().slice(0, 6).join(' ')} — Catch (letters) + Sound Match.`);

  if (getWordsRead().length) out.push(`He's reading words on his own — ${getWordsRead().length} so far! Keep going with "Read it yourself".`);
  else if (readyToRead()) out.push('He\'s blending — he\'s ready for "Read it yourself" in Play & Learn.');
  else out.push('Building words in Train — once a few are built, "Read it yourself" will appear.');
  return out;
}
