// Pattern Play — complete-the-pattern. The one early-years pillar the corner was
// missing: spot the repeating unit and predict what continues (foundational maths
// logic, pure IB "thinker"). A row of bright Pokémon-world motifs repeats with the
// next slot empty; tap, from 2–3 big choices, the one that comes next — it SNAPS
// into place with a flourish. Tap-only, errorless, audio-first, NO score/timer:
// the reward is the click of the pattern completing. Difficulty ramps gently
// AB → AAB/ABB → ABC as he succeeds (a persistent, invisible win counter).

import { el, clear, stickerImg, prefersReducedMotion } from '../../ui.js';
import * as audio from '../../audio.js';
import { clip } from '../../voices.js';
import { sfx } from '../../sfx.js';
import { sparkleBurst, centerOf } from '../../fx.js';
import { getPatternWins, recordPatternWin } from '../../game.js';
import { earn } from '../../story.js';
import { gameShell, win, shuffle } from './_common.js';
import { gateAnswers } from '../../attention.js';

// Bright, distinct, on-style motifs (all precached stickers). Distinct shapes AND
// colours so the repeat reads instantly for a four-year-old.
const MOTIFS = [
  'assets/stickers/st-pokeball.png', 'assets/stickers/st-star.png',
  'assets/stickers/st-berry.png', 'assets/stickers/st-bolt.png',
  'assets/stickers/st-moon.png', 'assets/stickers/st-sunflower.png',
  'assets/stickers/st-rainbow.png', 'assets/stickers/st-balloon.png',
];

// Pattern units (letter slots → motifs). Period 2 (AB) or 3 (AAB/ABB/ABC).
const UNITS = { AB: ['A', 'B'], AAB: ['A', 'A', 'B'], ABB: ['A', 'B', 'B'], ABC: ['A', 'B', 'C'] };
// A calm ramp keyed to a simple persistent win counter: start with AB, then the
// period-3 repeats, then the three-motif ABC. Within a tier, types are random.
function unlockedTypes(wins) {
  if (wins >= 7) return ['AB', 'AAB', 'ABB', 'ABC'];
  if (wins >= 3) return ['AB', 'AAB', 'ABB'];
  return ['AB'];
}

export function renderPattern(params, ctx) {
  // As a Story chapter (arc 2's Pattern Play zones): one completed pattern IS the
  // goal — earn this zone's wish-star and return to the journey. Back goes there too.
  const story = params && params.story;
  const storyArc = (params && params.arc) || 'rainbow';
  const storyZone = params && params.zone;
  const { root, panel, setPrompt } = gameShell(ctx, 'game-pattern',
    story ? { onBack: () => ctx.go('story', { arc: storyArc }), backLabel: 'Back to the adventure' } : {});
  let lastType = null;
  let token = 0;

  function round() {
    const myToken = ++token;
    const types = unlockedTypes(getPatternWins());
    let type = types[Math.floor(Math.random() * types.length)];
    for (let g = 0; type === lastType && types.length > 1 && g < 6; g++) type = types[Math.floor(Math.random() * types.length)];
    lastType = type;

    const unitKeys = UNITS[type];
    const period = unitKeys.length;
    const distinct = new Set(unitKeys).size;                 // 2 or 3 motifs
    const motifs = shuffle([...MOTIFS]).slice(0, distinct);  // assign A,B,(C)
    const unit = unitKeys.map((k) => motifs['ABC'.indexOf(k)]);

    const filledLen = period === 2 ? 5 : 6;                  // the unit shown ~twice, then the gap
    const seq = Array.from({ length: filledLen }, (_, i) => unit[i % period]);
    const answer = unit[filledLen % period];                 // the next motif in the cycle

    // Inert test hook (mirrors catch/battle) — the live round's answer + state.
    if (typeof window !== 'undefined') window.__pattern = {
      type, period, answer, choices: [...motifs],
      get solved() { return !root.querySelector('.pattern__gap'); },
    };

    let firstTry = true, busy = false;
    clear(panel);
    panel.append(el('h2', { class: 'game__title' }, 'Pattern Play')); // decorative (grown-up label); the prompt is spoken

    const rowWrap = el('div', { class: 'pattern__rowwrap' });
    const rowEl = el('div', { class: 'pattern__row' });
    seq.forEach((src, i) => rowEl.append(el('div', { class: 'pattern__cell', style: { '--i': String(i % period) } }, stickerImg(src, 'pattern__motif'))));
    const gap = el('div', { class: 'pattern__cell pattern__gap', style: { '--i': String(filledLen % period) }, 'aria-label': 'what comes next' });
    rowEl.append(gap);
    rowWrap.append(rowEl);

    const choicesRow = el('div', { class: 'game__choices pattern__choices' });
    shuffle([...motifs]).forEach((src) => {
      const btn = el('button', { class: 'numbtn pattern__choice', type: 'button', 'aria-label': 'pattern piece', onClick: () => onPick(src, btn) }, stickerImg(src, 'pattern__motif'));
      choicesRow.append(btn);
    });
    panel.append(rowWrap, choicesRow);

    const speak = () => audio.speak(clip.whatsNext());
    setPrompt(speak); // "hear it again" re-asks

    function onPick(src, btn) {
      if (busy) return;
      if (src === answer) {
        busy = true;
        clear(gap); gap.classList.remove('pattern__gap'); gap.classList.add('is-snapped');
        gap.append(stickerImg(src, 'pattern__motif'));
        audio.play(sfx.pop());
        const c = centerOf(gap, root);
        sparkleBurst(root, c.x, c.y, 16);
        // record only FIRST-TRY successes toward the ramp (real pattern recognition).
        // A Story chapter: one completed pattern earns the wish-star and returns.
        const next = story ? () => { earn(storyArc, storyZone); ctx.go('story', { earned: storyZone, arc: storyArc }); } : round;
        win(root, ctx, { record: () => { if (firstTry) recordPatternWin(); }, next });
      } else {
        firstTry = false;
        audio.play(sfx.soft());
        btn.disabled = true;
        btn.classList.add('is-wrong', 'is-dimmed');
        btn.addEventListener('animationend', () => btn.classList.remove('is-wrong'), { once: true });
        hintRhythm();
        ctx.after(650, () => { if (myToken === token && !busy) speak(); }); // re-ask, answer always still reachable
      }
    }

    // Scaffold hint: the repeating unit pulses in a wave so Alex feels the rhythm.
    function hintRhythm() {
      if (prefersReducedMotion()) { rowEl.classList.add('is-hint-static'); ctx.after(1100, () => rowEl.classList.remove('is-hint-static')); return; }
      rowEl.classList.remove('is-hinting'); void rowEl.offsetWidth; rowEl.classList.add('is-hinting');
      ctx.after(1700, () => { if (ctx.alive()) rowEl.classList.remove('is-hinting'); });
    }

    gateAnswers(choicesRow, ctx); // choices arrive a beat after the prompt
    ctx.after(450, () => { if (myToken === token) speak(); });
    const idle = () => ctx.after(7000, () => { if (myToken === token && !busy) { speak(); idle(); } });
    idle();
  }

  round();
  return root;
}
