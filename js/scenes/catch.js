// The Catch loop — the encode step. Phase 2 interleaves number recognition
// (1–20, teen ten-frame) and letter-sounds (Jolly Phonics). Phase 5 makes it
// deeper, within the refined errorless / no-shame, no-dead-end rule:
//   • a wrong tap removes ONLY that option (a narrowing hint) and re-prompts;
//   • a second wrong (rare) lets the wild gently HOP AWAY — warm, never sad —
//     and the next encounter begins right away (the wild isn't gone forever);
//   • a trip is a bounded ~10-encounter "outing" that ends in a happy soft-stop.
// Stakes stay kind: never the child's fault, never scary, never a dead end.

import { el, clear, spriteImg, charImg, icon } from '../ui.js';
import * as audio from '../audio.js';
import { clip, PRAISE_COUNT, CATCH_CHEER_COUNT, rnd } from '../voices.js';
import { sfx } from '../sfx.js';
import { isTeen, zoneById, spawnPool, sameSound, MISSES_TO_ESCAPE, OUTING_LENGTH } from '../data.js';
import * as mastery from '../mastery.js';
import { tenFrame } from '../tenframe.js';
import { isCaught, recordCatch, markFoil } from '../game.js';
import { openPack } from '../cards.js';
import { typeBadges } from '../typeicon.js';
import { earn } from '../story.js';
import * as quests from '../quests.js';
import * as music from '../music.js';
import { confetti, sparkleBurst, centerOf, haloRing } from '../fx.js';
import { gateAnswers, replayButton } from '../attention.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function renderCatch({ zoneId, story, from, arc }, ctx) {
  const zone = zoneById(zoneId);
  const pool = spawnPool(zone.id); // wild spawns exclude reserved legendaries (binder still shows them)
  music.playForZone(zone.id); // the zone's gentle bed (ducks under Dada)
  const storyArc = arc || 'rainbow'; // which Story arc this chapter belongs to (token + return)

  // "Back" returns wherever Alex came from: the Story journey (a chapter, or
  // free-explore launched from it) or the world map (free-play). Only the `story`
  // flag changes gameplay; `from`/`arc` are pure navigation hints.
  const backToStory = !!story || from === 'story';
  const root = el('div', { class: 'scene catch', style: { backgroundImage: `url('${zone.background}')` } });
  const back = el('button', { class: 'btn btn--back', type: 'button', 'aria-label': backToStory ? 'Back to the adventure' : 'Back to the map',
    onClick: () => { if (busy) return; audio.play(sfx.pop()); ctx.go(backToStory ? 'story' : 'worldmap', backToStory ? { arc: storyArc } : undefined); } }, icon('back'));

  // Outing progress cue — a calm row of pips that fill as encounters resolve.
  // Pacing & closure, never a stressful timer (no countdown, no numbers).
  const outingRow = el('div', { class: 'catch__outing', 'aria-hidden': 'true' });
  const pips = Array.from({ length: OUTING_LENGTH }, () => el('span', { class: 'catch__pip' }));
  pips.forEach((p) => outingRow.append(p));

  const stage = el('div', { class: 'catch__stage' });
  const wildSlot = el('div', { class: 'catch__wild' });
  const grass = el('div', { class: 'catch__grass', 'aria-hidden': 'true' });
  const ball = el('div', { class: 'catch__ball', 'aria-hidden': 'true' });
  const alex = charImg('assets/characters/alex/alex-ready.png', 'catch__alex');
  stage.append(wildSlot, grass, ball, alex);

  const tenframeSlot = el('div', { class: 'catch__tenframe' });
  const choicesRow = el('div', { class: 'catch__choices' });
  const tray = el('div', { class: 'catch__tray' }, tenframeSlot, choicesRow);
  // "Hear it again" re-speaks the current wild's prompt (and the phoneme for letters).
  root.append(back, outingRow, stage, tray, replayButton(() => { if (challenge) challenge.speak(); }));

  let pokemon = null;
  let challenge = null;
  let firstTry = true;
  let busy = false;
  let tfEl = null;
  let repromptTimer = null;
  let idleTimer = null;
  let lastNumber = null;
  let lastLetter = null;
  let misses = 0;                 // wrong taps this encounter (-> escape at MISSES_TO_ESCAPE)
  let encountersDone = 0;         // caught OR escaped, toward OUTING_LENGTH
  const outingCatches = [];       // ids caught this outing (for the soft-stop haul)
  let lastCatchPraised = false;   // praise is occasional — never two catches in a row

  const fillPips = () => pips.forEach((p, i) => p.classList.toggle('is-filled', i < encountersDone));

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
        const p = isTeen(t) && level !== 'bare' ? audio.playSequence([clip.prompt(t), clip.number(t)]) : audio.speak(clip.prompt(t));
        p.then(() => { if (level === 'fade' && tf && ctx.alive()) ctx.after(700, () => tf.classList.add('is-faded')); });
      },
      reprompt: () => audio.speak(clip.reprompt(t)),
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

  function startEncounter() {
    busy = false;
    firstTry = true;
    misses = 0;
    clearTimeout(repromptTimer);
    pokemon = pickWild();
    if (!pokemon) { ctx.go('worldmap'); return; }
    challenge = makeChallenge();
    tfEl = challenge.tenframe;

    clear(wildSlot);
    wildSlot.append(spriteImg(pokemon));
    wildSlot.classList.remove('is-revealed', 'is-escaping');
    grass.classList.remove('is-parted');
    ball.classList.remove('is-thrown', 'is-wobbling', 'is-gone');
    alex.src = 'assets/characters/alex/alex-ready.png';

    clear(tenframeSlot);
    if (tfEl) tenframeSlot.append(tfEl);

    clear(choicesRow);
    choicesRow.classList.remove('q-gate', 'q-ready'); // reset the gate for the new question
    challenge.choices.forEach((value) => {
      const btn = el('button', {
        class: 'numbtn' + (challenge.kind === 'letter' ? ' lettertile' : ''),
        type: 'button', 'aria-label': `${value}`,
        onClick: () => onChoice(value, btn),
      }, challenge.label(value));
      choicesRow.append(btn);
    });
    gateAnswers(choicesRow, ctx); // tappable only a beat after the prompt is heard

    ctx.after(450, () => challenge.speak()); // a calm beat before the prompt
    scheduleIdle();
  }

  function onChoice(value, btn) {
    if (busy) return;
    scheduleIdle();
    if (value === challenge.target) { success(); return; }
    // Wrong tap: remove ONLY this option (a narrowing hint) and re-prompt warmly.
    // No harsh sound, no red X — the answer is still right there, easier to find.
    firstTry = false;
    misses += 1;
    audio.play(sfx.soft());
    btn.disabled = true;
    btn.classList.add('is-wrong', 'is-dimmed');
    btn.addEventListener('animationend', () => btn.classList.remove('is-wrong'), { once: true });
    if (misses >= MISSES_TO_ESCAPE) { escape(); return; }
    clearTimeout(repromptTimer);
    repromptTimer = ctx.after(550, () => challenge.reprompt());
  }

  // Gentle escape — the only new "stake", and it must read as warm and matter-of-
  // fact: a little hop-away, a kind line, no fail sound, then another wild at once.
  async function escape() {
    if (busy) return;
    busy = true;
    clearTimeout(idleTimer);
    clearTimeout(repromptTimer);
    challenge.record(false);          // one gentle "needs practice" — no extra penalty, no scold
    [...choicesRow.children].forEach((b) => (b.disabled = true));
    audio.play(sfx.pop());            // soft & friendly — never a fail sound
    wildSlot.classList.add('is-escaping');
    await sleep(720);
    if (!ctx.alive()) return;
    audio.speak(clip.escape());        // "Aw, it hopped away! Here comes another!"
    encountersDone += 1;
    fillPips();
    ctx.after(1200, () => {
      if (!ctx.alive()) return;
      encountersDone >= OUTING_LENGTH ? showOutingEnd() : startEncounter();
    });
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
    haloRing(root, c.x, c.y, { size: 220, dur: 850 }); // soft bloom behind the reveal
    sparkleBurst(root, c.x, c.y, 18);
    confetti(root);
    const isNew = !isCaught(pokemon.id); // BEFORE recordCatch: first catch of this species?
    recordCatch(pokemon.id);
    if (firstTry) markFoil(pokemon.id); // earn the card's foil by a first-try catch — skill, never luck
    quests.onCatch(zone.id); // passive quest progress (gentle, no pressure)
    outingCatches.push(pokemon.id);
    encountersDone += 1;
    fillPips();

    // Always the informative "You caught {name}!"; praise is OCCASIONAL — a NEW
    // species, else ~1 in 4 — and never twice in a row, queued AFTER the name so
    // Dada never talks over himself (no overlap, no fixed timer).
    audio.speakSequence([clip.catchCheer(rnd(CATCH_CHEER_COUNT)), clip.name(pokemon.id)]);
    const praiseNow = (isNew || Math.random() < 0.25) && !lastCatchPraised;
    lastCatchPraised = praiseNow;
    if (praiseNow) audio.speak(clip.praise(rnd(PRAISE_COUNT)));

    showCaughtCard();
  }

  function showCaughtCard() {
    const last = encountersDone >= OUTING_LENGTH;
    const advance = () => { last ? showOutingEnd() : startEncounter(); };
    // Story chapter: one catch IS the goal — earn this zone's token and return to
    // the journey (the Pokémon is already recorded). Free-play: the usual outing.
    const toFeather = () => { earn(storyArc, zoneId); ctx.go('story', { earned: zoneId, arc: storyArc }); };
    const tokenCta = storyArc === 'wishstar' ? 'Find the wish-star!' : 'Find the rainbow feather!';
    const overlay = el('div', { class: 'caught' });
    const sprite = spriteImg(pokemon);
    sprite.classList.add('caught__sprite');
    const actions = story
      ? el('div', { class: 'caught__actions' },
          el('button', { class: 'btn btn--big', type: 'button', onClick: () => { audio.play(sfx.pop()); overlay.remove(); toFeather(); } }, tokenCta))
      : el('div', { class: 'caught__actions' },
          el('button', { class: 'btn btn--big', type: 'button', onClick: () => { audio.play(sfx.pop()); overlay.remove(); advance(); } }, last ? 'See who we met!' : 'Keep going!'),
          el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, 'Home'));
    const card = el('div', { class: 'caught__card' },
      el('div', { class: 'caught__badge' }, 'Caught!'),
      sprite,
      el('div', { class: 'caught__name' }, pokemon.name),
      typeBadges(pokemon.types, 'caught__types'), // its types as TCG-style symbols
      actions,
    );
    overlay.append(card);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); story ? toFeather() : advance(); } });
    root.append(overlay);
  }

  // The outing's warm soft-stop IS the earned pack-reveal ceremony (Phase 6):
  // the trip's haul flips into the binder as cards (the occasional earned foil
  // sparkles), then "Go again!" restarts at once — pacing & joy, never scarcity.
  function showOutingEnd() {
    clearTimeout(idleTimer);
    clearTimeout(repromptTimer);
    // In a Story chapter the first catch already earns the feather and leaves; the
    // only way here is an all-escaped outing (vanishingly rare) — return to the
    // journey gently (no empty pack, no dead end; the chapter can be retried).
    if (story) { ctx.go('story', { arc: storyArc }); return; }
    openPack(root, ctx, outingCatches, { onGoAgain: startNewOuting });
  }

  function startNewOuting() {
    encountersDone = 0;
    outingCatches.length = 0;
    fillPips();
    startEncounter();
  }

  // Inert test/debug hook (no gameplay effect, invisible to Alex): lets the
  // headless harness read live state to deterministically exercise catch vs.
  // the gentle escape and the bounded outing.
  if (typeof window !== 'undefined') {
    window.__catch = {
      get target() { return challenge && challenge.target; },
      get kind() { return challenge && challenge.kind; },
      get misses() { return misses; },
      get done() { return encountersDone; },
    };
  }

  startEncounter();
  return root;
}
