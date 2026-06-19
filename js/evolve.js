// Bond-fill evolution: the payoff. When a buddy's bond meter fills, it evolves
// into its next stage with a bright white-glow morph, full juice, and Dada's
// cheer. Evolution is pure reward — it never raises the challenge.

import { el, spriteImg, charImg } from './ui.js';
import * as audio from './audio.js';
import { clip } from './voices.js';
import { sfx } from './sfx.js';
import { pokemonById, nextStageId } from './data.js';
import { recordCatch, resetBond, getBond, bondCost, markAnyEvolved, getStarterId, setStarterId } from './game.js';
import { onEvolve } from './quests.js';
import * as music from './music.js';
import { confetti, sparkleBurst, centerOf, haloRing } from './fx.js';

export const canEvolve = (id) => nextStageId(id) != null && getBond(id) >= bondCost();

// Commit an evolution to saved state; returns the new stage id (or null). Pass an
// explicit toId to honor a chosen branch (e.g. which eeveelution).
export function commitEvolution(id, toId) {
  const newId = toId || nextStageId(id);
  if (!newId) return null;
  recordCatch(newId);                              // the new stage joins the Pokédex
  resetBond(id);                                   // old stage is done; new stage starts fresh
  markAnyEvolved();
  onEvolve();                                      // passive quest progress
  if (getStarterId() === id) setStarterId(newId);  // the companion evolves too
  return newId;
}

// Direct, in-roster evolution targets (>1 only for branched lines like Eevee).
export function evolutionTargets(id) {
  const p = pokemonById(id);
  if (!p || !p.evolvesTo) return [];
  return p.evolvesTo.filter((nid) => pokemonById(nid));
}

// Full evolution flow used by Train and Battle: a branch CHOICE (Eevee →
// Vaporeon/Jolteon/Flareon) when there's more than one target, then the morph.
// Errorless: every choice is wonderful; preview-then-confirm so no mis-tap locks in.
export function triggerEvolution(root, ctx, id, onDone) {
  const back = music.current();          // the bed to return to after the swell
  music.play('evolve');                  // a short magical swell for the showpiece
  const done = (newId) => { music.play(back || 'home'); onDone(newId); };
  const targets = evolutionTargets(id);
  if (!targets.length) { done(id); return; }
  if (targets.length === 1) {
    const newId = commitEvolution(id, targets[0]);
    playEvolution(root, ctx, id, newId, done);
    return;
  }
  showEvolutionChoice(root, ctx, targets, (chosen) => {
    const newId = commitEvolution(id, chosen);
    playEvolution(root, ctx, id, newId, done);
  });
}

function showEvolutionChoice(root, ctx, targets, onChoose) {
  const overlay = el('div', { class: 'evolve-choice', style: { backgroundImage: "url('assets/screens/bg-evolution.png')" } });
  const opts = el('div', { class: 'evolve-choice__opts' });
  let selected = null;
  let idle = null;
  // gentle audio-first nudge if Alex just looks (mirrors catch/train/battle)
  const scheduleIdle = () => { clearTimeout(idle); idle = ctx.after(7000, () => { if (overlay.isConnected) { audio.play(clip.starterIntro()); scheduleIdle(); } }); };

  const confirm = el('button', { class: 'btn btn--confirm', type: 'button', style: { visibility: 'hidden' } });
  confirm.addEventListener('click', () => { if (selected != null) { clearTimeout(idle); audio.play(sfx.pop()); overlay.remove(); onChoose(selected); } });
  targets.forEach((nid) => {
    const mon = pokemonById(nid);
    const btn = el('button', { class: 'evolve-choice__opt', type: 'button', 'aria-label': mon.name,
      onClick: () => {
        selected = nid;
        scheduleIdle();
        audio.play(sfx.pop()); audio.play(clip.name(nid));
        [...opts.children].forEach((b) => b.classList.toggle('is-selected', b === btn));
        confirm.textContent = `Choose ${mon.name}!`;
        confirm.style.visibility = 'visible';
      } });
    const s = spriteImg(mon); s.classList.add('evolve-choice__sprite');
    btn.append(s, el('span', { class: 'evolve-choice__name' }, mon.name));
    opts.append(btn);
  });
  overlay.append(el('div', { class: 'evolve-choice__stage' },
    el('div', { class: 'evolve-choice__title' }, 'Choose your evolution!'), opts, confirm));
  root.append(overlay);
  ctx.after(400, () => audio.play(clip.starterIntro())); // reuse the warm "choose!" intro
  scheduleIdle();
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
    haloRing(root, c.x, c.y, { size: 320, dur: 1100 });       // a big gentle bloom of light on reveal
    sparkleBurst(root, c.x, c.y, 24);
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
