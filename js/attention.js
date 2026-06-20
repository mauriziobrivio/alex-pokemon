// Attentive timing (brief 016): every question is HEARD before it can be answered,
// and Alex can always hear it again. Audio-first, errorless, tap-only.
//
//  • gateAnswers — the answer area arrives a snappy beat AFTER the spoken prompt;
//    until then it's hidden + inert, so a reflex tap can't beat the question.
//  • replayButton — a friendly "hear it again" control that re-speaks the current
//    prompt through the single voice queue (so it never overlaps another line).

import { el, icon } from './ui.js';
import * as audio from './audio.js';
import { sfx } from './sfx.js';

// The ONE tunable: how long after a question appears its answers become tappable.
// Snappy (Alex is impatient) but long enough a reflex tap can't beat the prompt.
export const ANSWER_GATE_MS = 1000;

// Gate an answer container: hidden + inert until the prompt is heard, then it pops
// in and becomes tappable. Uses ctx.after, so it's epoch-safe (no-ops after a
// scene change). An early tap simply does nothing — never a wrong answer, no sound.
export function gateAnswers(container, ctx, ms = ANSWER_GATE_MS) {
  if (!container) return;
  container.classList.add('q-gate');
  ctx.after(ms, () => container.classList.add('q-ready'));
}

// A friendly "hear it again" button. `onReplay` re-speaks the CURRENT prompt
// (close over the live question, e.g. () => challenge.speak()); it routes through
// the voice queue (the mutex), so the replay never overlaps another line. A soft
// SFX gives the tap feedback.
export function replayButton(onReplay, className = '') {
  return el('button', { class: `btn replay-btn ${className}`.trim(), type: 'button', 'aria-label': 'Hear it again',
    onClick: () => { audio.play(sfx.pop()); if (onReplay) onReplay(); } }, icon('replay'));
}
