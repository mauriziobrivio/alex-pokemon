// The Pokédex — the trophy case and the spaced-retrieval driver. Caught Pokémon
// show in colour; uncaught are silhouettes (discovery, never deficit). Tap a
// caught one to hear its name and see its evolution line (later stages locked).

import { el, clear, spriteImg } from '../ui.js';
import * as audio from '../audio.js';
import { clip } from '../voices.js';
import { sfx } from '../sfx.js';
import { ROSTER, pokemonById } from '../data.js';
import { isCaught, caughtCount } from '../game.js';

export function renderPokedex(_params, ctx) {
  const root = el('div', { class: 'scene pokedex' });

  const back = el('button', { class: 'btn btn--back', type: 'button', 'aria-label': 'Back home',
    onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, '←');
  const header = el('div', { class: 'pokedex__header' },
    el('h1', { class: 'pokedex__title' }, 'Pokédex'),
    el('div', { class: 'pokedex__count' }, `${caughtCount()} / ${ROSTER.length}`),
  );

  const grid = el('div', { class: 'pokedex__grid' });
  ROSTER.forEach((p) => {
    const caught = isCaught(p.id);
    const cell = el('button', { class: 'dex-cell' + (caught ? '' : ' is-locked'), type: 'button',
      'aria-label': caught ? p.name : 'Not yet caught',
      onClick: () => { audio.play(sfx.pop()); caught ? openDetail(p) : peekLocked(p); } });
    cell.append(spriteImg(p, { silhouette: !caught }));
    cell.append(el('span', { class: 'dex-cell__no' }, `#${String(p.id).padStart(3, '0')}`));
    grid.append(cell);
  });

  function peekLocked(p) {
    const overlay = el('div', { class: 'detail-overlay' });
    const card = el('div', { class: 'detail detail--locked' },
      spriteImg(p, { silhouette: true }),
      el('div', { class: 'detail__hint' }, 'Who could this be? Keep exploring!'),
      el('button', { class: 'btn', type: 'button', onClick: () => overlay.remove() }, 'OK'),
    );
    overlay.append(card);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    root.append(overlay);
  }

  function openDetail(p) {
    audio.play(clip.name(p.id));
    const overlay = el('div', { class: 'detail-overlay' });
    const big = spriteImg(p);
    big.classList.add('detail__sprite');

    // Show only stages that exist in the Gen-1 roster (skip cross-gen stages so
    // there's no wall of permanent "???" balls). The full chain stays in the data.
    const stages = p.evolutionChain.map((s) => pokemonById(s.id)).filter(Boolean);
    const line = el('div', { class: 'evoline' });
    stages.forEach((mon, i) => {
      if (i > 0) line.append(el('span', { class: 'evoline__arrow', 'aria-hidden': 'true' }, '→'));
      const stCaught = isCaught(mon.id);
      const node = el('div', { class: 'evoline__stage' + (stCaught ? '' : ' is-locked') });
      node.append(spriteImg(mon, { silhouette: !stCaught }));
      node.append(el('span', { class: 'evoline__name' }, stCaught ? mon.name : '???'));
      line.append(node);
    });

    const card = el('div', { class: 'detail', role: 'dialog', 'aria-label': p.name },
      big,
      el('div', { class: 'detail__name', onClick: () => audio.play(clip.name(p.id)) }, p.name),
      el('div', { class: 'detail__types' }, ...p.types.map((t) => el('span', { class: `type type--${t}` }, t))),
      stages.length > 1 ? el('div', { class: 'detail__evolabel' }, 'Evolutions') : null,
      stages.length > 1 ? line : null,
      el('button', { class: 'btn btn--big', type: 'button', onClick: () => overlay.remove() }, 'Back to Pokédex'),
    );
    overlay.append(card);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    root.append(overlay);
  }

  root.append(back, header, grid);
  return root;
}
