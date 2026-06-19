// Home base (bg-lab): Dada greets Alex by name, Mama and his companion are here,
// the four destinations, and a GENTLE optional quest + sticker collection. A
// grown-up settings panel hides behind a press-and-hold gear.

import { el, spriteImg, charImg, icon, stickerImg } from '../ui.js';
import * as audio from '../audio.js';
import { clip, PRAISE_COUNT, rnd } from '../voices.js';
import { sfx } from '../sfx.js';
import { PLAYER_NAME, pokemonById, ZONES } from '../data.js';
import { getStarterId, getSettings, setSettings, resetAll, caughtCount } from '../game.js';
import * as quests from '../quests.js';
import * as music from '../music.js';
import { confetti, sparkleBurst, centerOf, haloRing, driftSparkles } from '../fx.js';

export function renderHome(_params, ctx) {
  const root = el('div', { class: 'scene home', style: { backgroundImage: "url('assets/screens/bg-lab.png')" } });
  music.play('home');

  // Cast: Dada (guide) + Mama (visual companion) + Alex's starter companion.
  const cast = el('div', { class: 'home__cast' },
    charImg('assets/characters/mama/mama-greeting.png', 'char char--mama'),
    charImg('assets/characters/dada/dada-greeting.png', 'char char--dada', 'Professor Dada'),
  );
  const starter = pokemonById(getStarterId());
  if (starter) {
    const comp = spriteImg(starter);
    comp.classList.add('home__companion');
    cast.append(comp);
  }

  const hello = el('div', { class: 'home__hello' }, `Hi ${PLAYER_NAME}!`);

  const menu = el('div', { class: 'home__menu' },
    el('button', { class: 'btn btn--big btn--catch', type: 'button', onClick: () => { audio.play(sfx.pop()); ctx.go('worldmap'); } },
      icon('catch', 'btn__icon'), 'Catch'),
    el('button', { class: 'btn btn--big btn--train', type: 'button', onClick: () => { audio.play(sfx.pop()); ctx.go('train'); } },
      icon('train', 'btn__icon'), 'Train'),
    el('button', { class: 'btn btn--big btn--battle', type: 'button', onClick: () => { audio.play(sfx.pop()); ctx.go('battle'); } },
      icon('battle', 'btn__icon'), 'Battle'),
    el('button', { class: 'btn btn--big btn--dex', type: 'button', onClick: () => { audio.play(sfx.pop()); ctx.go('pokedex'); } },
      icon('pokedex', 'btn__icon'), 'Pokédex'),
  );

  // Play & Learn corner — the standalone mini-games destination (grows over time).
  const playLearn = el('div', { class: 'home__playlearn' },
    el('button', { class: 'btn btn--big btn--games', type: 'button', onClick: () => { audio.play(sfx.pop()); ctx.go('games'); } },
      icon('games', 'btn__icon'), 'Play & Learn'));

  // If a quest finished during play, take it now (rolls a fresh one) so the
  // banner below advertises the NEW invitation, not the just-completed one.
  const completed = quests.takeCompleted();

  // Gentle quest — an invitation, tap to hear it or just ignore it. No pressure.
  const quest = quests.getActiveQuest();
  const speakQuest = () => {
    if (quest.kind === 'catch-in-zone') audio.play(clip.suggest(quest.zone));
    else if (quest.kind === 'evolve') audio.play(clip.questEvolve());
    else audio.play(clip.questCatch());
  };
  const questBanner = el('button', { class: 'quest-banner', type: 'button', 'aria-label': quest.prompt, onClick: () => { audio.play(sfx.pop()); speakQuest(); } },
    icon('quest', 'quest-banner__icon'),
    el('span', { class: 'quest-banner__text' }, quest.prompt));

  const stickerStrip = buildStickerStrip(root);
  const gear = buildGearAndPanel(root);

  root.append(cast, hello, questBanner, menu, playLearn, stickerStrip, gear);

  // Celebrate a completed quest (taken above) gently, on return.
  ctx.after(500, () => audio.play(clip.homeWelcome()));
  if (completed) {
    ctx.after(1400, () => { if (ctx.alive()) celebrateQuest(root, completed.reward); });
  } else {
    const sz = quests.questZoneSuggest(quest) || (ZONES.find((z) => z.suggested) || ZONES[0]).id;
    ctx.after(2400, () => audio.play(clip.suggest(sz)));
  }

  return root;
}

function celebrateQuest(root, reward) {
  confetti(root);
  audio.play(sfx.catch());
  audio.play(clip.praise(rnd(PRAISE_COUNT)));
  const overlay = el('div', { class: 'sticker-pop' },
    el('div', { class: 'sticker-pop__card' },
      el('div', { class: 'sticker-pop__badge' }, 'You earned a sticker!'),
      el('div', { class: 'sticker-pop__sticker' }, stickerImg(reward || 'assets/stickers/st-star.png')),
      el('button', { class: 'btn btn--big', type: 'button', onClick: () => overlay.remove() }, 'Yay!'),
    ));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  root.append(overlay);
  // a soft bloom + drift behind the sticker as it arrives (calm, reduced-motion-safe)
  requestAnimationFrame(() => {
    const card = overlay.querySelector('.sticker-pop__sticker');
    if (!card) return;
    const c = centerOf(card, root);
    haloRing(root, c.x, c.y, { size: 200, dur: 950 });
    driftSparkles(root, c.x, c.y, 7);
  });
}

function buildStickerStrip(root) {
  const stickers = quests.getStickers();
  const strip = el('button', { class: 'sticker-strip', type: 'button', 'aria-label': 'My stickers', onClick: () => openStickers(root) });
  strip.append(icon('stickers', 'sticker-strip__cap'));
  if (!stickers.length) strip.append(el('span', { class: 'sticker-strip__hint' }, 'Stickers'));
  else {
    stickers.slice(-6).forEach((s) => strip.append(stickerImg(s, 'sticker-strip__one')));
    if (stickers.length > 6) strip.append(el('span', { class: 'sticker-strip__more' }, `+${stickers.length - 6}`));
  }
  return strip;
}

function openStickers(root) {
  const stickers = quests.getStickers();
  const overlay = el('div', { class: 'panel-overlay' });
  const grid = el('div', { class: 'sticker-grid' });
  if (!stickers.length) grid.append(el('div', { class: 'sticker-grid__empty' }, 'Finish a quest to earn stickers!'));
  else stickers.forEach((s) => grid.append(stickerImg(s, 'sticker-grid__one')));
  overlay.append(el('div', { class: 'panel' }, el('h2', { class: 'panel__title' }, 'My Stickers'), grid,
    el('button', { class: 'btn', type: 'button', onClick: () => overlay.remove() }, 'Done')));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  root.append(overlay);
}

// Press-and-hold gear -> grown-up settings (volume, replay voice, reset).
function buildGearAndPanel(root) {
  const gear = el('button', { class: 'gear', type: 'button', 'aria-label': 'Grown-ups (hold)' }, icon('settings'));
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

    // Music — its own gentle level + mute (independent of Dada's voice, which it ducks under).
    const musicText = () => (s.musicMuted ? 'off' : `${Math.round((s.music ?? 0.5) * 100)}%`);
    const musicLabel = el('span', { class: 'panel__vol' }, musicText());
    const setMusic = (v) => { const n = Math.max(0, Math.min(1, +v.toFixed(2))); s.music = n; s.musicMuted = false; setSettings(s); music.setMuted(false); music.setVolume(n); musicLabel.textContent = musicText(); };
    const toggleMusicMute = () => { s.musicMuted = !s.musicMuted; setSettings(s); music.setMuted(s.musicMuted); musicLabel.textContent = musicText(); };

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
      el('div', { class: 'panel__row' }, el('span', {}, 'Music'),
        el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => setMusic((s.music ?? 0.5) - 0.2) }, '–'),
        musicLabel,
        el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => setMusic((s.music ?? 0.5) + 0.2) }, '+'),
        el('button', { class: 'btn btn--ghost', type: 'button', onClick: toggleMusicMute }, 'Mute'),
      ),
      el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => audio.play(clip.homeWelcome()) }, icon('replay'), ' Replay voice'),
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
