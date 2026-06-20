// Sound Match — phonological awareness. "Which two start the same?" Show three
// Pokémon; tap the two whose names begin with the target sound. Reuses the 19
// recorded phonemes + the name clips (NO new record items). Rides the letter
// Leitner. Errorless: the odd-one-out just dims; the matching pair always stays.

import { el, clear, spriteImg } from '../../ui.js';
import * as audio from '../../audio.js';
import { clip } from '../../voices.js';
import * as mastery from '../../mastery.js';
import { ROSTER, LETTER_SOUND } from '../../data.js';
import { isCaught } from '../../game.js';
import { gameShell, wrongTap, win, shuffle } from './_common.js';

const firstSound = (name) => { const c = (name[0] || '').toLowerCase(); return LETTER_SOUND[c] || c; };

// sound-key -> roster Pokémon whose name begins with that sound (built once).
const INDEX = (() => { const idx = {}; for (const p of ROSTER) { const s = firstSound(p.name); (idx[s] = idx[s] || []).push(p); } return idx; })();

export function renderSoundMatch(_params, ctx) {
  const { root, panel } = gameShell(ctx, 'game-soundmatch');
  let last = null;
  let token = 0;

  function pickLetter() {
    const unlocked = mastery.unlockedLetters();
    const ok = unlocked.filter((ch) => (INDEX[LETTER_SOUND[ch]] || []).length >= 2); // ≥2 starters for a pair
    if (!ok.length) return null;
    let t = mastery.pickLetterTarget(last);
    if (!ok.includes(t)) { const pool = ok.filter((c) => c !== last); t = (pool.length ? pool : ok)[Math.floor(Math.random() * (pool.length ? pool.length : ok.length))]; }
    return t;
  }

  function round() {
    const myToken = ++token;
    const target = pickLetter();
    clear(panel);
    if (!target) { panel.append(el('h2', { class: 'game__title' }, 'Catch more Pokémon to play this!')); ctx.after(450, () => { if (ctx.alive()) audio.speak(clip.questCatch()); }); return; } // audio-first even when empty
    last = target;
    const tSound = LETTER_SOUND[target];
    let firstTry = true;
    let busy = false;
    let matched = 0;

    // matching pair (prefer caught, so they're recognisable) + one different-sound distractor
    const starters = shuffle((INDEX[tSound] || []).slice()).sort((a, b) => (isCaught(b.id) ? 1 : 0) - (isCaught(a.id) ? 1 : 0));
    const pair = starters.slice(0, 2);
    const otherSounds = shuffle([...new Set(mastery.unlockedLetters().map((c) => LETTER_SOUND[c]))].filter((s) => s !== tSound));
    let distractor = null;
    for (const s of otherSounds) { const list = (INDEX[s] || []).filter((p) => !pair.includes(p)); if (list.length) { distractor = shuffle(list)[0]; break; } }
    const cards = shuffle([...pair, distractor].filter(Boolean));

    const speak = () => audio.playSequence([clip.whichStartSame(), clip.phoneme(target)]);
    const row = el('div', { class: 'soundmatch__cards' });
    cards.forEach((mon) => {
      const isMatch = firstSound(mon.name) === tSound;
      const card = el('button', { class: 'soundmatch__card', type: 'button', 'aria-label': mon.name });
      card.addEventListener('click', () => {
        if (busy || card.disabled || card.classList.contains('is-locked')) return;
        if (isMatch) {
          card.classList.add('is-locked');
          matched += 1;
          const readout = () => audio.playSequence([clip.name(mon.id), clip.phoneme(target)]);
          if (matched >= 2) { busy = true; win(root, ctx, { record: () => mastery.recordLetter(target, firstTry), next: round, say: readout }); }
          else readout();
        } else { firstTry = false; wrongTap(card, ctx, speak); }
      });
      card.append(spriteImg(mon), el('span', { class: 'soundmatch__name' }, mon.name));
      row.append(card);
    });
    panel.append(el('h2', { class: 'game__title' }, 'Sound Match'), row);

    ctx.after(450, () => { if (myToken === token) speak(); });
    const idle = () => ctx.after(7000, () => { if (myToken === token && !busy) { speak(); idle(); } });
    idle();
  }

  round();
  return root;
}
