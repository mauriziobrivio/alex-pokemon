// The Collection binder (Phase 6) — the Pokédex reimagined as a card album.
// Caught Pokémon are collectible cards (framed sprite, spoken name, evolution
// line, an earned foil); uncaught are silhouette card-backs (discovery to come,
// never a deficit). Organised into habitat (zone) pages so it grows with the
// world and stays light — only one page renders at a time. Tap a caught card →
// the Pokémon comes ALIVE in its home habitat (a "living card"). Audio-first,
// tap-only, no-shame; no "complete the set" pressure anywhere.

import { el, clear, spriteImg, icon } from '../ui.js';
import * as audio from '../audio.js';
import { clip } from '../voices.js';
import { sfx } from '../sfx.js';
import { ZONES, zoneById, zonePool, pokemonById } from '../data.js';
import { isCaught, isFoil, caughtCount } from '../game.js';
import { cardEl } from '../cards.js';
import { sparkleBurst, centerOf } from '../fx.js';
import * as music from '../music.js';

export function renderPokedex(_params, ctx) {
  const root = el('div', { class: 'scene binder' });
  music.play('home');

  const back = el('button', { class: 'btn btn--back', type: 'button', 'aria-label': 'Back home',
    onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, icon('back'));

  const header = el('div', { class: 'binder__header' },
    el('h1', { class: 'binder__title' }, 'My Cards'),
    el('div', { class: 'binder__count' }, `${caughtCount()} discovered`),
  );

  const tabs = el('div', { class: 'binder__tabs', role: 'tablist' });
  const page = el('div', { class: 'binder__page' });

  const zoneCaught = (z) => zonePool(z.id).filter((p) => isCaught(p.id)).length;
  // Open on his richest habitat (most discovered), else the first zone.
  let activeZone = ZONES.slice().sort((a, b) => zoneCaught(b) - zoneCaught(a))[0].id;

  ZONES.forEach((z) => {
    const pool = zonePool(z.id);
    const got = pool.filter((p) => isCaught(p.id)).length;
    const tab = el('button', {
      class: 'binder__tab', type: 'button', role: 'tab',
      'aria-label': `${z.name}, ${got} of ${pool.length} found`,
      onClick: () => { audio.play(sfx.pop()); selectZone(z.id); },
    },
      el('span', { class: 'binder__tabname' }, z.name),
      el('span', { class: 'binder__tabcount' }, `${got}/${pool.length}`),
    );
    tab.dataset.zone = z.id;
    tabs.append(tab);
  });

  function selectZone(id) {
    activeZone = id;
    [...tabs.children].forEach((t) => t.classList.toggle('is-active', t.dataset.zone === id));
    const active = tabs.querySelector('.is-active');
    if (active) active.scrollIntoView({ inline: 'center', block: 'nearest' });
    renderPage(id);
  }

  function renderPage(id) {
    clear(page);
    const grid = el('div', { class: 'binder__grid' });
    zonePool(id).slice().sort((a, b) => a.id - b.id).forEach((mon) => {
      const caught = isCaught(mon.id);
      grid.append(cardEl(mon, { caught, onTap: () => { audio.play(sfx.pop()); caught ? openLivingCard(mon) : peek(mon); } }));
    });
    page.append(grid);
  }

  // Uncaught — a gentle "discovery to come", never a deficit. Spoken (audio-first).
  function peek(mon) {
    audio.play(clip.peek());
    const overlay = el('div', { class: 'detail-overlay' });
    overlay.append(el('div', { class: 'detail detail--locked' },
      spriteImg(mon, { silhouette: true }),
      el('div', { class: 'detail__hint' }, 'Who could this be? Keep exploring!'),
      el('button', { class: 'btn', type: 'button', onClick: () => overlay.remove() }, 'OK'),
    ));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    root.append(overlay);
  }

  // Living card — the Pokémon comes alive in its home habitat. Wonder, not stats.
  function openLivingCard(mon) {
    audio.play(clip.name(mon.id));
    const zoneId = activeZone; // the habitat page you're viewing it in (always a valid backdrop)
    const foil = isFoil(mon.id);

    const overlay = el('div', { class: 'living-overlay' });
    const sprite = spriteImg(mon); sprite.classList.add('living__sprite');
    const scene = el('div', { class: 'living__scene' + (foil ? ' is-foil' : '') }, sprite);
    if (foil) scene.append(el('div', { class: 'living__shine', 'aria-hidden': 'true' }));
    const stage = el('div', { class: 'living__stage', style: { backgroundImage: `url('${zoneById(zoneId).background}')` } }, scene);

    const stages = mon.evolutionChain.map((s) => pokemonById(s.id)).filter(Boolean);
    const line = el('div', { class: 'evoline' });
    stages.forEach((m, i) => {
      if (i > 0) line.append(el('span', { class: 'evoline__arrow', 'aria-hidden': 'true' }, '→'));
      const st = isCaught(m.id);
      const node = el('div', { class: 'evoline__stage' + (st ? '' : ' is-locked') });
      node.append(spriteImg(m, { silhouette: !st }), el('span', { class: 'evoline__name' }, st ? m.name : '???'));
      line.append(node);
    });

    const panel = el('div', { class: 'living__panel' },
      el('div', { class: 'living__name', onClick: () => audio.play(clip.name(mon.id)) }, mon.name),
      el('div', { class: 'detail__types' }, ...mon.types.map((t) => el('span', { class: `type type--${t}` }, t))),
      stages.length > 1 ? el('div', { class: 'detail__evolabel' }, 'Evolution line') : null,
      stages.length > 1 ? line : null,
      el('button', { class: 'btn btn--big', type: 'button', onClick: () => { audio.play(sfx.pop()); overlay.remove(); } }, 'Back to my cards'),
    );

    overlay.append(stage, panel);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    root.append(overlay);
    ctx.after(120, () => { if (!ctx.alive()) return; const c = centerOf(sprite, root); sparkleBurst(root, c.x, c.y, foil ? 18 : 10); });
  }

  root.append(back, header, tabs, page);
  selectZone(activeZone);
  return root;
}
