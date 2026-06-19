// The Catch loop — the encode step. Phase 2 interleaves two prompt types:
// number recognition (1–20, teen ten-frame) and letter-sounds (Jolly Phonics,
// "Which one says /sss/?"). Both are errorless and audio-first; every encounter
// ends in a catch. The shared throw/wobble/celebration is reused for both.

import { el, clear, spriteImg, charImg } from '../ui.js';
import * as audio from '../audio.js';
import { clip, PRAISE_COUNT, CATCH_CHEER_COUNT, rnd } from '../voices.js';
import { sfx } from '../sfx.js';
import { isTeen, zoneById, zonePool, sameSound } from '../data.js';
import * as mastery from '../mastery.js';
import { tenFrame } from '../tenframe.js';
import { isCaught, recordCatch } from '../game.js';
import * as quests from '../quests.js';
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

  let pokemon = null;
  let challenge = null;
  let firstTry = true;
  let busy = false;
  let tfEl = null;
  let repromptTimer = null;
  let idleTimer = null;
  let lastNumber = null;
  let lastLetter = null;

  function pickWild() {
    if (!pool.length) return null;
    const uncaught = pool.filter((p) => !isCaught(p.id));
    const bag = uncaught.length && Math.random() < 0.72 ? uncaught : pool;
    return bag[Math.floor(Math.random() * bag.length)];
  }

  function numberChoices(t, count) {
    const set = new Set([t]);
    const cands = [];
    if (t > 10) cands.push(t - 10);
    cands.push(t - 1, t + 1, t + 10, t - 2, t + 2, t - 3, t + 3);
    for (const c of cands) { if (c >= 1 && c <= 20 && c !== t) set.add(c); if (set.size >= count) break; }
    while (set.size < count) set.add(1 + Math.floor(Math.random() * 20));
    return shuffle([...set].slice(0, count));
  }

  function letterChoices(t, count) {
    const set = new Set([t]);
    // never offer a same-sound letter as a distractor (c/k both say /k/) — a
    // correct-sounding tap must never be the "wrong" answer.
    for (const c of shuffle(mastery.unlockedLetters().filter((c) => c !== t && !sameSound(c, t)))) { set.add(c); if (set.size >= count) break; }
    return shuffle([...set].slice(0, count));
  }

  // Build the next challenge — interleave numbers and (once unlocked) letters.
  function makeChallenge() {
    const canLetter = mastery.unlockedLetters().length >= 2;
    if (canLetter && Math.random() < 0.5) {
      const t = mastery.pickLetterTarget(lastLetter);
      lastLetter = t;
      return {
        kind: 'letter', target: t,
        choices: letterChoices(t, mastery.letterChoiceCount(t)),
        label: (v) => v,
        speak: () => audio.playSequence([clip.whichSays(), clip.phoneme(t)]),
        reprompt: () => audio.playSequence([clip.whichSays(), clip.phoneme(t)]),
        record: (ft) => mastery.recordLetter(t, ft),
        tenframe: null,
      };
    }
    const t = mastery.pickTarget(lastNumber);
    lastNumber = t;
    const level = mastery.scaffold(t);
    let tf = null;
    if (isTeen(t) && level !== 'bare') tf = tenFrame(t);
    else if (!isTeen(t) && level === 'fade') { tf = tenFrame(t); tf.classList.add('is-small'); }
    return {
      kind: 'number', target: t,
      choices: numberChoices(t, mastery.choiceCount(t)),
      label: (v) => String(v),
      speak: () => {
        const p = isTeen(t) && level !== 'bare' ? audio.playSequence([clip.prompt(t), clip.number(t)]) : audio.play(clip.prompt(t));
        p.then(() => { if (level === 'fade' && tf && ctx.alive()) ctx.after(700, () => tf.classList.add('is-faded')); });
      },
      reprompt: () => audio.play(clip.reprompt(t)),
      record: (ft) => mastery.record(t, ft),
      tenframe: tf,
    };
  }

  function scheduleIdle() {
    clearTimeout(idleTimer);
    idleTimer = ctx.after(7000, () => {
      if (busy) return;
      challenge.speak();
      if (tfEl) tfEl.classList.remove('is-faded');
      scheduleIdle();
    });
  }

  function nextEncounter() {
    busy = false;
    firstTry = true;
    clearTimeout(repromptTimer);
    pokemon = pickWild();
    if (!pokemon) { ctx.go('worldmap'); return; }
    challenge = makeChallenge();
    tfEl = challenge.tenframe;

    clear(wildSlot);
    wildSlot.append(spriteImg(pokemon));
    wildSlot.classList.remove('is-revealed');
    grass.classList.remove('is-parted');
    ball.classList.remove('is-thrown', 'is-wobbling', 'is-gone');
    alex.src = 'assets/characters/alex/alex-ready.png';

    clear(tenframeSlot);
    if (tfEl) tenframeSlot.append(tfEl);

    clear(choicesRow);
    challenge.choices.forEach((value) => {
      const btn = el('button', {
        class: 'numbtn' + (challenge.kind === 'letter' ? ' lettertile' : ''),
        type: 'button', 'aria-label': `${value}`,
        onClick: () => onChoice(value, btn),
      }, challenge.label(value));
      choicesRow.append(btn);
    });

    ctx.after(350, () => challenge.speak());
    scheduleIdle();
  }

  function progressiveDim(except) {
    const live = [...choicesRow.children].filter((b) => !b.classList.contains('is-dimmed') && b.textContent !== String(challenge.target) && b !== except);
    if (live.length > 0) live[Math.floor(Math.random() * live.length)].classList.add('is-dimmed');
  }

  function onChoice(value, btn) {
    if (busy) return;
    scheduleIdle();
    if (value === challenge.target) { success(); return; }
    firstTry = false;
    audio.play(sfx.soft());
    btn.classList.add('is-wrong', 'is-dimmed');
    btn.addEventListener('animationend', () => btn.classList.remove('is-wrong'), { once: true });
    progressiveDim(btn);
    clearTimeout(repromptTimer);
    repromptTimer = ctx.after(550, () => challenge.reprompt());
  }

  async function success() {
    if (busy) return;
    busy = true;
    clearTimeout(idleTimer);
    clearTimeout(repromptTimer);
    challenge.record(firstTry);
    [...choicesRow.children].forEach((b) => (b.disabled = true));

    grass.classList.add('is-parted');
    alex.src = 'assets/characters/alex/alex-throwing.png';
    audio.play(sfx.whoosh());
    ball.classList.add('is-thrown');
    await sleep(520);

    ball.classList.add('is-wobbling');
    for (let i = 0; i < 3; i++) { audio.play(sfx.wobble()); await sleep(320); }
    ball.classList.remove('is-wobbling');

    if (!ctx.alive()) return;

    audio.play(sfx.catch());
    ball.classList.add('is-gone');
    wildSlot.classList.add('is-revealed');
    const c = centerOf(wildSlot, root);
    sparkleBurst(root, c.x, c.y, 22);
    confetti(root);
    recordCatch(pokemon.id);
    quests.onCatch(zone.id); // passive quest progress (gentle, no pressure)

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
