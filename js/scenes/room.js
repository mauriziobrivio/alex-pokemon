// "Alex's Room" (Chapter Four, Part 4) — a persistent, customizable home that is
// HIS. Grown from the Sticker-Scene engine (tap-to-place, %-coords, persistence),
// it adds three things a sandbox doesn't have: a real little room he decorates, a
// tray of EVERYTHING he's earned (his Pokémon, his stickers, his trophies/story
// keepsakes), and customization (wall / floor / rug / bed / curtains — tap to
// cycle). The richer he plays, the richer his room: rewards appear as he earns them.
//
// Non-negotiables held: tap-only (no drag) · errorless (no wrong placement; a soft
// two-tap "tidy up" only) · NO currency / shop / compulsion (everything earned or
// freely chosen; it never nags him back) · all-local · persists · reduced-motion
// (the global `* { animation: none }` stills the idles). Asset-light: a CSS room +
// existing sprites / stickers / trophy art, with an optional `assets/room/room-bg.png`
// backdrop drop-in the build layers in if present.

import { el, clear, icon, spriteImg, stickerImg, charImg } from '../ui.js';
import * as audio from '../audio.js';
import { sfx } from '../sfx.js';
import { pokemonById } from '../data.js';
import { getPokedex, getStarterId, getRoom, setRoom, firstReadDone, anyEvolved, caughtCount } from '../game.js';
import { getStickers } from '../quests.js';
import * as story from '../story.js';
import { sparkleBurst, centerOf } from '../fx.js';
import * as music from '../music.js';

// Customization palettes — warm, cozy, "Sunlit Storybook". Every choice is valid
// and free (tap to cycle); the first entry is the gentle default.
const WALLS = ['#cfeaf4', '#ffe1c4', '#dcf0c6', '#ece0ff', '#ffd9e2'];
const FLOORS = ['#e6c79c', '#cfa978', '#d7bfa0', '#c9b08a', '#b98c63'];
const RUGS = ['none', '#ff8fa3', '#8fcf5a', '#ffd54a', '#c79bff', '#7fc6e6'];
const BEDS = ['#ff8fa3', '#7fc6e6', '#8fcf5a', '#ffd54a', '#c79bff'];
const CURTAINS = ['#ffd54a', '#ff8fa3', '#7fc6e6', '#8fcf5a', '#c79bff'];
const PALETTES = { wall: WALLS, floor: FLOORS, rug: RUGS, bed: BEDS, curtain: CURTAINS };

// Trophies & story keepsakes — each appears in the tray ONLY once earned, so his
// room fills as he plays. Asset-light: each maps to existing reward art (a future
// `assets/room/trophy-<key>.png` drop-in can replace it). No currency, ever.
const TROPHIES = [
  { key: 'rainbow', when: () => story.finaleSeen('rainbow'), art: 'assets/stickers/st-rainbow.png', label: 'Rainbow trophy' },
  { key: 'wishstar', when: () => story.finaleSeen('wishstar'), art: 'assets/stickers/st-star.png', label: 'Wish-star trophy' },
  { key: 'savedada', when: () => story.finaleSeen('savedada'), art: 'assets/stickers/st-trophy.png', label: 'Saved-Dada keepsake' },
  { key: 'firstread', when: () => firstReadDone(), art: 'assets/stickers/st-medal.png', label: 'First word read' },
  { key: 'evolved', when: () => anyEvolved(), art: 'assets/stickers/st-bolt.png', label: 'Evolution memento' },
  { key: 'friends', when: () => caughtCount() >= 10, art: 'assets/stickers/st-badge.png', label: 'Lots of friends' },
];
const trophyByKey = (k) => TROPHIES.find((t) => t.key === k);
const earnedTrophies = () => TROPHIES.filter((t) => { try { return t.when(); } catch { return false; } });

let welcomed = false; // one gentle, wordless settle the first time this session (no nag)

export function renderRoom(_params, ctx) {
  const root = el('div', { class: 'scene game room' });
  music.play('home');
  const back = el('button', { class: 'btn btn--back', type: 'button', 'aria-label': 'Back home',
    onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, icon('back'));

  const room = getRoom();
  if (!Array.isArray(room.items)) room.items = []; // defensive: tolerate any malformed save
  for (const k of Object.keys(PALETTES)) if (typeof room[k] !== 'number' || room[k] < 0) room[k] = 0;

  let held = null; // { isNew, t, r } OR { isNew:false, item, elm }

  // ---- the room stage (CSS-drawn; the placed items live on top) ----
  const stage = el('div', { class: 'room__stage', 'aria-label': 'Your room — tap to place your things' });
  // optional bespoke backdrop drop-in (hidden if the file isn't there)
  stage.append(charImg('assets/room/room-bg.png', 'room__bg', ''));
  // the cozy furniture (decorative; he can place things anywhere, including on the shelf/bed)
  stage.append(
    el('div', { class: 'room__window' }, el('span', { class: 'room__curtain room__curtain--l' }), el('span', { class: 'room__curtain room__curtain--r' })),
    el('div', { class: 'room__shelf' }),
    el('div', { class: 'room__rug' }),
    el('div', { class: 'room__bed' }, el('span', { class: 'room__pillow' }), el('span', { class: 'room__sheet' })),
  );

  const applyLook = () => {
    stage.style.setProperty('--room-wall', WALLS[room.wall % WALLS.length]);
    stage.style.setProperty('--room-floor', FLOORS[room.floor % FLOORS.length]);
    const rug = RUGS[room.rug % RUGS.length];
    stage.style.setProperty('--room-rug', rug === 'none' ? 'transparent' : rug);
    stage.classList.toggle('room--norug', rug === 'none');
    stage.style.setProperty('--room-bed', BEDS[room.bed % BEDS.length]);
    stage.style.setProperty('--room-curtain', CURTAINS[room.curtain % CURTAINS.length]);
  };

  // ---- placed items ----
  function innerFor(item) {
    if (item.t === 'p') return spriteImg(pokemonById(item.r));
    if (item.t === 'r') { const t = trophyByKey(item.r); return stickerImg(t ? t.art : 'assets/stickers/st-star.png'); }
    return stickerImg(item.r);
  }
  function labelFor(item) {
    if (item.t === 'p') return (pokemonById(item.r) || {}).name || 'Pokémon';
    if (item.t === 'r') return (trophyByKey(item.r) || {}).label || 'keepsake';
    return 'sticker';
  }
  function elementFor(item) {
    const elm = el('button', { class: `room__item room__item--${item.t}`, type: 'button', 'aria-label': labelFor(item),
      style: { left: `${item.x}%`, top: `${item.y}%` } }, innerFor(item));
    elm.addEventListener('click', (ev) => {
      if (held) return; // already holding → let the tap bubble to the stage (drop here)
      ev.stopPropagation();
      pickUpPlaced(item, elm);
    });
    return elm;
  }
  function renderPlaced() {
    [...stage.querySelectorAll('.room__item')].forEach((n) => n.remove());
    room.items.forEach((item) => stage.append(elementFor(item)));
  }

  const setHolding = (on) => stage.classList.toggle('is-placing', on);
  function clearHeldHighlight() {
    [...tray.querySelectorAll('.is-picked')].forEach((n) => n.classList.remove('is-picked'));
    [...stage.querySelectorAll('.is-held')].forEach((n) => n.classList.remove('is-held'));
  }
  function pickFromTray(t, r, trayBtn) {
    clearHeldHighlight();
    held = { isNew: true, t, r };
    if (trayBtn) trayBtn.classList.add('is-picked');
    audio.play(sfx.pop());
    setHolding(true);
  }
  function pickUpPlaced(item, elm) {
    held = { isNew: false, item, elm };
    elm.classList.add('is-held', 'is-wiggle');
    audio.play(sfx.pop());
    elm.addEventListener('animationend', () => elm.classList.remove('is-wiggle'), { once: true });
    setHolding(true);
  }
  function popItem(elm) {
    elm.classList.remove('is-placed'); void elm.offsetWidth; elm.classList.add('is-placed');
    audio.play(sfx.sparkle());
    const c = centerOf(elm, root);
    sparkleBurst(root, c.x, c.y, 12);
  }
  function dropAt(xPct, yPct) {
    if (!held) return;
    if (held.isNew) {
      const item = { t: held.t, r: held.r, x: xPct, y: yPct };
      room.items.push(item);
      const elm = elementFor(item);
      stage.append(elm);
      popItem(elm);
    } else {
      held.item.x = xPct; held.item.y = yPct;
      held.elm.style.left = `${xPct}%`; held.elm.style.top = `${yPct}%`;
      held.elm.classList.remove('is-held');
      popItem(held.elm);
    }
    setRoom(room);
    held = null;
    clearHeldHighlight();
    setHolding(false);
  }
  stage.addEventListener('click', (e) => {
    if (!held) return;
    const rect = stage.getBoundingClientRect();
    const x = Math.max(4, Math.min(96, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(6, Math.min(94, ((e.clientY - rect.top) / rect.height) * 100));
    dropAt(x, y);
  });

  // ---- customization bar (tap a swatch to cycle; errorless, instant, persists) ----
  const swatches = el('div', { class: 'room__custom' });
  const CYCLERS = [
    { key: 'wall', label: 'Walls' }, { key: 'floor', label: 'Floor' }, { key: 'rug', label: 'Rug' },
    { key: 'bed', label: 'Bed' }, { key: 'curtain', label: 'Curtains' },
  ];
  CYCLERS.forEach(({ key, label }) => {
    const sw = el('button', { class: 'room__swatch', type: 'button', 'aria-label': label });
    const paintSwatch = () => {
      const v = PALETTES[key][room[key] % PALETTES[key].length];
      sw.style.background = v === 'none' ? 'repeating-linear-gradient(45deg, #eee, #eee 5px, #fff 5px, #fff 10px)' : v;
    };
    sw.append(el('span', { class: 'room__swatchlabel' }, label));
    sw.addEventListener('click', () => {
      audio.play(sfx.pop());
      room[key] = (room[key] + 1) % PALETTES[key].length;
      applyLook(); paintSwatch(); setRoom(room);
    });
    paintSwatch();
    swatches.append(sw);
  });

  // ---- "Tidy up" (soft two-tap; clears only PLACED things, never his colours) ----
  let confirmClear = false;
  const tidy = el('button', { class: 'btn btn--ghost room__tidy', type: 'button' }, 'Tidy up');
  tidy.addEventListener('click', () => {
    audio.play(sfx.pop());
    if (!confirmClear) { confirmClear = true; tidy.classList.add('is-danger'); tidy.textContent = 'Tap to clear'; return; }
    room.items = []; setRoom(room); renderPlaced();
    held = null; clearHeldHighlight(); setHolding(false);
    confirmClear = false; tidy.classList.remove('is-danger'); tidy.textContent = 'Tidy up';
  });
  root.addEventListener('click', (e) => { if (confirmClear && !tidy.contains(e.target)) { confirmClear = false; tidy.classList.remove('is-danger'); tidy.textContent = 'Tidy up'; } }, true);

  // ---- the tray: three picture tabs (My Pokémon / Stickers / Trophies) ----
  const caught = Object.keys(getPokedex()).map(Number).map(pokemonById).filter(Boolean);
  const stickers = [...new Set(getStickers())];
  const trophies = earnedTrophies();
  const trayItems = el('div', { class: 'room__trayitems' });
  let tab = 'p'; // start on his Pokémon — he always has at least his buddy, so it's instantly playable

  function fillTray() {
    clear(trayItems);
    if (tab === 'p') {
      if (!caught.length) { trayItems.append(emptyHint('catch', 'Catch a Pokémon to bring it home!')); return; }
      caught.forEach((p) => trayItems.append(trayBtn('p', p.id, p.name, spriteImg(p))));
    } else if (tab === 's') {
      if (!stickers.length) { trayItems.append(emptyHint('stickers', 'Earn stickers in quests, then decorate!')); return; }
      stickers.forEach((src) => trayItems.append(trayBtn('s', src, 'sticker', stickerImg(src))));
    } else {
      if (!trophies.length) { trayItems.append(emptyHint('star', 'Win adventures and read your first word — keepsakes appear here!')); return; }
      trophies.forEach((t) => trayItems.append(trayBtn('r', t.key, t.label, stickerImg(t.art))));
    }
  }
  function trayBtn(t, r, label, inner) {
    return el('button', { class: 'room__traybtn' + (t === 'r' ? ' room__traybtn--trophy' : ''), type: 'button', 'aria-label': label,
      onClick: (e) => pickFromTray(t, r, e.currentTarget) }, inner);
  }
  function emptyHint(ic, text) { return el('div', { class: 'room__empty' }, icon(ic, 'room__emptyicon'), el('span', {}, text)); }

  const tabs = el('div', { class: 'room__tabs' },
    tabBtn('p', 'My Pokémon', getStarterId() ? spriteImg(pokemonById(getStarterId())) : icon('pokedex')),
    tabBtn('s', 'Stickers', icon('stickers')),
    tabBtn('r', 'Trophies', stickerImg('assets/stickers/st-trophy.png')));
  function tabBtn(t, label, inner) {
    return el('button', { class: 'room__tab' + (t === tab ? ' is-active' : ''), type: 'button', 'aria-label': label, 'data-tab': t,
      onClick: () => selectTab(t) }, inner);
  }
  function selectTab(t) {
    audio.play(sfx.pop()); tab = t;
    [...tabs.children].forEach((c) => c.classList.toggle('is-active', c.getAttribute('data-tab') === t));
    fillTray();
  }
  const tray = el('div', { class: 'room__tray' }, tabs, trayItems);

  const toolbar = el('div', { class: 'room__toolbar' }, swatches, tidy);
  root.append(back, toolbar, stage, tray);
  applyLook();
  renderPlaced();
  fillTray();

  // a gentle, wordless arrival the first time this session (sparkle, no nag/voice)
  if (!welcomed) { welcomed = true; ctx.after(420, () => { if (ctx.alive()) { const c = centerOf(stage, root); sparkleBurst(root, c.x, c.y, 10); } }); }
  return root;
}
