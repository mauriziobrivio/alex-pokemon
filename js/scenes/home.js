// Home base (bg-lab): Dada greets Alex by name, his companion is visible, and two
// big destinations — Catch and Pokédex. A grown-up settings panel hides behind a
// press-and-hold gear (a child tapping won't trigger it).

import { el, spriteImg, charImg } from '../ui.js';
import * as audio from '../audio.js';
import { clip } from '../voices.js';
import { sfx } from '../sfx.js';
import { PLAYER_NAME, pokemonById, ZONES } from '../data.js';
import { getStarterId, getSettings, setSettings, resetAll, caughtCount } from '../game.js';

export function renderHome(_params, ctx) {
  const root = el('div', { class: 'scene home', style: { backgroundImage: "url('assets/screens/bg-lab.png')" } });

  // Cast: Dada (guide) + Mama (visual companion) + Alex's starter companion.
  const cast = el('div', { class: 'home__cast' },
    charImg('assets/characters/mama/mama-greeting.png', 'char char--mama'),
    charImg('assets/characters/dada/dada-greeting.png', 'char char--dada', 'Professor Dada'),
  );
  const starter = pokemonById(getStarterId()); // validated; unknown id -> no companion
  if (starter) {
    const comp = spriteImg(starter);
    comp.classList.add('home__companion');
    cast.append(comp);
  }

  const hello = el('div', { class: 'home__hello' }, `Hi ${PLAYER_NAME}!`);

  const menu = el('div', { class: 'home__menu' },
    el('button', { class: 'btn btn--big btn--catch', type: 'button', onClick: () => { audio.play(sfx.pop()); ctx.go('worldmap'); } },
      el('span', { class: 'btn__emoji', 'aria-hidden': 'true' }, '⚪'), 'Catch'),
    el('button', { class: 'btn btn--big btn--train', type: 'button', onClick: () => { audio.play(sfx.pop()); ctx.go('train'); } },
      el('span', { class: 'btn__emoji', 'aria-hidden': 'true' }, '⭐'), 'Train'),
    el('button', { class: 'btn btn--big btn--battle', type: 'button', onClick: () => { audio.play(sfx.pop()); ctx.go('battle'); } },
      el('span', { class: 'btn__emoji', 'aria-hidden': 'true' }, '⚡'), 'Battle'),
    el('button', { class: 'btn btn--big btn--dex', type: 'button', onClick: () => { audio.play(sfx.pop()); ctx.go('pokedex'); } },
      el('span', { class: 'btn__emoji', 'aria-hidden': 'true' }, '📖'), 'Pokédex'),
  );

  const gear = buildGearAndPanel(root);

  root.append(cast, hello, menu, gear);

  // Welcome + a gentle zone suggestion (Dada suggests; Alex chooses).
  // ctx.after no-ops if Alex has already tapped through to another scene.
  ctx.after(400, () => audio.play(clip.homeWelcome()));
  const suggested = ZONES.find((z) => z.suggested) || ZONES[0];
  ctx.after(2200, () => audio.play(clip.suggest(suggested.id)));

  return root;
}

// Press-and-hold gear -> grown-up settings (volume, replay, reset).
function buildGearAndPanel(root) {
  const gear = el('button', { class: 'gear', type: 'button', 'aria-label': 'Grown-ups (hold)' }, '⚙️');
  let timer = null;
  const start = () => { timer = setTimeout(openPanel, 650); };
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  gear.addEventListener('pointerdown', start);
  gear.addEventListener('pointerup', cancel);
  gear.addEventListener('pointerleave', cancel);
  gear.addEventListener('pointercancel', cancel);

  function openPanel() {
    cancel();
    const s = getSettings();
    const panel = el('div', { class: 'panel-overlay' });
    const setVol = (v) => { const n = Math.max(0, Math.min(1, +v.toFixed(2))); s.volume = n; setSettings(s); audio.setVolume(n); volLabel.textContent = `${Math.round(n * 100)}%`; };
    const volLabel = el('span', { class: 'panel__vol' }, `${Math.round((s.volume ?? 1) * 100)}%`);

    let confirmReset = false;
    const resetBtn = el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => {
      if (!confirmReset) { confirmReset = true; resetBtn.textContent = 'Tap again to erase everything'; resetBtn.classList.add('is-danger'); return; }
      resetAll();
      location.reload();
    } }, 'Reset progress');

    const card = el('div', { class: 'panel', role: 'dialog', 'aria-label': 'Settings' },
      el('h2', { class: 'panel__title' }, 'For grown-ups'),
      el('div', { class: 'panel__row' }, el('span', {}, 'Sound'),
        el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => { setVol((s.volume ?? 1) - 0.2); } }, '–'),
        volLabel,
        el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => { setVol((s.volume ?? 1) + 0.2); } }, '+'),
      ),
      el('div', { class: 'panel__row' }, el('span', {}, `Pokémon caught: ${caughtCount()}`)),
      resetBtn,
      el('button', { class: 'btn', type: 'button', onClick: () => panel.remove() }, 'Done'),
    );
    panel.append(card);
    panel.addEventListener('click', (e) => { if (e.target === panel) panel.remove(); });
    root.append(panel);
  }

  return gear;
}
