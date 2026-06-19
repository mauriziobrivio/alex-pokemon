// The living world map (Phase 7) — the card-list picker becomes a world Alex
// taps to travel. The island overworld is the backdrop; each zone is a big,
// forgiving hotspot that gently shimmers and invites (calm ambient motion —
// lava glow, bubbles, snow, fireflies, sparkles — never busy/flashing). Tap a
// place → Dada says its name → into that zone's outing. Mama rides along. Zones
// stay openly selectable (no locks). Audio-first, tap-only, all-visual.

import { el, charImg, icon } from '../ui.js';
import * as audio from '../audio.js';
import { clip } from '../voices.js';
import { sfx } from '../sfx.js';
import { ZONES } from '../data.js';
import { getActiveQuest, questZoneSuggest } from '../quests.js';
import * as music from '../music.js';

// Hotspot centres as % of the map art (screen-worldmap.png, 1536×1024).
const SPOTS = {
  mountain: { x: 30, y: 19 }, volcano: { x: 63, y: 15 }, forest: { x: 13, y: 31 },
  snowfield: { x: 85, y: 31 }, desert: { x: 57, y: 38 }, meadow: { x: 42, y: 48 },
  beach: { x: 12, y: 65 }, grove: { x: 38, y: 75 }, cave: { x: 57, y: 71 }, ocean: { x: 85, y: 81 },
};
// Calm, characterful ambient per atmospheric zone (others get the invite ring).
const FX = { ocean: 'bubble', snowfield: 'snow', grove: 'firefly', cave: 'sparkle', volcano: 'glow' };

export function renderWorldmap(_params, ctx) {
  const root = el('div', { class: 'scene worldmap' });
  music.play('home');
  const back = el('button', { class: 'btn btn--back', type: 'button', 'aria-label': 'Back home',
    onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, icon('back'));

  // Dada gently suggests one zone (the quest's, or the default) — a star, not a lock.
  const starZone = questZoneSuggest(getActiveQuest()) || (ZONES.find((z) => z.suggested) || ZONES[0]).id;

  const map = el('div', { class: 'worldmap__map' });
  ZONES.forEach((z) => {
    const s = SPOTS[z.id] || { x: 50, y: 50 };
    const spot = el('button', { class: `hotspot hotspot--${z.id}`, type: 'button', 'aria-label': z.name,
      style: { left: `${s.x}%`, top: `${s.y}%` },
      onClick: () => { audio.play(sfx.pop()); audio.play(clip.zone(z.id)); ctx.after(380, () => { if (ctx.alive()) ctx.go('catch', { zoneId: z.id }); }); } });
    const fx = el('span', { class: 'hotspot__fx', 'aria-hidden': 'true' });
    const kind = FX[z.id];
    if (kind && kind !== 'glow') for (let i = 0; i < 3; i++) fx.append(el('i', { class: `particle particle--${kind}` }));
    spot.append(fx, el('span', { class: 'hotspot__ring', 'aria-hidden': 'true' }), el('span', { class: 'hotspot__label' }, z.name));
    if (z.id === starZone) spot.append(icon('star', 'hotspot__star'));
    map.append(spot);
  });

  const mama = charImg('assets/characters/mama/mama-cheering.png', 'worldmap__mama');
  root.append(back, el('h1', { class: 'worldmap__title' }, 'Where to today?'), map, mama);
  return root;
}
