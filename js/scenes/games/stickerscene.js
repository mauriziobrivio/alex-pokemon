// The Sticker Scene (Phase 11, slice 2) — the CALM ROOM: a goalless, tap-only,
// errorless creative sandbox. Pick a backdrop, then place earned stickers and his
// caught Pokémon however he likes. No score, no timer, no finish line — it just
// persists, because a child's creation matters. (Realizes the TCG "display board".)
//
// Interaction (tap-only, the most forgiving): tap a tray item OR a placed item to
// PICK IT UP (a happy wiggle), then tap the canvas to DROP it there (pop + sparkle).
// Tapping a held item again drops it in place. Nothing here is ever wrong.

import { el, clear, icon, spriteImg, stickerImg } from '../../ui.js';
import * as audio from '../../audio.js';
import { sfx } from '../../sfx.js';
import { pokemonById, zoneById } from '../../data.js';
import { getPokedex, getStarterId, getBoard, setBoard } from '../../game.js';
import { getStickers } from '../../quests.js';
import { sparkleBurst, centerOf } from '../../fx.js';
import * as music from '../../music.js';

// Backdrops offered as PICTURES (no words): a warm plain board + a few habitats.
const BACKDROPS = ['board', 'meadow', 'beach', 'grove', 'snowfield'];
const bgImage = (bg) => (bg === 'board' ? null : (zoneById(bg) || {}).background);

export function renderStickers(_params, ctx) {
  const root = el('div', { class: 'scene game stickers' });
  music.play('home');
  const back = el('button', { class: 'btn btn--back', type: 'button', 'aria-label': 'Back to games',
    onClick: () => { audio.play(sfx.pop()); ctx.go('games'); } }, icon('back'));

  const board = getBoard();
  if (!Array.isArray(board.items)) board.items = []; // defensive: tolerate any malformed saved board
  if (!board.bg) board.bg = 'board';
  let held = null; // { isNew, t, r }  OR  { isNew:false, item, elm }

  // ---- the canvas (backdrop + placed items) ----
  const canvas = el('div', { class: 'sticker__canvas', 'aria-label': 'Your picture — tap to place' });
  const applyBg = (bg) => {
    board.bg = bg;
    canvas.classList.toggle('sticker__canvas--board', bg === 'board');
    canvas.style.backgroundImage = bgImage(bg) ? `url('${bgImage(bg)}')` : '';
  };

  function elementFor(item) {
    const inner = item.t === 'p' ? spriteImg(pokemonById(item.r)) : stickerImg(item.r);
    const elm = el('button', { class: 'sticker__item', type: 'button', 'aria-label': item.t === 'p' ? (pokemonById(item.r) || {}).name || 'Pokémon' : 'sticker',
      style: { left: `${item.x}%`, top: `${item.y}%` } }, inner);
    elm.addEventListener('click', (ev) => {
      if (held) return; // holding something → let the tap bubble to the canvas (drop here)
      ev.stopPropagation();
      pickUpPlaced(item, elm);
    });
    return elm;
  }

  function renderPlaced() {
    [...canvas.querySelectorAll('.sticker__item')].forEach((n) => n.remove());
    board.items.forEach((item) => canvas.append(elementFor(item)));
  }

  const setHolding = (on) => canvas.classList.toggle('is-placing', on);

  function pickFromTray(t, r, trayBtn) {
    clearHeldHighlight();
    held = { isNew: true, t, r };
    if (trayBtn) trayBtn.classList.add('is-picked');
    audio.play(sfx.pop());
    setHolding(true);
  }
  function pickUpPlaced(item, elm) {
    held = { isNew: false, item, elm };
    elm.classList.add('is-held');
    audio.play(sfx.pop());
    elm.classList.add('is-wiggle');
    elm.addEventListener('animationend', () => elm.classList.remove('is-wiggle'), { once: true });
    setHolding(true);
  }
  function clearHeldHighlight() {
    [...tray.querySelectorAll('.is-picked')].forEach((n) => n.classList.remove('is-picked'));
    [...canvas.querySelectorAll('.is-held')].forEach((n) => n.classList.remove('is-held'));
  }
  function dropAt(xPct, yPct) {
    if (!held) return;
    if (held.isNew) {
      const item = { t: held.t, r: held.r, x: xPct, y: yPct };
      board.items.push(item);
      const elm = elementFor(item);
      canvas.append(elm);
      popItem(elm);
    } else {
      held.item.x = xPct; held.item.y = yPct;
      held.elm.style.left = `${xPct}%`; held.elm.style.top = `${yPct}%`;
      held.elm.classList.remove('is-held');
      popItem(held.elm);
    }
    setBoard(board);
    held = null;
    clearHeldHighlight();
    setHolding(false);
  }
  function popItem(elm) {
    elm.classList.remove('is-placed'); void elm.offsetWidth; elm.classList.add('is-placed');
    audio.play(sfx.sparkle());
    const c = centerOf(elm, root);
    sparkleBurst(root, c.x, c.y, 12);
  }

  canvas.addEventListener('click', (e) => {
    if (!held) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(3, Math.min(97, ((e.clientY - rect.top) / rect.height) * 100));
    dropAt(x, y);
  });

  // ---- backdrop picker (pictures, no words) ----
  const bgRow = el('div', { class: 'sticker__backdrops' });
  BACKDROPS.forEach((bg) => {
    const thumb = el('button', { class: 'sticker__bgthumb' + (bg === 'board' ? ' sticker__bgthumb--board' : ''), type: 'button',
      'aria-label': bg === 'board' ? 'Plain board' : (zoneById(bg) || {}).name || bg,
      style: bgImage(bg) ? { backgroundImage: `url('${bgImage(bg)}')` } : {},
      onClick: () => { audio.play(sfx.pop()); applyBg(bg); setBoard(board); [...bgRow.children].forEach((c) => c.classList.toggle('is-active', c === thumb)); } });
    if (bg === board.bg) thumb.classList.add('is-active');
    bgRow.append(thumb);
  });

  // ---- "Start fresh" (soft two-tap confirm — never a shock) ----
  let confirmClear = false;
  const fresh = el('button', { class: 'btn btn--ghost sticker__fresh', type: 'button' }, 'Start fresh');
  fresh.addEventListener('click', () => {
    audio.play(sfx.pop());
    if (!confirmClear) { confirmClear = true; fresh.classList.add('is-danger'); fresh.textContent = 'Tap again to clear'; return; }
    board.items = []; setBoard(board); renderPlaced();
    held = null; clearHeldHighlight(); setHolding(false);
    confirmClear = false; fresh.classList.remove('is-danger'); fresh.textContent = 'Start fresh';
  });
  // any other tap cancels the pending clear (so it can't surprise him)
  root.addEventListener('click', (e) => { if (confirmClear && !fresh.contains(e.target)) { confirmClear = false; fresh.classList.remove('is-danger'); fresh.textContent = 'Start fresh'; } }, true);

  // ---- the tray: two picture tabs (Stickers / My Pokémon) ----
  const stickers = [...new Set(getStickers())]; // unique earned motifs
  const caught = Object.keys(getPokedex()).map(Number).map(pokemonById).filter(Boolean);
  const trayItems = el('div', { class: 'sticker__trayitems' });
  let tab = stickers.length ? 's' : 'p'; // start where there's something to place

  function fillTray() {
    clear(trayItems);
    if (tab === 's') {
      if (!stickers.length) { trayItems.append(el('div', { class: 'sticker__empty' }, icon('stickers', 'sticker__emptyicon'), el('span', {}, 'Earn stickers in quests — tap My Pokémon to play now!'))); return; }
      stickers.forEach((src) => {
        const b = el('button', { class: 'sticker__traybtn', type: 'button', 'aria-label': 'sticker', onClick: () => pickFromTray('s', src, b) }, stickerImg(src));
        trayItems.append(b);
      });
    } else {
      caught.forEach((p) => {
        const b = el('button', { class: 'sticker__traybtn', type: 'button', 'aria-label': p.name, onClick: () => pickFromTray('p', p.id, b) }, spriteImg(p));
        trayItems.append(b);
      });
    }
  }
  const tabs = el('div', { class: 'sticker__tabs' },
    el('button', { class: 'sticker__tab', type: 'button', 'aria-label': 'Stickers', onClick: () => selectTab('s') }, icon('stickers')),
    el('button', { class: 'sticker__tab', type: 'button', 'aria-label': 'My Pokémon', onClick: () => selectTab('p') }, getStarterId() ? spriteImg(pokemonById(getStarterId())) : icon('pokedex')));
  function selectTab(t) {
    audio.play(sfx.pop()); tab = t;
    [...tabs.children].forEach((c, i) => c.classList.toggle('is-active', (i === 0) === (t === 's')));
    fillTray();
  }
  [...tabs.children].forEach((c, i) => c.classList.toggle('is-active', (i === 0) === (tab === 's')));

  const tray = el('div', { class: 'sticker__tray' }, tabs, trayItems);

  const toolbar = el('div', { class: 'sticker__toolbar' }, bgRow, fresh);
  root.append(back, toolbar, canvas, tray);
  applyBg(board.bg || 'board');
  renderPlaced();
  fillTray();
  return root;
}
