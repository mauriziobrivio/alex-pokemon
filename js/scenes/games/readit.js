// "Read it yourself" — the independent-reading milestone (Chapter Four, Part 1).
// THE moment the whole project is built toward: Alex sees a decodable word made of
// sounds he knows, recalls each sound HIMSELF (nothing pre-speaks — the support is
// now PULL: tap a letter to hear its sound, or "hear it again"), blends, and READS
// it. Then Dada erupts with the proudest celebration in the game. Errorless,
// audio-first, tap-only; surfaces only once he's ready (mastery-gated).

import { el, clear, prefersReducedMotion } from '../../ui.js';
import * as audio from '../../audio.js';
import { clip } from '../../voices.js';
import { sfx } from '../../sfx.js';
import { CVC_WORDS, wordBuildable, graphemes } from '../../data.js';
import * as mastery from '../../mastery.js';
import { getWords, recordWordRead, firstReadDone, markFirstReadDone } from '../../game.js';
import { confetti, sparkleBurst, centerOf, haloRing, driftSparkles } from '../../fx.js';
import { gameShell } from './_common.js';

// Words Alex can decode RIGHT NOW: every letter is "comfortable" (Box >= 2).
export const readableWords = () => { const ok = mastery.comfortableLetterSet(); return CVC_WORDS.filter((w) => wordBuildable(w, ok)); };
// Never push independence before he's ready: he must have BUILT enough words AND a
// decodable word must exist. The "Read It!" tile appears in the corner only when true.
export const READY_WORDS_BUILT = 4;
export const readyToRead = () => getWords().length >= READY_WORDS_BUILT && readableWords().length > 0;

export function renderReadIt(_params, ctx) {
  const { root, panel, setPrompt } = gameShell(ctx, 'game-readit');
  let last = null, token = 0;

  function round() {
    const myToken = ++token;
    const pool = readableWords();
    // Safety: only ever show a word Alex can decode. The corner tile is mastery-gated,
    // so this is normally non-empty; if ever reached un-gated, return gently (no
    // undecodable word, never stuck).
    if (!pool.length) { ctx.go('games'); return; }
    let word = pool[Math.floor(Math.random() * pool.length)];
    for (let g = 0; word === last && pool.length > 1 && g < 6; g++) word = pool[Math.floor(Math.random() * pool.length)];
    last = word;
    let busy = false;
    clear(panel);

    panel.append(el('h2', { class: 'game__title' }, 'Read it yourself!'));
    // the whole word, shown — each letter tappable to HEAR its sound (pull help, on demand)
    const wordRow = el('div', { class: 'readit__word' });
    graphemes(word).forEach((ch) => wordRow.append(el('button', { class: 'readit__letter' + (ch.length > 1 ? ' is-digraph' : ''), type: 'button', 'aria-label': ch,
      onClick: (e) => { if (busy) return; audio.play(sfx.pop()); audio.speak(clip.phoneme(ch)); e.currentTarget.classList.add('is-said'); } }, ch)));
    const readBtn = el('button', { class: 'btn btn--big readit__go', type: 'button', onClick: onRead }, 'Read it!');
    panel.append(wordRow, readBtn);

    // "hear it again" sounds the word out for him (the errorless help — never stuck);
    // it is PULL: nothing speaks the sounds unless he taps a letter or this button.
    setPrompt(() => audio.speakSequence(graphemes(word).map((ch) => clip.phoneme(ch)), 0.14));
    ctx.after(450, () => { if (myToken === token) audio.speak(clip.canYouRead()); }); // "Can you read this word?"

    function onRead() {
      if (busy) return;
      busy = true;
      readBtn.disabled = true;
      blendAndCelebrate(word, myToken);
    }
  }

  async function blendAndCelebrate(word, myToken) {
    const reduce = prefersReducedMotion();
    audio.play(sfx.pop());
    [...root.querySelectorAll('.readit__letter')].forEach((c) => c.classList.add('is-reading'));
    // confirm his read: sound the segments, then the whole word (Dada says it back)
    await audio.playSequence(graphemes(word).map((ch) => clip.phoneme(ch)), 0.14);
    if (!ctx.alive() || myToken !== token) return;
    await audio.speak(clip.word(word));
    if (!ctx.alive() || myToken !== token) return;

    // THE celebration — the proudest, biggest moment in the game (bigger than a catch).
    const first = !firstReadDone();
    recordWordRead(word);
    if (first) markFirstReadDone();
    const c = centerOf(panel, root);
    confetti(root);
    haloRing(root, c.x, c.y, { size: reduce ? 320 : 460, color: 'rgba(255,224,130,0.92)', dur: 1300 });
    sparkleBurst(root, c.x, c.y, reduce ? 16 : 34);
    driftSparkles(root, c.x, c.y, reduce ? 8 : 16);
    audio.play(sfx.catch());
    audio.speakSequence(first ? [clip.youRead(), clip.firstRead()] : [clip.youRead()]); // Dada erupts with pride
    showProud(word, first);
  }

  function showProud(word, first) {
    const overlay = el('div', { class: 'readit-proud' + (first ? ' is-first' : '') },
      el('div', { class: 'readit-proud__card' },
        el('div', { class: 'readit-proud__badge' }, first ? 'Your very first word!' : 'You read it!'),
        el('div', { class: 'readit-proud__word' }, word),
        el('div', { class: 'readit-proud__msg' }, "You're reading, Alex!"),
        el('button', { class: 'btn btn--big', type: 'button', onClick: () => { audio.play(sfx.pop()); audio.clearVoice(); overlay.remove(); round(); } }, 'Read another!'),
      ));
    root.append(overlay);
  }

  round();
  return root;
}
