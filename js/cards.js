// The Collection (Phase 6): shared card rendering + the earned pack-reveal
// ceremony. A card frames a caught Pokémon in the Sunlit Storybook style; an
// earned foil (caught first-try) shimmers. The pack reveals the trip's haul —
// "the photos from the adventure" — DETERMINISTICALLY: you get cards for who you
// actually caught, never a random pull. No currency, no timer, no rarity gamble.

import { el, spriteImg, clear } from './ui.js';
import * as audio from './audio.js';
import { clip, PRAISE_COUNT, rnd } from './voices.js';
import { sfx } from './sfx.js';
import { pokemonById } from './data.js';
import { isCaught, isFoil, takeMilestone } from './game.js';
import { sparkleBurst, centerOf, driftSparkles, haloRing } from './fx.js';
import { typeBadges, TYPE_COLOR } from './typeicon.js';
import { CARD_ART } from './cards.generated.js';

// Does this Pokémon have a premium full-art card (assets/cards/<id>.png)?
export const hasCardArt = (id) => CARD_ART.has(id);

// A single collectible card. opts: { caught, foil, onTap }.
// Premium full-art (assets/cards/<id>.png) when present — the art IS the card, with
// only a name banner + type symbol over it. Otherwise a framed sprite whose FACE is
// tinted to its type, with the type symbol in the corner. Foils shimmer over either.
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
  const primary = (mon.types && mon.types[0]) || 'normal';
  card.style.setProperty('--type-color', TYPE_COLOR[primary] || TYPE_COLOR.normal);
  renderFace(card, mon, foil);
  return card;
}

// Build the card's visible face. Premium art covers the card (name + type symbol
// overlaid); if the art ever fails to load (offline before it's cached) we
// re-render the framed sprite face instead — never a broken image, never a flash.
function renderFace(card, mon, foil) {
  if (hasCardArt(mon.id) && !card.classList.contains('art-failed')) {
    card.classList.add('card--premium');
    const art = el('img', { class: 'card__art', src: `assets/cards/${mon.id}.png`, alt: '', draggable: false, decoding: 'async', loading: 'lazy' });
    art.addEventListener('error', () => { card.classList.add('art-failed'); card.classList.remove('card--premium'); clear(card); renderFace(card, mon, foil); });
    card.append(art, el('div', { class: 'card__overlay' },
      el('div', { class: 'card__name card__name--premium' }, mon.name),
      typeBadges(mon.types, 'card__types')));
  } else {
    card.classList.add('card--framed');
    card.append(
      el('div', { class: 'card__frame' }, spriteImg(mon)), // sprite on the type-tinted window
      el('div', { class: 'card__name' }, mon.name),
      typeBadges(mon.types, 'card__types'));
  }
  if (foil) card.append(el('div', { class: 'card__shine', 'aria-hidden': 'true' })); // holographic shimmer over either style
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
    audio.speak(clip.outingEnd());
    overlay.append(el('div', { class: 'pack__done' },
      el('div', { class: 'pack__title' }, 'What an adventure!'),
      el('div', { class: 'pack__sub' }, 'They were shy today — let\'s find some friends!'),
      packActions(),
    ));
    return overlay;
  }

  audio.speak(clip.outingEnd()); // "...let's head home and see who we met!"
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
    // Names play on the EXCLUSIVE channel (each replaces the last) so they stay in
    // sync with the fast card flips — no queue lag, never two voices at once. The
    // foil's specialness is carried by its halo + sparkle below.
    audio.playExclusive(clip.name(mon.id));
    ctx.after(80, () => {
      if (!ctx.alive()) return;
      const c = centerOf(card, root);
      sparkleBurst(root, c.x, c.y, foil ? 20 : 10);
      driftSparkles(root, c.x, c.y, foil ? 8 : 5);           // calm rising twinkles
      if (foil) haloRing(root, c.x, c.y, { size: 150, color: 'rgba(255,205,90,0.85)', dur: 950 }); // earned-foil bloom
    });
    ctx.after(gap, () => revealOne(i + 1));
  }

  function finish() {
    if (!ctx.alive()) return;
    const m = takeMilestone(); // celebratory, once each, never names what's missing
    if (m != null) ctx.after(450, () => { if (ctx.alive()) audio.speak(clip.milestone(m)); });
    else ctx.after(350, () => { if (ctx.alive()) audio.speak(clip.praise(rnd(PRAISE_COUNT))); });
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
