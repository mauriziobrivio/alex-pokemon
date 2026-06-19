// World map: all nine zones openly selectable (no locks). Dada suggests one (the
// quest's zone if there is one), but Alex chooses. Mama rides along as the
// visual journey companion. Tapping a zone speaks its name and enters Catch.

import { el, charImg } from '../ui.js';
import * as audio from '../audio.js';
import { clip } from '../voices.js';
import { sfx } from '../sfx.js';
import { ZONES } from '../data.js';
import { getActiveQuest, questZoneSuggest } from '../quests.js';

export function renderWorldmap(_params, ctx) {
  const root = el('div', { class: 'scene worldmap', style: { backgroundImage: "url('assets/screens/screen-worldmap.png')" } });

  const back = el('button', { class: 'btn btn--back', type: 'button', 'aria-label': 'Back home',
    onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, '←');

  // Star the quest's zone if there's a catch-in-zone quest, else the default suggestion.
  const starZone = questZoneSuggest(getActiveQuest()) || (ZONES.find((z) => z.suggested) || ZONES[0]).id;

  const grid = el('div', { class: 'worldmap__grid' });
  ZONES.forEach((z) => {
    const card = el('button', { class: 'zone-card', type: 'button', 'aria-label': z.name,
      style: { backgroundImage: `url('${z.background}')` },
      onClick: () => { audio.play(sfx.pop()); audio.play(clip.zone(z.id)); ctx.after(350, () => ctx.go('catch', { zoneId: z.id })); } },
      el('span', { class: 'zone-card__label' }, z.name),
      z.id === starZone ? el('span', { class: 'zone-card__star', 'aria-hidden': 'true' }, '⭐') : null,
    );
    grid.append(card);
  });

  // Mama, the journey companion (visual only).
  const mama = charImg('assets/characters/mama/mama-cheering.png', 'worldmap__mama');

  root.append(back, el('h1', { class: 'worldmap__title' }, 'Where to today?'), grid, mama);
  return root;
}
