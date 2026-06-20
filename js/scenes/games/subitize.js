// Quick Count (subitize-snap) — instant number sense. A small set of dots flashes
// (a GENTLE reveal, never a stressful timer); tap "how many" without counting
// (2–5). Rides the number Leitner (restricted to the small set). Errorless: a
// wrong tap re-shows the dots and re-asks — always solvable.

import { el, clear, prefersReducedMotion } from '../../ui.js';
import * as audio from '../../audio.js';
import { clip } from '../../voices.js';
import * as mastery from '../../mastery.js';
import { gameShell, choiceBtn, wrongTap, win, shuffle, gateAnswers } from './_common.js';

const SMALL = [2, 3, 4, 5];
const BOX_W = { 1: 6, 2: 3, 3: 1 };
function pickSmall(avoid) {
  const pool = SMALL.filter((n) => n !== avoid);
  const w = [];
  for (const n of pool) { const c = BOX_W[mastery.getBox(n)] || 1; for (let i = 0; i < c; i++) w.push(n); }
  return w[Math.floor(Math.random() * w.length)];
}

export function renderSubitize(_params, ctx) {
  const { root, panel, setPrompt } = gameShell(ctx, 'game-subitize');
  let last = null;
  let token = 0;

  function round() {
    const myToken = ++token;
    const target = pickSmall(last);
    last = target;
    let firstTry = true;
    let busy = false;
    clear(panel);

    const flash = el('div', { class: 'subitize__flash' });
    for (let i = 0; i < target; i++) flash.append(el('div', { class: 'subitize__dot' }));
    const choicesRow = el('div', { class: 'game__choices' });
    panel.append(el('h2', { class: 'game__title' }, 'Quick Count'), flash, choicesRow);

    const reveal = () => {
      flash.classList.remove('is-hidden');
      if (!prefersReducedMotion()) ctx.after(950, () => { if (myToken === token) flash.classList.add('is-hidden'); });
    };
    const speak = () => audio.speak(clip.howMany());
    setPrompt(speak); // "hear it again" re-asks

    const opts = shuffle([target, ...shuffle(SMALL.filter((n) => n !== target)).slice(0, 2)]);
    opts.forEach((v) => choicesRow.append(choiceBtn(v, 'number', (btn) => {
      if (busy) return;
      if (v === target) { busy = true; win(root, ctx, { record: () => mastery.record(target, firstTry), next: round, say: () => audio.speak(clip.number(target)) }); }
      else { firstTry = false; reveal(); wrongTap(btn, ctx, () => audio.speak(clip.howMany())); }
    })));
    gateAnswers(choicesRow, ctx); // answers arrive a beat after "How many?"

    reveal();
    ctx.after(450, () => { if (myToken === token) speak(); });
    const idle = () => ctx.after(7000, () => { if (myToken === token && !busy) { reveal(); speak(); idle(); } });
    idle();
  }

  round();
  return root;
}
