// The Catch loop — the heart of Phase 1 (and the encode step of the spine).
//
// A wild Pokémon appears half-hidden. Dada asks (aloud) to tap a number; big
// numerals appear. Right tap -> throw, wobble x3, caught, sparkles, Dada cheers.
// Wrong tap -> errorless: a soft bounce, a gentle wiggle, distractors dim toward
// the answer, and Dada re-prompts. Every encounter ends in a catch.

import { el, clear, spriteImg, charImg } from '../ui.js';
import * as audio from '../audio.js';
import { clip, PRAISE_COUNT, CATCH_CHEER_COUNT, rnd } from '../voices.js';
import { sfx } from '../sfx.js';
import { isTeen, zoneById, zonePool } from '../data.js';
import * as mastery from '../mastery.js';
import { tenFrame } from '../tenframe.js';
import { isCaught, recordCatch } from '../game.js';
import { confetti, sparkleBurst, centerOf } from '../fx.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function renderCatch({ zoneId }, ctx) {
  const zone = zoneById(zoneId);
  const pool = zonePool(zone.id);

  const root = el('div', { class: 'scene catch', style: { backgroundImage: `url('${zone.background}')` } });
  const back = el('button', { class: 'btn btn--back', type: 'button', 'aria-label': 'Back to the map',
    onClick: () => { if (busy) return; audio.play(sfx.pop()); ctx.go('worldmap'); } }, '←');

  const stage = el('div', { class: 'catch__stage' });
  const wildSlot = el('div', { class: 'catch__wild' });
  const grass = el('div', { class: 'catch__grass', 'aria-hidden': 'true' });
  const ball = el('div', { class: 'catch__ball', 'aria-hidden': 'true' });
  const alex = charImg('assets/characters/alex/alex-ready.png', 'catch__alex');
  stage.append(wildSlot, grass, ball, alex);

  const tenframeSlot = el('div', { class: 'catch__tenframe' });
  const choicesRow = el('div', { class: 'catch__choices' });
  const tray = el('div', { class: 'catch__tray' }, tenframeSlot, choicesRow);

  root.append(back, stage, tray);

  let target = null;
  let pokemon = null;
  let firstTry = true;
  let busy = false;
  let tfEl = null;
  let repromptTimer = null;
  let idleTimer = null;

  function pickWild() {
    if (!pool.length) return null;
    const uncaught = pool.filter((p) => !isCaught(p.id));
    const bag = uncaught.length && Math.random() < 0.72 ? uncaught : pool;
    return bag[Math.floor(Math.random() * bag.length)];
  }

  function buildChoices(t, count) {
    const set = new Set([t]);
    const cands = [];
    if (t > 10) cands.push(t - 10);                  // the "ones" partner (14 vs 4)
    cands.push(t - 1, t + 1, t + 10, t - 2, t + 2, t - 3, t + 3);
    for (const c of cands) { if (c >= 1 && c <= 20 && c !== t) set.add(c); if (set.size >= count) break; }
    while (set.size < count) set.add(1 + Math.floor(Math.random() * 20));
    return shuffle([...set].slice(0, count));
  }

  function scheduleIdle() {
    clearTimeout(idleTimer);
    idleTimer = ctx.after(7000, () => {
      if (busy) return;
      speakPrompt();          // gently re-ask and re-show the scaffold
      if (tfEl) tfEl.classList.remove('is-faded');
      scheduleIdle();
    });
  }

  // Speak the prompt. For a teen with scaffold, follow with the isolated number
  // word so numeral + ten-frame + spoken quantity land together (the triple-code).
  function speakPrompt() {
    const level = mastery.scaffold(target);
    if (isTeen(target) && level !== 'bare') {
      audio.playSequence([clip.prompt(target), clip.number(target)]).then(() => {
        if (level === 'fade' && tfEl && ctx.alive()) ctx.after(700, () => tfEl.classList.add('is-faded'));
      });
    } else {
      audio.play(clip.prompt(target)).then(() => {
        if (mastery.scaffold(target) === 'fade' && tfEl && ctx.alive()) ctx.after(700, () => tfEl.classList.add('is-faded'));
      });
    }
  }

  function nextEncounter() {
    busy = false;
    firstTry = true;
    clearTimeout(repromptTimer);
    target = mastery.pickTarget(target);
    pokemon = pickWild();
    if (!pokemon) { ctx.go('worldmap'); return; } // empty pool guard (shouldn't happen)

    clear(wildSlot);
    wildSlot.append(spriteImg(pokemon));
    wildSlot.classList.remove('is-revealed');
    grass.classList.remove('is-parted');
    ball.classList.remove('is-thrown', 'is-wobbling', 'is-gone');
    alex.src = 'assets/characters/alex/alex-ready.png';

    const level = mastery.scaffold(target);
    clear(tenframeSlot);
    tfEl = null;
    if (isTeen(target) && level !== 'bare') {
      tfEl = tenFrame(target);
      tenframeSlot.append(tfEl);
    } else if (!isTeen(target) && level === 'fade') {
      tfEl = tenFrame(target);
      tfEl.classList.add('is-small');
      tenframeSlot.append(tfEl);
    }

    clear(choicesRow);
    const choices = buildChoices(target, mastery.choiceCount(target));
    choices.forEach((value) => {
      const btn = el('button', { class: 'numbtn', type: 'button', 'aria-label': `${value}`,
        onClick: () => onChoice(value, btn) }, String(value));
      choicesRow.append(btn);
    });

    ctx.after(350, speakPrompt);
    scheduleIdle();
  }

  function progressiveDim(except) {
    const live = [...choicesRow.children].filter((b) => !b.classList.contains('is-dimmed') && b.textContent !== String(target) && b !== except);
    if (live.length > 0) live[Math.floor(Math.random() * live.length)].classList.add('is-dimmed');
  }

  function onChoice(value, btn) {
    if (busy) return;
    scheduleIdle(); // any tap resets the idle re-prompt
    if (value === target) { success(); return; }
    // errorless wrong tap
    firstTry = false;
    audio.play(sfx.soft());
    btn.classList.add('is-wrong', 'is-dimmed');
    btn.addEventListener('animationend', () => btn.classList.remove('is-wrong'), { once: true });
    progressiveDim(btn);
    // debounce the re-prompt so mashing can't stack overlapping voice lines
    clearTimeout(repromptTimer);
    repromptTimer = ctx.after(550, () => audio.play(clip.reprompt(target)));
  }

  async function success() {
    if (busy) return;
    busy = true;
    clearTimeout(idleTimer);
    clearTimeout(repromptTimer);
    mastery.record(target, firstTry);
    [...choicesRow.children].forEach((b) => (b.disabled = true));

    grass.classList.add('is-parted');
    alex.src = 'assets/characters/alex/alex-throwing.png';
    audio.play(sfx.whoosh());
    ball.classList.add('is-thrown');
    await sleep(520);

    ball.classList.add('is-wobbling');
    for (let i = 0; i < 3; i++) { audio.play(sfx.wobble()); await sleep(320); }
    ball.classList.remove('is-wobbling');

    if (!ctx.alive()) return; // left mid-celebration — don't record or show

    audio.play(sfx.catch());
    ball.classList.add('is-gone');
    wildSlot.classList.add('is-revealed');
    const c = centerOf(wildSlot, root);
    sparkleBurst(root, c.x, c.y, 22);
    confetti(root);
    recordCatch(pokemon.id);

    audio.playSequence([clip.catchCheer(rnd(CATCH_CHEER_COUNT)), clip.name(pokemon.id)]);
    ctx.after(1700, () => audio.play(clip.praise(rnd(PRAISE_COUNT))));

    showCaughtCard();
  }

  function showCaughtCard() {
    const overlay = el('div', { class: 'caught' });
    const sprite = spriteImg(pokemon);
    sprite.classList.add('caught__sprite');
    const card = el('div', { class: 'caught__card' },
      el('div', { class: 'caught__badge' }, 'Caught!'),
      sprite,
      el('div', { class: 'caught__name' }, pokemon.name),
      el('div', { class: 'caught__actions' },
        el('button', { class: 'btn btn--big', type: 'button', onClick: () => { audio.play(sfx.pop()); overlay.remove(); nextEncounter(); } }, 'Keep going!'),
        el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, 'Home'),
      ),
    );
    overlay.append(card);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); nextEncounter(); } });
    root.append(overlay);
  }

  nextEncounter();
  return root;
}
