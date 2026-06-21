// "Ten and more" (Chapter Four, Part 5) — teens as a CONCEPT: "ten and some more".
// The teen ten-frame already shows a full ten + the remainder; here that composition
// is made EXPLICIT and SPOKEN — "Ten… and four more… makes fourteen!" — and a light
// errorless tap (which teen does it make?) lets Alex SEE 10 + N build the teen, the
// foundation of place value. It REINFORCES the recognition scaffold (never replaces
// it) and rides the same number Leitner the rest of the game uses.

import { el, clear } from '../../ui.js';
import * as audio from '../../audio.js';
import { clip } from '../../voices.js';
import { tenFrame } from '../../tenframe.js';
import { isTeen, NUMBERS } from '../../data.js';
import * as mastery from '../../mastery.js';
import { gameShell, choiceBtn, wrongTap, win, shuffle, gateAnswers } from './_common.js';

const TEENS = NUMBERS.filter(isTeen); // 11..20
const BOX_W = { 1: 6, 2: 3, 3: 1 };   // the Leitner picks his growth-edge teens more often
function pickTeen(avoid) {
  const pool = TEENS.filter((n) => n !== avoid);
  const w = [];
  for (const n of pool) { const c = BOX_W[mastery.getBox(n)] || 1; for (let i = 0; i < c; i++) w.push(n); }
  return w[Math.floor(Math.random() * w.length)];
}

export function renderTenMore(_params, ctx) {
  const { root, panel, setPrompt } = gameShell(ctx, 'game-tenmore');
  let last = null, token = 0;

  function round() {
    const myToken = ++token;
    const target = pickTeen(last);
    last = target;
    const rem = target - 10;
    let firstTry = true, busy = false;
    clear(panel);

    // the composition, shown: a full ten + "and N more" (the teen ten-frame, enlarged)
    const frame = tenFrame(target);
    frame.classList.add('tenmore__frame');
    const choicesRow = el('div', { class: 'game__choices' });
    panel.append(el('h2', { class: 'game__title' }, 'Ten and more'), frame, choicesRow);

    // narrate the composition, audio-first: "Ten… and [rem] more… makes…?"
    const speak = () => audio.speakSequence([clip.tenAnd(), clip.number(rem), clip.moreMakes()], 0.12);
    setPrompt(speak); // "hear it again" re-speaks the composition

    const distractors = shuffle(TEENS.filter((n) => n !== target)).slice(0, 2);
    const opts = shuffle([target, ...distractors]);
    opts.forEach((v) => choicesRow.append(choiceBtn(v, 'number', (btn) => {
      if (busy) return;
      if (v === target) { busy = true; win(root, ctx, { record: () => mastery.record(target, firstTry), next: round, say: () => audio.speak(clip.number(target)) }); }
      else { firstTry = false; wrongTap(btn, ctx, speak); } // errorless: dim that one, re-narrate
    })));
    gateAnswers(choicesRow, ctx); // the numerals arrive a beat after the prompt

    ctx.after(450, () => { if (myToken === token) speak(); });
    const idle = () => ctx.after(8000, () => { if (myToken === token && !busy) { speak(); idle(); } });
    idle();
  }

  round();
  return root;
}
