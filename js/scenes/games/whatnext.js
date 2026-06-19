// What Comes Next — sequence & ordinality. Shows a numeral N and asks "what comes
// after N?"; tap N+1 from three tiles. Reinforces the teens from a new angle.
// Rides the number Leitner (records the answer). Errorless, audio-first.

import { el, clear } from '../../ui.js';
import * as audio from '../../audio.js';
import { clip } from '../../voices.js';
import * as mastery from '../../mastery.js';
import { gameShell, choiceBtn, wrongTap, win, shuffle } from './_common.js';

export function renderWhatNext(_params, ctx) {
  const { root, panel } = gameShell(ctx, 'game-whatnext');
  let last = null;
  let token = 0;

  function round() {
    const myToken = ++token;
    let n = mastery.pickTarget(last);
    let guard = 0;
    while (n >= 20 && guard++ < 8) n = mastery.pickTarget(last); // need N+1 ≤ 20
    if (n >= 20) n = 14;
    last = n;
    const answer = n + 1;
    let firstTry = true;
    let busy = false;
    clear(panel);

    const anchor = el('div', { class: 'whatnext__anchor' }, String(n));
    const choicesRow = el('div', { class: 'game__choices' });
    panel.append(el('h2', { class: 'game__title' }, 'What comes next?'), anchor, choicesRow);

    const speak = () => audio.playSequence([clip.whatComesAfter(), clip.number(n)]);

    const set = new Set([answer]);
    for (const d of [n - 1, n + 2, answer + 1, n]) { if (d >= 1 && d <= 20 && d !== answer) set.add(d); if (set.size >= 3) break; }
    while (set.size < 3) set.add(1 + Math.floor(Math.random() * 20));
    shuffle([...set].slice(0, 3)).forEach((v) => choicesRow.append(choiceBtn(v, 'number', (btn) => {
      if (busy) return;
      if (v === answer) { busy = true; win(root, ctx, { record: () => mastery.record(answer, firstTry), next: round, say: () => audio.play(clip.number(answer)) }); }
      else { firstTry = false; wrongTap(btn, ctx, speak); }
    })));

    ctx.after(450, () => { if (myToken === token) speak(); });
    const idle = () => ctx.after(7000, () => { if (myToken === token && !busy) { speak(); idle(); } });
    idle();
  }

  round();
  return root;
}
