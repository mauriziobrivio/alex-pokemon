// Story Mode — the Rainbow Wonder-Quest journey map (Part 3, Stage 1). The new
// front door: the world map IS the journey. Mama points (Dada narrates) at the
// next zone whose feather is still missing, but Alex taps ANY zone freely. A
// chapter zone → its learning activity (Stage 1: catch) → earns that zone's
// rainbow feather; the rainbow arc fills in. Free-play is one tap away ("Just
// explore") and completely unchanged. No locks, no fail, no fixed order.

import { el, charImg, icon } from '../ui.js';
import * as audio from '../audio.js';
import { clip } from '../voices.js';
import { sfx } from '../sfx.js';
import { ZONES } from '../data.js';
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

  // Entry narration. Returning from a just-earned feather → celebrate + grow the
  // rainbow; otherwise the once-per-session intro, then Mama points at what's next.
  const feathered = params && params.feathered;
  if (feathered) {
    ctx.after(450, () => { if (ctx.alive()) celebrate(); });
  } else {
    const next = story.nextChapterZone();
    if (!storyGreeted) {
      // One queued sequence → deterministic order (intro, THEN Mama points), no timer skew.
      ctx.after(500, () => (next ? audio.speakSequence([clip.storyIntro(), clip.suggest(next)]) : audio.speak(clip.storyIntro())));
    } else if (next) {
      ctx.after(500, () => audio.speak(clip.suggest(next)));
    } else {
      ctx.after(500, () => audio.speak(clip.storyMore()));
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
    if (story.allChaptersDone()) audio.speak(clip.storyMore()); // Stage 1: graceful "more coming" (Stage 3 = Ho-Oh finale)
    else { const next = story.nextChapterZone(); if (next) audio.speak(clip.suggest(next)); }
  }

  return root;
}
