// "My Words" (Phase 9) — a calm wall of every CVC word Alex has built in Train.
// Tap a word → Dada blends it again (/s/ /a/ /t/ — "sat!") with a sparkle. A
// review and a quiet celebration of his growing reading: no scores, no timers,
// no pressure, audio-first. Reached from the Play & Learn corner.

import { el, icon } from '../../ui.js';
import * as audio from '../../audio.js';
import { clip } from '../../voices.js';
import { sfx } from '../../sfx.js';
import { getWords } from '../../game.js';
import { sparkleBurst, centerOf } from '../../fx.js';
import * as music from '../../music.js';

export function renderMyWords(_params, ctx) {
  const root = el('div', { class: 'scene mywords' });
  music.play('home');

  const back = el('button', { class: 'btn btn--back', type: 'button', 'aria-label': 'Back',
    onClick: () => { audio.play(sfx.pop()); ctx.go('games'); } }, icon('back'));
  root.append(back, el('h1', { class: 'mywords__title' }, 'My Words'));

  const words = getWords();

  // Empty state — never a dead end: a warm invitation back to Train to build one.
  if (!words.length) {
    root.append(el('div', { class: 'mywords__empty' },
      icon('build-word', 'mywords__emptyicon'),
      el('p', { class: 'mywords__emptytext' }, 'Build a word in Train and it lands here!')));
    ctx.after(450, () => { if (ctx.alive()) audio.speak(clip.letsBuild()); });
    return root;
  }

  let busy = false; // one blend at a time — voice never overlaps voice (audio-first)
  const wall = el('div', { class: 'mywords__wall' });
  words.forEach((w) => {
    const card = el('button', { class: 'word-card', type: 'button', 'aria-label': w,
      onClick: () => blend(w, card) }, w);
    wall.append(card);
  });
  root.append(wall);

  async function blend(word, card) {
    if (busy) return;
    busy = true;
    card.classList.add('is-blending');
    audio.play(sfx.pop());
    // segment each sound fully, then blend the whole word (duration-aware queue)
    await audio.playSequence(word.split('').map((ch) => clip.phoneme(ch)), 0.14);
    if (ctx.alive()) await audio.speak(clip.word(word));
    if (ctx.alive()) { const c = centerOf(card, root); sparkleBurst(root, c.x, c.y, 14); }
    card.classList.remove('is-blending');
    busy = false;
  }

  ctx.after(450, () => { if (ctx.alive()) audio.speak(clip.myWords()); });
  return root;
}
