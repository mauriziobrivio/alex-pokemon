// Bond-fill evolution: the payoff. When a buddy's bond meter fills, it evolves
// into its next stage with a bright white-glow morph, full juice, and Dada's
// cheer. Evolution is pure reward — it never raises the challenge.

import { el, spriteImg, charImg } from './ui.js';
import * as audio from './audio.js';
import { clip } from './voices.js';
import { sfx } from './sfx.js';
import { pokemonById, nextStageId } from './data.js';
import { recordCatch, resetBond, getBond, bondCost, markAnyEvolved, getStarterId, setStarterId } from './game.js';
import { confetti, sparkleBurst, centerOf } from './fx.js';

export const canEvolve = (id) => nextStageId(id) != null && getBond(id) >= bondCost();

// Commit the evolution to saved state; returns the new stage id (or null).
export function commitEvolution(id) {
  const newId = nextStageId(id);
  if (!newId) return null;
  recordCatch(newId);                              // the new stage joins the Pokédex
  resetBond(id);                                   // old stage is done; new stage starts fresh
  markAnyEvolved();
  if (getStarterId() === id) setStarterId(newId);  // the companion evolves too
  return newId;
}

// The morph on bg-evolution.png. onDone() fires after the child taps to continue.
export function playEvolution(root, ctx, oldId, newId, onDone) {
  const oldMon = pokemonById(oldId);
  const newMon = pokemonById(newId);

  const overlay = el('div', { class: 'evolve', style: { backgroundImage: "url('assets/screens/bg-evolution.png')" } });
  const stageWrap = el('div', { class: 'evolve__stage' });
  const before = spriteImg(oldMon); before.classList.add('evolve__sprite', 'evolve__before');
  const after = spriteImg(newMon); after.classList.add('evolve__sprite', 'evolve__after');
  stageWrap.append(before, after);
  overlay.append(stageWrap, charImg('assets/characters/dada/dada-cheering.png', 'evolve__dada'));
  root.append(overlay);

  audio.playSequence([clip.name(oldId), clip.isEvolving()]); // "Pikachu is evolving!"
  ctx.after(400, () => overlay.classList.add('is-charging'));  // glow swells, sprite shimmers
  ctx.after(2000, () => { overlay.classList.add('is-flash'); audio.play(sfx.sparkle()); });
  ctx.after(2300, () => {
    overlay.classList.add('is-evolved');                      // reveal the new stage
    const c = centerOf(stageWrap, root);
    sparkleBurst(root, c.x, c.y, 28);
    confetti(root);
    audio.play(sfx.catch());
    audio.playSequence([clip.name(newId), clip.evolveCheer()]);
  });
  ctx.after(3500, () => {
    if (!ctx.alive()) return;
    overlay.append(el('div', { class: 'evolve__done' },
      el('div', { class: 'evolve__name' }, `${newMon.name}!`),
      el('button', { class: 'btn btn--big', type: 'button', onClick: () => { audio.play(sfx.pop()); overlay.remove(); onDone(newId); } }, 'Hooray!'),
    ));
  });
}
