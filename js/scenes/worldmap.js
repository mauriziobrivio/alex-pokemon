// World map: all four zones openly selectable (no locks). Dada suggests one, but
// Alex chooses. Tapping a zone speaks its name and enters the Catch loop there.

import { el } from '../ui.js';
import * as audio from '../audio.js';
import { clip } from '../voices.js';
import { sfx } from '../sfx.js';
import { ZONES } from '../data.js';

export function renderWorldmap(_params, ctx) {
  const root = el('div', { class: 'scene worldmap', style: { backgroundImage: "url('assets/screens/screen-worldmap.png')" } });

  const back = el('button', { class: 'btn btn--back', type: 'button', 'aria-label': 'Back home',
    onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, '←');

  const grid = el('div', { class: 'worldmap__grid' });
  ZONES.forEach((z) => {
    const card = el('button', { class: 'zone-card', type: 'button', 'aria-label': z.name,
      style: { backgroundImage: `url('${z.background}')` },
      onClick: () => { audio.play(sfx.pop()); audio.play(clip.zone(z.id)); ctx.after(350, () => ctx.go('catch', { zoneId: z.id })); } },
      el('span', { class: 'zone-card__label' }, z.name),
      z.suggested ? el('span', { class: 'zone-card__star', 'aria-hidden': 'true' }, '⭐') : null,
    );
    grid.append(card);
  });

  root.append(back, el('h1', { class: 'worldmap__title' }, 'Where to today?'), grid);
  return root;
}
