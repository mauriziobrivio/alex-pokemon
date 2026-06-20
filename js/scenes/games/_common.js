// Shared helpers for the Play & Learn corner (Phase 8). The corner is the
// gentlest space in the game: NO stakes — no escape, no score, no timer. A wrong
// tap just dims that one option and re-prompts; the answer always stays reachable.
// Audio-first (Dada speaks the prompt before a tap is expected), tap-only, big
// targets. Each game rides the existing Leitner engine where it maps to N/letters.

import { el, icon, clear } from '../../ui.js';
import * as audio from '../../audio.js';
import { clip, PRAISE_COUNT, rnd } from '../../voices.js';
import { sfx } from '../../sfx.js';
import { sparkleBurst, confetti, centerOf } from '../../fx.js';

export const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// A scene scaffold: a .scene root, a back→corner button, and a panel to fill.
export function gameShell(ctx, sceneClass) {
  const root = el('div', { class: `scene game ${sceneClass}` });
  const back = el('button', { class: 'btn btn--back', type: 'button', 'aria-label': 'Back to games',
    onClick: () => { audio.play(sfx.pop()); ctx.go('games'); } }, icon('back'));
  const panel = el('div', { class: 'game__panel' });
  root.append(back, panel);
  return { root, panel, clear: () => clear(panel) };
}

// A choice tile (number or letter look). onTap(btn).
export function choiceBtn(value, kind, onTap) {
  return el('button', { class: 'numbtn' + (kind === 'letter' ? ' lettertile' : ''), type: 'button', 'aria-label': String(value),
    onClick: (e) => onTap(e.currentTarget) }, String(value));
}

// Gentle wrong-tap: dim ONLY that button, soft sound, re-prompt. Never an escape,
// never removes the right answer — the gentlest space in the game.
export function wrongTap(btn, ctx, reprompt) {
  audio.play(sfx.soft());
  btn.disabled = true;
  btn.classList.add('is-wrong', 'is-dimmed');
  btn.addEventListener('animationend', () => btn.classList.remove('is-wrong'), { once: true });
  if (reprompt) ctx.after(550, () => { if (ctx.alive()) reprompt(); });
}

// Win: celebrate + record (Leitner) + advance. Audio-first: speak the answer
// readout (`say` returns its play promise), THEN a beat, THEN praise — never two
// voices at once. Praise is OCCASIONAL (~half the time) so it stays special.
export function win(root, ctx, { record, next, say } = {}) {
  if (record) record();
  const c = centerOf(root, root);
  sparkleBurst(root, c.x, c.y, 18);
  confetti(root);
  Promise.resolve(say ? say() : 0).then((dur) => {
    ctx.after(Math.round(((Number(dur) || 0.5) + 0.3) * 1000), () => {
      if (ctx.alive() && Math.random() < 0.5) audio.speak(clip.praise(rnd(PRAISE_COUNT)));
    });
  });
  ctx.after(1600, () => { if (ctx.alive() && next) next(); });
}
