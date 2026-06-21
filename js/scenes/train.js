// The Train ground — consolidate: production & repetition, no timers, no pressure.
// Pick a buddy, then build-a-word (blending made physical, tap-to-place) or
// count-&-feed berries. Every action fills the buddy's bond meter; a full meter
// triggers the evolution morph.
//
// In-scene navigation uses a `token`: any move (pick buddy / activity / Done)
// bumps it, so a just-finished activity's deferred success can't fire into the
// next view (no phantom bond, no surprise evolution, no null-buddy crash).

import { el, clear, spriteImg, icon } from '../ui.js';
import * as audio from '../audio.js';
import { clip, PRAISE_COUNT, rnd } from '../voices.js';
import { sfx } from '../sfx.js';
import { CVC_WORDS, wordBuildable, graphemes, isTeen, pokemonById, nextStageId, sameSound } from '../data.js';
import * as mastery from '../mastery.js';
import { tenFrame } from '../tenframe.js';
import { getPokedex, getBond, addBond, bondCost, recordWord, getStarterId } from '../game.js';
import { earn } from '../story.js';
import { canEvolve, triggerEvolution } from '../evolve.js';
import { sparkleBurst, centerOf } from '../fx.js';
import { replayButton } from '../attention.js';
import * as music from '../music.js';

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function renderTrain({ story, zone, kind, arc }, ctx) {
  const root = el('div', { class: 'scene train', style: { backgroundImage: "url('assets/backgrounds/bg-meadow.png')" } });
  const storyArc = arc || 'rainbow'; // which Story arc this chapter belongs to (token + return)
  const back = el('button', { class: 'btn btn--back', type: 'button', 'aria-label': story ? 'Back to the adventure' : 'Back home',
    onClick: () => { audio.play(sfx.pop()); ctx.go(story ? 'story' : 'home', story ? { arc: storyArc } : undefined); } }, icon('back'));
  const panel = el('div', { class: 'train__panel' });
  let currentSpeak = null; // the live activity's prompt, for "hear it again"
  root.append(back, panel, replayButton(() => { if (currentSpeak) currentSpeak(); }));
  music.play('home');

  let buddyId = null;
  let token = 0;          // any in-scene navigation bumps this
  let idleTimer = null;
  const bump = () => { token += 1; clearTimeout(idleTimer); return token; };

  function bondMeter() {
    if (!nextStageId(buddyId)) {
      // terminal stage — nothing to evolve into; a warm "best friends" badge, no fillable meter
      return el('div', { class: 'bondmeter bondmeter--max' }, el('span', { class: 'bondmeter__label' }, icon('bond', 'bondmeter__icon'), ' Best friends!'));
    }
    const cur = getBond(buddyId), cost = bondCost();
    return el('div', { class: 'bondmeter' },
      el('div', { class: 'bondmeter__track' }, el('div', { class: 'bondmeter__fill', style: { width: `${Math.min(100, (cur / cost) * 100)}%` } })),
      el('span', { class: 'bondmeter__label' }, icon('bond', 'bondmeter__icon'), ` ${Math.min(cur, cost)} / ${cost}`),
    );
  }

  function showBuddyPicker() {
    bump();
    buddyId = null;
    clear(panel);
    panel.append(el('h1', { class: 'train__title' }, 'Which buddy will you train?'));
    const grid = el('div', { class: 'train__buddies' });
    Object.keys(getPokedex()).map(Number).forEach((id) => {
      const p = pokemonById(id);
      if (!p) return;
      const cell = el('button', { class: 'buddy-cell', type: 'button', 'aria-label': p.name,
        onClick: () => { audio.play(sfx.pop()); buddyId = id; showActivityPicker(); } });
      cell.append(spriteImg(p), el('span', { class: 'buddy-cell__name' }, p.name));
      grid.append(cell);
    });
    panel.append(grid);
    currentSpeak = () => audio.speak(clip.pickBuddy());
    const myToken = token;
    ctx.after(400, () => { if (myToken === token) audio.speak(clip.pickBuddy()); });
  }

  function showActivityPicker() {
    bump();
    currentSpeak = null; // the activity picker has no spoken prompt
    const p = pokemonById(buddyId);
    if (!p) { showBuddyPicker(); return; }     // never render a null buddy
    clear(panel);
    panel.append(
      el('div', { class: 'train__buddy' }, spriteImg(p), el('div', { class: 'train__buddyname' }, p.name)),
      bondMeter(),
      el('div', { class: 'train__activities' },
        el('button', { class: 'btn btn--big btn--catch', type: 'button', onClick: () => { audio.play(sfx.pop()); startBuildWord(); } }, icon('build-word'), ' Build a word'),
        el('button', { class: 'btn btn--big btn--dex', type: 'button', onClick: () => { audio.play(sfx.pop()); startFeed(); } }, icon('feed'), ' Feed berries'),
      ),
      el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => showBuddyPicker() }, 'Pick another buddy'),
    );
  }

  function afterTrainSuccess() {
    // Story chapter: the activity IS the goal — earn this zone's token and return
    // to the journey (no bond/evolve detour mid-story).
    if (story) { earn(storyArc, zone); ctx.go('story', { earned: zone, arc: storyArc }); return; }
    if (nextStageId(buddyId)) {
      addBond(buddyId, 1);
      if (canEvolve(buddyId)) {
        triggerEvolution(root, ctx, buddyId, (evolvedId) => { buddyId = evolvedId; showActivityPicker(); });
        return;
      }
    }
    showActivityPicker(); // terminal buddies still get the per-activity reward, just no bond growth
  }

  // ---------- Build-a-word ----------
  function startBuildWord() {
    const myToken = bump();
    clear(panel);
    const unlocked = mastery.unlockedLetterSet();
    const buildable = CVC_WORDS.filter((w) => wordBuildable(w, unlocked));
    const word = buildable[Math.floor(Math.random() * buildable.length)] || 'sat';
    const letters = graphemes(word); // a digraph (sh/ch/th/ng) is ONE slot — one sound, two letters

    panel.append(el('h2', { class: 'train__title' }, 'Build a word!'));
    panel.append(el('div', { class: 'train__buddy train__buddy--small' }, spriteImg(pokemonById(buddyId))));

    const slotRow = el('div', { class: 'word-slots' });
    const slots = letters.map((ch) => el('div', { class: 'word-slot' + (ch.length > 1 ? ' is-digraph' : ''), dataset: { want: ch } }));
    slots.forEach((s) => slotRow.append(s));

    // distractor tiles: never a same-sound letter (so no "correct sound is wrong" trap)
    const distract = shuffle(mastery.unlockedLetters().filter((c) => !letters.includes(c) && !letters.some((l) => sameSound(l, c)))).slice(0, 2);
    let tiles = shuffle([...letters, ...distract]);
    const tileRow = el('div', { class: 'tile-row' });
    let nextIndex = 0;
    let locked = false;
    currentSpeak = () => { if (!locked && nextIndex < slots.length) audio.speak(clip.phoneme(slots[nextIndex].dataset.want)); }; // "hear it again" = the current sound

    function scheduleIdle() {
      clearTimeout(idleTimer);
      if (nextIndex >= slots.length) return;
      const want = slots[nextIndex].dataset.want;
      idleTimer = ctx.after(7000, () => { if (myToken === token && !locked) { audio.speak(clip.phoneme(want)); scheduleIdle(); } });
    }
    function activateSlot() {
      slots.forEach((s, i) => s.classList.toggle('is-active', i === nextIndex));
      if (nextIndex < slots.length) {
        const want = slots[nextIndex].dataset.want;
        ctx.after(300, () => { if (myToken === token) audio.speak(clip.phoneme(want)); });
        scheduleIdle();
      }
    }
    function renderTiles() {
      clear(tileRow);
      tiles.forEach((ch, idx) => {
        if (ch === null) { tileRow.append(el('div', { class: 'tile tile--used', 'aria-hidden': 'true' })); return; }
        tileRow.append(el('button', { class: 'tile' + (ch.length > 1 ? ' is-digraph' : ''), type: 'button', 'aria-label': ch, onClick: (e) => onTile(ch, idx, e.currentTarget) }, ch));
      });
    }
    function onTile(ch, idx, tile) {
      if (locked) return;
      clearTimeout(idleTimer);
      const want = slots[nextIndex].dataset.want;
      if (ch === want) {
        audio.play(sfx.pop());
        slots[nextIndex].textContent = ch;
        slots[nextIndex].classList.add('is-filled');
        audio.speak(clip.phoneme(ch));
        tiles[idx] = null; renderTiles();
        nextIndex += 1;
        if (nextIndex === slots.length) { locked = true; blendAndFinish(word, slots, myToken); }
        else activateSlot();
      } else {
        audio.play(sfx.soft());
        tile.classList.add('is-wrong');
        tile.addEventListener('animationend', () => tile.classList.remove('is-wrong'), { once: true });
        ctx.after(450, () => { if (!locked && myToken === token) audio.speak(clip.phoneme(want)); });
        scheduleIdle();
      }
    }

    renderTiles();
    panel.append(slotRow, tileRow, el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => (story ? ctx.go('story', { arc: storyArc }) : showActivityPicker()) }, 'Done'));
    ctx.after(400, () => { if (myToken === token) { audio.speak(clip.letsBuild()); ctx.after(900, activateSlot); } });
  }

  async function blendAndFinish(word, slots, myToken) {
    clearTimeout(idleTimer);
    recordWord(word); // add to his "My Words" wall (the moment the word is complete)
    slots.forEach((s) => s.classList.remove('is-active'));
    // segment (each sound, fully) then blend (the whole word) — duration-aware so phonemes don't smear
    await audio.playSequence(graphemes(word).map((g) => clip.phoneme(g)), 0.14);
    if (!ctx.alive() || myToken !== token) return;
    await audio.speak(clip.word(word));
    if (!ctx.alive() || myToken !== token) return;
    const c = centerOf(panel, root);
    sparkleBurst(root, c.x, c.y, 18);
    ctx.after(700, () => { if (myToken === token) audio.playSequence([clip.youTaught(), clip.name(buddyId), clip.word(word)]); });
    ctx.after(2600, () => { if (ctx.alive() && myToken === token) afterTrainSuccess(); });
  }

  // ---------- Count-&-feed (true counting: count the target out yourself) ----------
  // A scattered pile of MORE berries than needed appears; Alex counts them out one
  // at a time (each tap counted aloud), and must STOP at the target. Reaching it
  // auto-celebrates; tapping past is gently prevented — never "wrong". (One-to-one
  // correspondence + cardinality: knowing the last count means "how many" and when
  // to stop — the real, harder numeracy skill beyond bare recognition.)
  function startFeed() {
    const myToken = bump();
    clear(panel);
    const target = pickCountTarget();
    const pile = target + 3 + Math.floor(Math.random() * 3); // always MORE than needed (target+3..+5)
    let count = 0;
    let locked = false;
    let enoughSaid = false;
    currentSpeak = () => audio.playSequence([clip.feedBerries(), clip.number(target)]); // "hear it again"

    panel.append(el('h2', { class: 'train__title' }, 'Count the berries!'));
    panel.append(el('div', { class: 'feed-target' }, String(target)));
    if (isTeen(target)) panel.append(tenFrame(target));
    panel.append(el('div', { class: 'train__buddy train__buddy--small' }, spriteImg(pokemonById(buddyId))));

    const counter = el('div', { class: 'feed-counter' }, '0');
    const field = el('div', { class: 'berry-field' });
    for (let i = 0; i < pile; i++) {
      const b = el('button', { class: 'berry', type: 'button', 'aria-label': 'berry' });
      b.style.setProperty('--tilt', `${Math.floor(Math.random() * 31) - 15}deg`); // a pile, not a grid
      b.addEventListener('click', () => onBerry(b));
      field.append(b);
    }

    function scheduleIdle() {
      clearTimeout(idleTimer);
      idleTimer = ctx.after(7000, () => { if (myToken === token && !locked) { audio.playSequence([clip.feedBerries(), clip.number(target)]); scheduleIdle(); } });
    }
    function onBerry(b) {
      if (b.classList.contains('is-fed')) return; // already fed — ignore
      clearTimeout(idleTimer);

      // At/over the target — gently STOP. A tap past the target is kind, never a
      // scold: the warm line (once) + the spoken number ("That's enough — you
      // counted to sixteen!"), a tiny wobble, and NO berry consumed.
      if (locked || count >= target) {
        if (!enoughSaid) { enoughSaid = true; audio.play(sfx.soft()); audio.playSequence([clip.thatsEnough(), clip.number(target)]); }
        b.classList.add('berry--wobble');
        b.addEventListener('animationend', () => b.classList.remove('berry--wobble'), { once: true });
        return;
      }

      b.classList.add('is-fed'); // flies to the buddy (CSS)
      count += 1;
      audio.play(sfx.pop());
      audio.playExclusive(clip.number(count)); // count aloud, one at a time (no overlap on fast taps)
      counter.textContent = String(count);

      if (count === target) {
        locked = true; // freeze the field the moment we reach the target — the extra berries go inert
        const c = centerOf(field, root);
        sparkleBurst(root, c.x, c.y, 16);
        ctx.after(700, () => { if (myToken === token) audio.speak(clip.praise(rnd(PRAISE_COUNT))); });
        ctx.after(1600, () => { if (ctx.alive() && myToken === token) afterTrainSuccess(); });
      } else {
        scheduleIdle();
      }
    }

    panel.append(counter, field, el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => (story ? ctx.go('story', { arc: storyArc }) : showActivityPicker()) }, 'Done'));
    ctx.after(400, () => { if (myToken === token) audio.playSequence([clip.feedBerries(), clip.number(target)]); });
    scheduleIdle();
  }

  function pickCountTarget() {
    return Math.random() < 0.55 ? 11 + Math.floor(Math.random() * 10) : 3 + Math.floor(Math.random() * 8);
  }

  // Story chapter: skip the pickers — Alex's starter is the buddy and the chapter's
  // activity starts straight away. Free-play opens the buddy picker as always.
  if (story) { buddyId = getStarterId(); if (kind === 'count') startFeed(); else startBuildWord(); }
  else showBuddyPicker();
  return root;
}
