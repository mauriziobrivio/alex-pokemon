// The "Play & Learn" corner (Phase 8) — a calm home for standalone learning
// games that GROWS over time (the new-games cadence). Add a game = one GAMES
// entry + one scene module. Audio-first, tap-only, big targets; no scores/timers.

import { el, icon, stickerImg } from '../../ui.js';
import * as audio from '../../audio.js';
import { clip } from '../../voices.js';
import { sfx } from '../../sfx.js';
import * as music from '../../music.js';

// The corner grows by appending here (+ registering each scene in main.js).
// A tile shows either a named UI icon (`icon`) or a mini motif row (`motifs`).
const GAMES = [
  { id: 'game-subitize', name: 'Quick Count', icon: 'game-subitize' },
  { id: 'game-whatnext', name: 'What Comes Next', icon: 'game-whatnext' },
  { id: 'game-soundmatch', name: 'Sound Match', icon: 'game-soundmatch' },
  { id: 'game-pattern', name: 'Pattern Play', // tile = a tiny ●★● pattern (bespoke ic-game-pattern.png optional later)
    motifs: ['assets/stickers/st-pokeball.png', 'assets/stickers/st-star.png', 'assets/stickers/st-pokeball.png'] },
  { id: 'game-mywords', name: 'My Words', icon: 'build-word' }, // review wall of words he's built (reuses the build-a-word icon)
  { id: 'game-stickers', name: 'Sticker Fun', icon: 'stickers' }, // the calm creative sandbox (reuses the sticker-cap icon)
];

export function renderGames(_params, ctx) {
  const root = el('div', { class: 'scene games' });
  music.play('home');

  const back = el('button', { class: 'btn btn--back', type: 'button', 'aria-label': 'Back home',
    onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, icon('back'));

  const grid = el('div', { class: 'games__grid' });
  GAMES.forEach((g) => {
    const art = g.motifs
      ? el('span', { class: 'art ic game-card__icon game-card__pattern', 'aria-hidden': 'true' }, ...g.motifs.map((src) => stickerImg(src, 'game-card__patterncell')))
      : icon(g.icon, 'game-card__icon');
    grid.append(el('button', { class: 'game-card', type: 'button', 'aria-label': g.name,
      onClick: () => { audio.play(sfx.pop()); ctx.go(g.id); } },
      art, el('span', { class: 'game-card__name' }, g.name)));
  });

  root.append(back, el('h1', { class: 'games__title' }, 'Play & Learn'), grid);
  ctx.after(450, () => { if (ctx.alive()) audio.speak(clip.playLearnIntro()); });
  return root;
}
