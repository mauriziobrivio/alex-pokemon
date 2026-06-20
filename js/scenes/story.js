// Story Mode — the Rainbow Wonder-Quest journey map (Part 3, Stage 1). The new
// front door: the world map IS the journey. Mama points (Dada narrates) at the
// next zone whose feather is still missing, but Alex taps ANY zone freely. A
// chapter zone → its learning activity (Stage 1: catch) → earns that zone's
// rainbow feather; the rainbow arc fills in. Free-play is one tap away ("Just
// explore") and completely unchanged. No locks, no fail, no fixed order.

import { el, charImg, icon, spriteImg } from '../ui.js';
import * as audio from '../audio.js';
import { clip } from '../voices.js';
import { sfx } from '../sfx.js';
import { ZONES, pokemonById } from '../data.js';
import { recordCatch } from '../game.js';
import * as story from '../story.js';
import { SPOTS } from './worldmap.js';
import { confetti, sparkleBurst, centerOf, haloRing, driftSparkles } from '../fx.js';
import * as music from '../music.js';

let storyGreeted = false; // the warm intro plays once per session

// The 7-band rainbow arc — outer (red) to inner (violet). Bands light up in
// proportion to feathers gathered; the rest wait as a faint promise.
const BANDS = ['#ff5a5a', '#ff9e3d', '#ffd83d', '#7ed957', '#4db5ff', '#5a6cff', '#b06cff'];
function rainbowArc() {
  const lit = Math.round((story.earnedCount() / story.totalChapters()) * BANDS.length);
  const arcs = BANDS.map((c, i) => {
    const r = 92 - i * 11;
    return `<path d="M ${100 - r} 100 A ${r} ${r} 0 0 1 ${100 + r} 100" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" opacity="${i < lit ? 1 : 0.12}"/>`;
  }).join('');
  return el('div', { class: 'story__rainbow', 'aria-label': `Rainbow: ${story.earnedCount()} of ${story.totalChapters()} feathers` },
    el('span', { class: 'story__rainbow-svg', 'aria-hidden': 'true',
      html: `<svg viewBox="0 0 200 104" width="100%" height="100%">${arcs}</svg>` }));
}

// A small feather marker on a chapter zone: a soft glowing one to find, or a
// bright earned one.
function feather(earned) {
  return el('span', { class: 'hotspot__feather' + (earned ? ' is-earned' : ''), 'aria-hidden': 'true',
    html: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M20 4C9 5 5 12 4 20l3-3c1 1 3 1 4 0 4-3 8-7 9-13z" fill="currentColor"/><path d="M7 17l5-5" stroke="rgba(255,255,255,0.85)" stroke-width="1.5" fill="none"/></svg>' });
}

export function renderStory(params, ctx) {
  const root = el('div', { class: 'scene story' });
  music.play('home');

  const map = el('div', { class: 'story__map', style: { backgroundImage: "url('assets/screens/screen-worldmap.png')" } });
  ZONES.forEach((z) => {
    const s = SPOTS[z.id] || { x: 50, y: 50 };
    const chap = story.isChapter(z.id);
    const got = story.hasFeather(z.id);
    const label = z.name + (chap ? (got ? ', feather found' : ', find the rainbow feather') : '');
    const spot = el('button', {
      class: `hotspot hotspot--${z.id}` + (chap && !got ? ' is-quest' : '') + (got ? ' has-feather' : ''),
      type: 'button', 'aria-label': label, style: { left: `${s.x}%`, top: `${s.y}%` },
      onClick: () => tapZone(z),
    },
      el('span', { class: 'hotspot__ring', 'aria-hidden': 'true' }),
      el('span', { class: 'hotspot__label' }, z.name));
    if (chap) spot.append(feather(got));
    map.append(spot);
  });

  const cast = el('div', { class: 'story__cast' },
    charImg('assets/characters/mama/mama-presenting.png', 'char char--mama', 'Mama'),
    charImg('assets/characters/dada/dada-presenting.png', 'char char--dada', 'Professor Dada'));

  const explore = el('button', { class: 'btn btn--ghost story__explore', type: 'button',
    onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, icon('catch'), ' Just explore');

  root.append(rainbowArc(), el('h1', { class: 'story__title' }, 'Rainbow Adventure'), map, cast, explore);

  function tapZone(z) {
    audio.play(sfx.pop());
    audio.speak(clip.zone(z.id));
    const chap = story.chapterFor(z.id);
    const questHere = chap && !story.hasFeather(z.id);
    ctx.after(380, () => {
      if (!ctx.alive()) return;
      // A quest zone starts its chapter's activity (→ feather). An already-earned
      // zone is free exploration — never a dead end. `from:'story'` only steers the
      // Back button home to the journey; it never changes the activity's behavior.
      if (questHere) startChapter(z.id, chap.kind);
      else ctx.go('catch', { zoneId: z.id, from: 'story' });
    });
  }

  // Each chapter routes to the activity Alex already knows, in Story mode (it
  // earns this zone's feather on success and returns to the journey).
  function startChapter(zone, kind) {
    if (kind === 'build-word') ctx.go('train', { story: true, zone, kind: 'build-word' });
    else if (kind === 'count') ctx.go('train', { story: true, zone, kind: 'count' });
    else if (kind === 'battle') ctx.go('battle', { story: true, zone });
    else ctx.go('catch', { zoneId: zone, story: true });
  }

  // Entry narration / set-piece. When every feather is home and the finale hasn't
  // played yet, the Ho-Oh reveal supersedes everything (once ever). Otherwise:
  // returning from a just-earned feather → celebrate + grow the rainbow; else the
  // once-per-session intro, then Mama gently points at what's next.
  const feathered = params && params.feathered;
  if (story.allChaptersDone() && !story.finaleSeen()) {
    ctx.after(feathered ? 1100 : 600, () => { if (ctx.alive()) showFinale(); });
  } else if (feathered) {
    ctx.after(450, () => { if (ctx.alive()) celebrate(); });
  } else {
    const next = story.nextChapterZone();
    if (!storyGreeted) {
      // One queued sequence → deterministic order (intro, THEN Mama points), no timer skew.
      ctx.after(500, () => (next ? audio.speakSequence([clip.storyIntro(), clip.suggest(next)]) : audio.speak(clip.storyMore())));
    } else if (next) {
      ctx.after(500, () => audio.speak(clip.suggest(next)));
    } else {
      ctx.after(500, () => audio.speak(clip.storyMore())); // rainbow complete (finale already seen)
    }
    storyGreeted = true;
  }

  function celebrate() {
    confetti(root);
    audio.play(sfx.catch());
    audio.speak(clip.featherFound());
    const rb = root.querySelector('.story__rainbow');
    if (rb) {
      const c = centerOf(rb, root);
      haloRing(root, c.x, c.y, { size: 240, color: 'rgba(255,243,176,0.85)', dur: 950 });
      driftSparkles(root, c.x, c.y, 9);
      rb.classList.add('is-growing');
    }
    const next = story.nextChapterZone();
    if (next) audio.speak(clip.suggest(next)); // (all-done is handled by the finale path above)
  }

  // The finale — a calm, wondrous reveal (never a battle, never scary): Ho-Oh
  // comes to the kind trainer who gathered every feather, and joins the Pokédex.
  function showFinale() {
    recordCatch(story.HOOH_ID); // met with joy, not caught in a ball
    story.markFinaleSeen();
    const hooh = pokemonById(story.HOOH_ID);
    const sprite = spriteImg(hooh); sprite.classList.add('finale__hooh');
    const overlay = el('div', { class: 'finale' },
      charImg('assets/screens/scene-finale-rainbow.png', 'finale__bg'), // bespoke art if dropped in; else the card's CSS rainbow carries it
      el('div', { class: 'finale__card' },
        rainbowArc(),
        sprite,
        el('div', { class: 'finale__title' }, hooh ? `${hooh.name} came to say hello!` : 'A beautiful friend has come!'),
        el('button', { class: 'btn btn--big', type: 'button', onClick: () => { audio.play(sfx.pop()); overlay.remove(); } }, 'Yay!'),
      ));
    root.append(overlay);
    audio.play(sfx.catch());
    audio.speak(clip.finale());
    requestAnimationFrame(() => {
      const c = centerOf(sprite, root);
      haloRing(root, c.x, c.y, { size: 320, color: 'rgba(255,224,106,0.9)', dur: 1100 });
      sparkleBurst(root, c.x, c.y, 22);
      driftSparkles(root, c.x, c.y, 12);
      confetti(root);
    });
  }

  return root;
}
