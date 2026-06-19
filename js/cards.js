// The Collection (Phase 6): shared card rendering + the earned pack-reveal
// ceremony. A card frames a caught Pokémon in the Sunlit Storybook style; an
// earned foil (caught first-try) shimmers. The pack reveals the trip's haul —
// "the photos from the adventure" — DETERMINISTICALLY: you get cards for who you
// actually caught, never a random pull. No currency, no timer, no rarity gamble.

import { el, spriteImg } from './ui.js';
import * as audio from './audio.js';
import { clip, PRAISE_COUNT, rnd } from './voices.js';
import { sfx } from './sfx.js';
import { pokemonById } from './data.js';
import { isCaught, isFoil, takeMilestone } from './game.js';
import { sparkleBurst, centerOf } from './fx.js';

// A single collectible card. opts: { caught, foil, onTap }.
// With onTap it's a focusable button; without, an inert div (pack reveal).
export function cardEl(mon, opts = {}) {
  const caught = opts.caught != null ? opts.caught : isCaught(mon.id);
  const foil = caught && (opts.foil != null ? opts.foil : isFoil(mon.id));
  const cls = ['card'];
  if (!caught) cls.push('card--back');
  if (foil) cls.push('card--foil');
  const props = { class: cls.join(' '), 'aria-label': caught ? mon.name : 'A card to discover' };
  if (opts.onTap) { props.type = 'button'; props.onClick = opts.onTap; }
  const card = el(opts.onTap ? 'button' : 'div', props);
  if (!caught) return card; // the card-back art is the whole card — a mystery to discover
  const frame = el('div', { class: 'card__frame' }, spriteImg(mon)); // sprite sits in the frame's window
  if (foil) frame.append(el('div', { class: 'card__shine', 'aria-hidden': 'true' })); // holographic foil overlay
  card.append(frame, el('div', { class: 'card__name' }, mon.name));
  return card;
}

// The pack-opening ceremony. `ids` = the Pokémon met this outing (deterministic).
// Reveals each as a card flipping into view with sparkle + Dada's name + delight,
// the occasional EARNED foil, then offers the binder / go-again / home. No gacha.
export function openPack(root, ctx, ids, { onGoAgain } = {}) {
  const uniq = [...new Set(ids)].map((id) => pokemonById(id)).filter(Boolean);
  const overlay = el('div', { class: 'pack-overlay' });
  root.append(overlay);

  const packActions = () => el('div', { class: 'pack__actions' },
    el('button', { class: 'btn btn--big', type: 'button', onClick: () => { audio.play(sfx.pop()); overlay.remove(); ctx.go('pokedex'); } }, 'See my cards!'),
    onGoAgain ? el('button', { class: 'btn', type: 'button', onClick: () => { audio.play(sfx.pop()); overlay.remove(); onGoAgain(); } }, 'Go again!') : null,
    el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, 'Home'),
  );

  // Graceful empty pack (a rare all-escape outing) — warm, never a failure.
  if (!uniq.length) {
    audio.play(clip.outingEnd());
    overlay.append(el('div', { class: 'pack__done' },
      el('div', { class: 'pack__title' }, 'What an adventure!'),
      el('div', { class: 'pack__sub' }, 'They were shy today — let\'s find some friends!'),
      packActions(),
    ));
    return overlay;
  }

  audio.play(clip.outingEnd()); // "...let's head home and see who we met!"
  const title = el('div', { class: 'pack__title' }, 'Your adventure pack!');
  const pack = el('button', { class: 'pack', type: 'button', 'aria-label': 'Open your pack!' },
    el('div', { class: 'pack__art', 'aria-hidden': 'true' }),
    el('div', { class: 'pack__hint' }, 'Tap to open!'));
  const stage = el('div', { class: 'pack__stage' });
  overlay.append(title, pack, stage);

  const gap = Math.max(450, Math.min(750, Math.round(6000 / uniq.length)));

  function revealOne(i) {
    if (!ctx.alive()) return;
    if (i >= uniq.length) { finish(); return; }
    const mon = uniq[i];
    const foil = isFoil(mon.id);
    const card = cardEl(mon, { caught: true, foil });
    card.classList.add('is-revealing');
    stage.append(card);
    audio.play(sfx.sparkle()); // SFX layers under the voice
    // Chain the spoken lines so they never overlap (audio-first): foil cue, then name.
    if (foil) audio.playSequence([clip.revealFoil(), clip.name(mon.id)]);
    else audio.play(clip.name(mon.id));
    ctx.after(80, () => { if (!ctx.alive()) return; const c = centerOf(card, root); sparkleBurst(root, c.x, c.y, foil ? 22 : 10); });
    ctx.after(gap, () => revealOne(i + 1));
  }

  function finish() {
    if (!ctx.alive()) return;
    const m = takeMilestone(); // celebratory, once each, never names what's missing
    if (m != null) ctx.after(450, () => { if (ctx.alive()) audio.play(clip.milestone(m)); });
    else ctx.after(350, () => { if (ctx.alive()) audio.play(clip.praise(rnd(PRAISE_COUNT))); });
    overlay.append(packActions());
  }

  let opened = false;
  pack.addEventListener('click', () => {
    if (opened) return;
    opened = true;
    audio.play(sfx.pop());
    pack.classList.add('is-opening');
    ctx.after(420, () => { if (!ctx.alive()) return; pack.remove(); title.textContent = 'Look who we met!'; revealOne(0); });
  });

  return overlay;
}
