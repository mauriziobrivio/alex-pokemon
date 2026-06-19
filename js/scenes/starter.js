// The starter moment (first launch only): Dada gifts Alex his first Pokémon.
// Preview-then-confirm — tapping a ball just previews; only "Choose [name]!"
// commits. No mis-tap can lock him in. Full juice on confirm.

import { el, clear, spriteImg } from '../ui.js';
import * as audio from '../audio.js';
import { clip } from '../voices.js';
import { sfx } from '../sfx.js';
import { STARTER_IDS, pokemonById } from '../data.js';
import { setStarterId, recordCatch } from '../game.js';
import { confetti, sparkleBurst, centerOf } from '../fx.js';
import * as music from '../music.js';

export function renderStarter(_params, ctx) {
  const root = el('div', { class: 'scene starter', style: { backgroundImage: "url('assets/screens/scene-starter-select.png')" } });
  music.play('home');
  const stage = el('div', { class: 'starter__stage' });

  const title = el('div', { class: 'starter__title' }, 'Choose your first Pokémon!');
  const preview = el('div', { class: 'starter__preview' });
  const name = el('div', { class: 'starter__name' });
  const confirmBtn = el('button', { class: 'btn btn--confirm', type: 'button', style: { visibility: 'hidden' } });

  const balls = el('div', { class: 'starter__balls' });
  let selectedId = null;
  let done = false;

  STARTER_IDS.forEach((id) => {
    const p = pokemonById(id);
    const ball = el('button', { class: 'pokeball-btn', type: 'button', 'aria-label': p.name,
      onClick: () => previewPick(id, ball) },
      el('div', { class: 'pokeball', 'aria-hidden': 'true' }));
    balls.append(ball);
  });

  function previewPick(id, ball) {
    if (done) return;
    selectedId = id;
    const p = pokemonById(id);
    audio.play(sfx.pop());
    audio.play(clip.name(id));
    [...balls.children].forEach((b) => b.classList.toggle('is-selected', b === ball));
    clear(preview);
    const s = spriteImg(p);
    s.classList.add('pop-in');
    preview.append(s);
    name.textContent = p.name;
    confirmBtn.textContent = `Choose ${p.name}!`;
    confirmBtn.style.visibility = 'visible';
    const c = centerOf(s, root);
    sparkleBurst(root, c.x, c.y, 12);
  }

  confirmBtn.addEventListener('click', () => {
    if (done || !selectedId) return;
    done = true;
    const p = pokemonById(selectedId);
    setStarterId(selectedId);
    recordCatch(selectedId); // first Pokédex entry
    confirmBtn.disabled = true;
    balls.classList.add('is-hidden');
    audio.play(sfx.catch());
    confetti(root);
    const c = centerOf(preview, root);
    sparkleBurst(root, c.x, c.y, 22);
    preview.firstChild && preview.firstChild.classList.add('celebrate');
    audio.playSequence([clip.name(selectedId), clip.greatChoice()]);
    ctx.after(2000, () => ctx.go('home'));
  });

  ctx.after(450, () => audio.play(clip.starterIntro()));

  stage.append(title, preview, name, balls, confirmBtn);
  root.append(stage);
  return root;
}
