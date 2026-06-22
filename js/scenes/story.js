// Story Mode — the front-door chooser + two kinds of journey:
//
//  • COLLECT-ARCS (rainbow, wishstar) — a board of zones, tap ANY in any order,
//    solve → a token meter fills (rainbow / constellation) → a wondrous finale.
//    Unchanged from brief 022/023 (byte-equivalent behavior).
//  • STORY QUEST (savedada, brief 026) — a TOLD tale along an ordered PATH: an
//    opening beat → pick a team of 3 → missions in sequence, each win playing a
//    full-screen story BEAT and inking the path onward, a difficulty curve that
//    climbs, type-strategy battles → a climax reunion + ending. The reusable
//    template for every future story.
//
// Free-play stays one tap away ("Just explore" on the chooser). Nothing fails or
// strands Alex; he advances at his pace across many short sittings (progress persists).

import { el, charImg, icon, spriteImg, prefersReducedMotion } from '../ui.js';
import * as audio from '../audio.js';
import { clip } from '../voices.js';
import { sfx } from '../sfx.js';
import { ZONES, pokemonById, zoneById } from '../data.js';
import { recordCatch, getPokedex } from '../game.js';
import { readyToRead } from './games/readit.js';
import * as story from '../story.js';
import { SPOTS } from './worldmap.js';
import { confetti, sparkleBurst, centerOf, haloRing, driftSparkles } from '../fx.js';
import * as music from '../music.js';

const greeted = {}; // per-arc: the warm intro plays once per session

// --- Arc 1 progress: the 7-band rainbow arc (outer red → inner violet) ---
const BANDS = ['#ff5a5a', '#ff9e3d', '#ffd83d', '#7ed957', '#4db5ff', '#5a6cff', '#b06cff'];
function rainbowArc(arcId) {
  const lit = Math.round((story.earnedCount(arcId) / story.totalChapters(arcId)) * BANDS.length);
  const arcs = BANDS.map((c, i) => {
    const r = 92 - i * 11;
    return `<path d="M ${100 - r} 100 A ${r} ${r} 0 0 1 ${100 + r} 100" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" opacity="${i < lit ? 1 : 0.12}"/>`;
  }).join('');
  return el('div', { class: 'story__rainbow', 'aria-label': `Rainbow: ${story.earnedCount(arcId)} of ${story.totalChapters(arcId)} feathers` },
    el('span', { class: 'story__rainbow-svg', 'aria-hidden': 'true',
      html: `<svg viewBox="0 0 200 104" width="100%" height="100%">${arcs}</svg>` }));
}

// --- Arc 2 progress: a constellation of golden wish-stars that fills as stars are
// earned — warm indigo night, glowing gold, never dark. ---
const CONSTELLATION = [
  { x: 24, y: 74 }, { x: 46, y: 52 }, { x: 66, y: 66 }, { x: 86, y: 42 }, { x: 104, y: 60 },
  { x: 120, y: 36 }, { x: 140, y: 56 }, { x: 160, y: 42 }, { x: 178, y: 64 }, { x: 100, y: 20 },
];
function constellation(arcId) {
  const earned = story.earnedCount(arcId);
  const total = story.totalChapters(arcId);
  const pts = CONSTELLATION.slice(0, total);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  const stars = pts.map((p, i) => {
    const lit = i < earned;
    return `<circle cx="${p.x}" cy="${p.y}" r="${lit ? 4.4 : 2.6}" fill="${lit ? '#ffe98a' : '#fff'}" opacity="${lit ? 1 : 0.32}"${lit ? ' filter="url(#wishglow)"' : ''}/>`;
  }).join('');
  return el('div', { class: 'story__constellation', 'aria-label': `Wish-stars: ${earned} of ${total}` },
    el('span', { class: 'story__constellation-svg', 'aria-hidden': 'true',
      html: `<svg viewBox="0 0 200 100" width="100%" height="100%"><defs><filter id="wishglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="${line}" fill="none" stroke="rgba(255,233,138,0.35)" stroke-width="1" stroke-dasharray="3 3"/>${stars}</svg>` }));
}

// Zone markers: a soft glowing one to find, or a bright earned one.
function feather(earned) {
  return el('span', { class: 'hotspot__feather' + (earned ? ' is-earned' : ''), 'aria-hidden': 'true',
    html: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M20 4C9 5 5 12 4 20l3-3c1 1 3 1 4 0 4-3 8-7 9-13z" fill="currentColor"/><path d="M7 17l5-5" stroke="rgba(255,255,255,0.85)" stroke-width="1.5" fill="none"/></svg>' });
}
function wishStar(earned) {
  return el('span', { class: 'hotspot__wishstar' + (earned ? ' is-earned' : ''), 'aria-hidden': 'true',
    html: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 2l2.6 6.3L21 9l-4.8 4.2L17.6 20 12 16.4 6.4 20l1.4-6.8L3 9l6.4-.7z" fill="currentColor"/></svg>' });
}

// --- Saving-Dada progress glyph (used on the chooser card): a trail of glowing
// word-stepping-stones toward Dada at the far end. ---
const STONES = [
  { x: 12, y: 78 }, { x: 30, y: 60 }, { x: 44, y: 74 }, { x: 60, y: 54 }, { x: 76, y: 66 },
  { x: 90, y: 46 }, { x: 106, y: 60 }, { x: 122, y: 42 }, { x: 138, y: 54 }, { x: 154, y: 38 },
];
function pathProgress(arcId) {
  const earned = story.earnedCount(arcId), total = story.totalChapters(arcId);
  const pts = STONES.slice(0, total);
  const near = total ? earned / total : 0;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  const stones = pts.map((p, i) => {
    const lit = i < earned;
    return `<circle cx="${p.x}" cy="${p.y}" r="${lit ? 4.6 : 3}" fill="${lit ? '#ffd86a' : '#fff'}" opacity="${lit ? 1 : 0.32}"${lit ? ' filter="url(#pathglow)"' : ''}/>`;
  }).join('');
  const dx = 176, dy = 30;
  const dada = `<g opacity="${(0.32 + near * 0.62).toFixed(2)}" filter="url(#pathglow)"><circle cx="${dx}" cy="${dy}" r="${(4 + near * 2).toFixed(1)}" fill="#ffe6a0"/><circle cx="${dx}" cy="${dy - 0.5}" r="2" fill="#8a6a3a"/></g>`;
  return el('div', { class: 'story__path', 'aria-label': `Dada's words: ${earned} of ${total} found` },
    el('span', { class: 'story__path-svg', 'aria-hidden': 'true',
      html: `<svg viewBox="0 0 190 92" width="100%" height="100%"><defs><filter id="pathglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="${line} L ${dx} ${dy}" fill="none" stroke="rgba(255,216,106,0.4)" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="3 3"/>${stones}${dada}</svg>` }));
}

// Per-arc view config — visuals/audio that differ between journeys.
const ARC_VIEW = {
  rainbow: {
    title: 'Rainbow Adventure', mapClass: '', progress: rainbowArc, marker: feather,
    findLabel: 'find the rainbow feather', gotLabel: 'feather found',
    haloColor: 'rgba(255,243,176,0.85)', finaleHalo: 'rgba(255,224,106,0.9)',
    clips: { intro: () => clip.storyIntro(), found: () => clip.featherFound(), more: () => clip.storyMore(), finale: () => clip.finale() },
    finaleReady: true, finaleArt: 'assets/screens/scene-finale-rainbow.png',
  },
  wishstar: {
    title: 'Wish-Star Journey', mapClass: 'story--twilight', progress: constellation, marker: wishStar,
    findLabel: 'find the wish-star', gotLabel: 'wish-star found',
    haloColor: 'rgba(180,200,255,0.9)', finaleHalo: 'rgba(255,236,150,0.92)',
    clips: { intro: () => clip.wishIntro(), found: () => clip.wishStarFound(), more: () => clip.wishMore(), finale: () => clip.jirachiFinale(), wish: () => clip.makeAWish() },
    finaleReady: true,
    finaleArt: 'assets/screens/scene-jirachi-finale.png',
  },
  savedada: {
    title: 'Save Professor Dada!', mapClass: 'story--journey', progress: pathProgress, marker: wordStone,
    haloColor: 'rgba(255,224,150,0.92)', finaleHalo: 'rgba(255,236,150,0.92)',
    type: 'quest',
  },
};
function wordStone(earned) {
  return el('span', { class: 'hotspot__wordstone' + (earned ? ' is-earned' : ''), 'aria-hidden': 'true',
    html: '<svg viewBox="0 0 24 24" width="100%" height="100%"><ellipse cx="12" cy="14" rx="9" ry="6" fill="currentColor"/><path d="M6.5 13.5c2.2-2 8.8-2 11 0" stroke="rgba(255,255,255,0.75)" stroke-width="1.2" fill="none"/></svg>' });
}

export function renderStory(params, ctx) {
  const arcId = params && params.arc;
  if (arcId && story.arcExists(arcId)) return story.isQuest(arcId) ? renderQuest(arcId, params, ctx) : renderJourney(arcId, params, ctx);
  return renderChooser(ctx);
}

// The front door: "Which adventure today?" — the headline quest + two collect-arcs,
// plus free-play one tap away. Optional drop-in card covers (cover-<arc>.png).
function renderChooser(ctx) {
  const root = el('div', { class: 'scene story story--chooser' });
  music.play('home');

  const card = (arcId, subtitle, preview, headline) => {
    const v = ARC_VIEW[arcId];
    const done = story.earnedCount(arcId), total = story.totalChapters(arcId);
    return el('button', { class: `adventure-card adventure-card--${arcId}` + (headline ? ' adventure-card--headline' : ''), type: 'button', 'aria-label': v.title,
      onClick: () => { audio.play(sfx.pop()); ctx.go('story', { arc: arcId }); } },
      charImg(`assets/screens/cover-${arcId}.png`, 'adventure-card__cover', ''), // optional drop-in cover (hides if absent)
      el('span', { class: 'adventure-card__art' }, preview),
      el('span', { class: 'adventure-card__title' }, v.title),
      el('span', { class: 'adventure-card__sub' }, subtitle),
      el('span', { class: 'adventure-card__count', 'aria-hidden': 'true' }, `${done} / ${total}`));
  };

  const explore = el('button', { class: 'btn btn--ghost story__explore', type: 'button',
    onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, icon('catch'), ' Just explore');

  root.append(
    el('h1', { class: 'story__title' }, 'Which adventure today?'),
    card('savedada', 'Bring Dad — and his voice — home', pathProgress('savedada'), true),
    el('div', { class: 'adventure-choices' },
      card('rainbow', 'A sunny rainbow quest', rainbowArc('rainbow')),
      card('wishstar', 'A starlit wish journey', constellation('wishstar'))),
    explore);
  ctx.after(450, () => { if (ctx.alive()) audio.speak(clip.chooseAdventure()); });
  return root;
}

// ====================================================================
// COLLECT-ARC journey (rainbow, wishstar) — the free "tap any zone" board.
// ====================================================================
function renderJourney(arcId, params, ctx) {
  const v = ARC_VIEW[arcId];
  const root = el('div', { class: `scene story ${v.mapClass}`.trim() });
  music.play('home');

  const map = el('div', { class: 'story__map', style: { backgroundImage: "url('assets/screens/screen-worldmap.png')" } });
  if (v.mapClass) map.append(el('span', { class: 'story__nightveil', 'aria-hidden': 'true' }));
  ZONES.forEach((z) => {
    const s = SPOTS[z.id] || { x: 50, y: 50 };
    const chap = story.isChapter(arcId, z.id);
    const got = story.hasEarned(arcId, z.id);
    const label = z.name + (chap ? (got ? `, ${v.gotLabel}` : `, ${v.findLabel}`) : '');
    const spot = el('button', {
      class: `hotspot hotspot--${z.id}` + (chap && !got ? ' is-quest' : '') + (got ? ' has-token' : ''),
      type: 'button', 'aria-label': label, style: { left: `${s.x}%`, top: `${s.y}%` },
      onClick: () => tapZone(z),
    },
      el('span', { class: 'hotspot__ring', 'aria-hidden': 'true' }),
      el('span', { class: 'hotspot__label' }, z.name));
    if (chap) spot.append(v.marker(got));
    map.append(spot);
  });

  const cast = el('div', { class: 'story__cast' },
    charImg('assets/characters/mama/mama-presenting.png', 'char char--mama', 'Mama'),
    charImg('assets/characters/dada/dada-presenting.png', 'char char--dada', 'Professor Dada'));

  const back = el('button', { class: 'btn btn--ghost story__explore', type: 'button',
    onClick: () => { audio.play(sfx.pop()); ctx.go('story'); } }, icon('back'), ' Adventures');

  root.append(v.progress(arcId), el('h1', { class: 'story__title' }, v.title), map, cast, back);

  function tapZone(z) {
    audio.play(sfx.pop());
    audio.speak(clip.zone(z.id));
    const chap = story.chapterFor(arcId, z.id);
    const questHere = chap && !story.hasEarned(arcId, z.id);
    ctx.after(380, () => {
      if (!ctx.alive()) return;
      if (questHere) startChapter(z.id, chap.kind);
      else ctx.go('catch', { zoneId: z.id, from: 'story', arc: arcId });
    });
  }

  function startChapter(zone, kind) {
    if (kind === 'build-word') ctx.go('train', { story: true, zone, kind: 'build-word', arc: arcId });
    else if (kind === 'count') ctx.go('train', { story: true, zone, kind: 'count', arc: arcId });
    else if (kind === 'battle') ctx.go('battle', { story: true, zone, arc: arcId });
    else if (kind === 'pattern') ctx.go('game-pattern', { story: true, zone, arc: arcId });
    else ctx.go('catch', { zoneId: zone, story: true, arc: arcId });
  }

  const earnedZone = params && params.earned;
  if (story.allChaptersDone(arcId) && v.finaleReady && !story.finaleSeen(arcId)) {
    ctx.after(earnedZone ? 1100 : 600, () => { if (ctx.alive()) showFinale(arcId, root, ctx); });
  } else if (earnedZone) {
    ctx.after(450, () => { if (ctx.alive()) celebrate(); });
  } else {
    const next = story.nextChapterZone(arcId);
    if (!greeted[arcId]) {
      ctx.after(500, () => (next ? audio.speakSequence([v.clips.intro(), clip.suggest(next)]) : audio.speak(v.clips.more())));
    } else if (next) {
      ctx.after(500, () => audio.speak(clip.suggest(next)));
    } else {
      ctx.after(500, () => audio.speak(v.clips.more()));
    }
    greeted[arcId] = true;
  }

  function celebrate() {
    confetti(root);
    audio.play(sfx.catch());
    audio.speak(v.clips.found());
    const prog = root.querySelector('.story__rainbow, .story__constellation');
    if (prog) {
      const c = centerOf(prog, root);
      haloRing(root, c.x, c.y, { size: 240, color: v.haloColor, dur: 950 });
      driftSparkles(root, c.x, c.y, 9);
      prog.classList.add('is-growing');
    }
    if (v.clips.wish) audio.speak(v.clips.wish());
    const next = story.nextChapterZone(arcId);
    if (next) audio.speak(clip.suggest(next));
  }

  return root;
}

// The collect-arc finale — a BIG, full-screen, wondrous reveal (brief 023). Never a
// battle, never scary. Reduced-motion → a calm, still, grand version.
function showFinale(arcId, root, ctx) {
  const v = ARC_VIEW[arcId];
  const fid = story.finaleId(arcId);
  recordCatch(fid);
  story.markFinaleSeen(arcId);
  const friend = pokemonById(fid);
  const reduce = prefersReducedMotion();

  const sprite = spriteImg(friend); sprite.classList.add('finale__friend');
  const stage = el('div', { class: 'finale__stage' },
    el('div', { class: 'finale__rays', 'aria-hidden': 'true' }),
    el('div', { class: 'finale__bloom', 'aria-hidden': 'true' }),
    el('div', { class: 'finale__arrive' }, sprite));
  const reveal = el('div', { class: 'finale__reveal' });
  const overlay = el('div', { class: `finale finale--${arcId}` + (reduce ? ' is-still' : '') },
    charImg(v.finaleArt, 'finale__bg'),
    stage, reveal);
  root.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-arriving'));

  audio.play(sfx.catch());
  audio.speakSequence([clip.name(fid), v.clips.finale()]);

  const burst = (sparkles, drift) => {
    if (!ctx.alive()) return;
    const c = centerOf(sprite, root);
    haloRing(root, c.x, c.y, { size: reduce ? 380 : 500, color: v.finaleHalo, dur: 1300 });
    sparkleBurst(root, c.x, c.y, sparkles);
    driftSparkles(root, c.x, c.y, drift);
  };
  const showReveal = () => {
    if (!ctx.alive()) return;
    overlay.classList.add('is-revealed');
    reveal.append(
      v.progress(arcId),
      el('div', { class: 'finale__title' }, friend ? `${friend.name} came to say hello!` : 'A beautiful friend has come!'),
      el('button', { class: 'btn btn--big', type: 'button', onClick: () => { audio.play(sfx.pop()); overlay.remove(); } }, 'Yay!'),
    );
  };

  if (reduce) { burst(14, 8); confetti(root); showReveal(); }
  else {
    ctx.after(450, () => burst(28, 14));
    ctx.after(1500, () => { burst(30, 16); confetti(root); });
    ctx.after(2400, () => burst(20, 12));
    ctx.after(2700, showReveal);
  }
}

// ====================================================================
// STORY QUEST (savedada, brief 026) — the ordered, told path.
// ====================================================================

// The route: 10 mission stops rising from home (lower-left) to the world's edge
// (upper-right). The inked path threads them in order; Dada waits at the far end.
const QUEST_PATH = [
  { x: 10, y: 82 }, { x: 19, y: 71 }, { x: 28, y: 79 }, { x: 38, y: 64 }, { x: 47, y: 72 },
  { x: 56, y: 56 }, { x: 65, y: 64 }, { x: 74, y: 48 }, { x: 83, y: 55 }, { x: 91, y: 37 },
];
const DADA_END = { x: 96, y: 25 };

// The drawn route SVG: a solid inked path through the completed stops, a faint
// dashed path for what's still ahead; Dada at the edge, brightening with progress.
function questPathSvg(arcId) {
  const done = story.nextMissionIndex(arcId);
  const total = story.chaptersOf(arcId).length;
  const pts = QUEST_PATH.slice(0, total).concat([DADA_END]);
  const seg = (a, b) => `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  // inked (lit) segments connect consecutive done stops, plus the one reaching the current
  const inked = pts.slice(0, Math.min(done + 1, pts.length)).map((p, i, arr) => i ? seg(arr[i - 1], p) : '').join(' ');
  const ahead = pts.map((p, i) => i ? seg(pts[i - 1], p) : '').join(' ');
  const near = total ? done / total : 0;
  const dada = `<g opacity="${(0.34 + near * 0.62).toFixed(2)}" filter="url(#qglow)"><circle cx="${DADA_END.x}" cy="${DADA_END.y}" r="${(2.6 + near * 1.4).toFixed(1)}" fill="#ffe6a0"/></g>`;
  return el('span', { class: 'story__route', 'aria-hidden': 'true',
    html: `<svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%"><defs><filter id="qglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="${ahead}" fill="none" stroke="rgba(255,216,106,0.28)" stroke-width="0.8" stroke-linecap="round" stroke-dasharray="2.4 2.4"/><path d="${inked}" fill="none" stroke="rgba(255,216,106,0.95)" stroke-width="1.4" stroke-linecap="round" filter="url(#qglow)"/>${dada}</svg>` });
}

function renderQuest(arcId, params, ctx) {
  const v = ARC_VIEW[arcId];
  const root = el('div', { class: `scene story story--quest ${v.mapClass}`.trim() });
  music.play('home');

  const map = el('div', { class: 'story__map', style: { backgroundImage: "url('assets/screens/screen-worldmap.png')" } });
  map.append(el('span', { class: 'story__journeyveil', 'aria-hidden': 'true' }), questPathSvg(arcId));

  const chapters = story.chaptersOf(arcId);
  chapters.forEach((m, i) => {
    const pos = QUEST_PATH[i] || { x: 50, y: 50 };
    const state = story.missionState(arcId, i); // done · current · locked
    const z = zoneById(m.zone) || { name: m.zone };
    const spot = el('button', {
      class: `quest-stop quest-stop--${state}`,
      type: 'button',
      'aria-label': `${z.name}${state === 'current' ? ', play this mission' : state === 'done' ? ', done' : ''}`,
      style: { left: `${pos.x}%`, top: `${pos.y}%` },
      onClick: () => tapStop(m, i, state),
    },
      el('span', { class: 'quest-stop__dot', 'aria-hidden': 'true' }, String(i + 1)),
      state === 'current' ? el('span', { class: 'quest-stop__pulse', 'aria-hidden': 'true' }) : null,
      el('span', { class: 'quest-stop__label' }, z.name));
    map.append(spot);
  });

  // the team of 3 travels along (shown in a corner)
  const team = story.getTeam(arcId);
  if (team.length) {
    const trav = el('div', { class: 'quest-team', 'aria-label': 'Your team' });
    team.forEach((id) => { const p = pokemonById(id); if (p) { const s = spriteImg(p); s.classList.add('quest-team__one'); trav.append(s); } });
    map.append(trav);
  }

  const cast = el('div', { class: 'story__cast' },
    charImg('assets/characters/mama/mama-presenting.png', 'char char--mama', 'Mama'));

  const back = el('button', { class: 'btn btn--ghost story__explore', type: 'button',
    onClick: () => { audio.play(sfx.pop()); ctx.go('story'); } }, icon('back'), ' Adventures');

  root.append(el('h1', { class: 'story__title' }, v.title), map, cast, back);

  // --- tapping a stop ---
  function tapStop(m, i, state) {
    audio.play(sfx.pop());
    if (state === 'current') {
      audio.speak(clip.zone(m.zone));
      ctx.after(360, () => { if (ctx.alive()) startMission(m); });
    } else if (state === 'done') {
      audio.speak(clip.word(m.word)); // a gentle review — Dada says the word found here (no re-earn)
    } else {
      const cur = story.currentMission(arcId); // a soft nudge toward the current mission — never a penalty
      if (cur) audio.speak(clip.suggest(cur.zone));
    }
  }

  // route the mission to its activity (in quest mode). Battles carry the team + tier
  // + foe type (type-strategy). Read-it falls back to build-word if he isn't ready
  // yet (never a dead-end).
  function startMission(m) {
    const common = { story: true, zone: m.zone, arc: arcId };
    if (m.kind === 'build-word') ctx.go('train', { ...common, kind: 'build-word' });
    else if (m.kind === 'count') ctx.go('train', { ...common, kind: 'count' });
    else if (m.kind === 'battle') ctx.go('battle', { ...common, quest: true, tier: m.tier || 1, foeType: m.foeType || null, team: story.getTeam(arcId) });
    else if (m.kind === 'readit') { if (readyToRead()) ctx.go('game-readit', { ...common }); else ctx.go('train', { ...common, kind: 'build-word' }); }
    else ctx.go('catch', { zoneId: m.zone, story: true, arc: arcId });
  }

  // --- entry / resume logic ---
  const earnedZone = params && params.earned;
  if (story.allChaptersDone(arcId) && !story.finaleSeen(arcId)) {
    ctx.after(earnedZone ? 900 : 600, () => { if (ctx.alive()) showReunion(arcId, root, ctx); }); // climax → ending
  } else if (!story.openingSeen(arcId) && !earnedZone) {
    ctx.after(450, () => { if (ctx.alive()) showOpening(arcId, root, ctx, afterOpening); });
  } else if (!story.hasTeam(arcId) && !earnedZone) {
    ctx.after(450, () => { if (ctx.alive()) afterOpening(); }); // resumed mid-setup: pick the team
  } else if (earnedZone) {
    ctx.after(450, () => { if (ctx.alive()) showBeat(earnedZone); }); // the story beat after the win → ink onward
  } else {
    const cur = story.currentMission(arcId);
    ctx.after(500, () => { if (ctx.alive() && cur) audio.speak(clip.suggest(cur.zone)); });
  }

  // After the opening: pick a team of 3 (or auto-fill if he has fewer than 3 caught).
  function afterOpening() {
    if (story.hasTeam(arcId)) { pointNext(); return; }
    const caught = Object.keys(getPokedex()).map(Number).filter((id) => pokemonById(id));
    if (caught.length >= 3) { pickTeam(); return; }
    // Fewer than 3 caught — bring what he has, with a warm word. Re-render to show the
    // team ONLY when there's actually one (an empty Pokédex must NOT ctx.go, or the
    // !hasTeam entry branch would re-fire afterOpening forever).
    story.setTeam(arcId, caught);
    audio.speak(clip.greatChoice());
    if (caught.length) ctx.go('story', { arc: arcId }); else pointNext();
  }

  // Tap three caught Pokémon to bring along (errorless: tap to toggle, up to 3).
  function pickTeam() {
    const caught = Object.keys(getPokedex()).map(Number).map(pokemonById).filter(Boolean);
    const chosen = [];
    const overlay = el('div', { class: 'panel-overlay team-pick' });
    const grid = el('div', { class: 'team-pick__grid' });
    const go = el('button', { class: 'btn btn--big team-pick__go', type: 'button', disabled: true,
      onClick: () => { if (chosen.length !== 3) return; audio.play(sfx.pop()); audio.speak(clip.greatChoice()); story.setTeam(arcId, chosen); overlay.remove(); ctx.go('story', { arc: arcId }); } }, "Let's go!"); // re-render the map with the team traveling along
    caught.forEach((p) => {
      const cell = el('button', { class: 'team-pick__cell', type: 'button', 'aria-label': p.name, onClick: () => toggle(p.id, cell) });
      cell.append(spriteImg(p), el('span', { class: 'team-pick__name' }, p.name));
      grid.append(cell);
    });
    function toggle(id, cell) {
      const at = chosen.indexOf(id);
      if (at >= 0) { chosen.splice(at, 1); cell.classList.remove('is-chosen'); }
      else { if (chosen.length >= 3) return; chosen.push(id); cell.classList.add('is-chosen'); }
      audio.play(sfx.pop());
      go.disabled = chosen.length !== 3;
      count.textContent = `${chosen.length} / 3`;
    }
    const count = el('span', { class: 'team-pick__count' }, '0 / 3');
    overlay.append(el('div', { class: 'panel team-pick__panel' },
      el('h2', { class: 'panel__title' }, 'Pick three friends!'), count, grid, go));
    // Always a way out (no-dead-end): tap the dark backdrop = "you choose for me" —
    // bring whatever's picked (or his first few caught), then onward. Also commits a
    // team so this never re-prompts in a loop.
    overlay.addEventListener('click', (e) => {
      if (e.target !== overlay) return;
      audio.play(sfx.pop());
      story.setTeam(arcId, chosen.length ? chosen : Object.keys(getPokedex()).map(Number).slice(0, 3));
      overlay.remove();
      ctx.go('story', { arc: arcId });
    });
    root.append(overlay);
    audio.speak(clip.pickTeam());
  }

  function pointNext() { const cur = story.currentMission(arcId); if (cur) ctx.after(300, () => { if (ctx.alive()) audio.speak(clip.suggest(cur.zone)); }); }

  // The story beat after a mission win (brief 027): a full-screen picture + Dada
  // (the storyteller, his voice growing) says the recovered word, then NARRATES the
  // moment — a person + a problem the activity just solved. Then the path inks on.
  function showBeat(zone) {
    const word = story.wordFor(arcId, zone);
    confetti(root); audio.play(sfx.catch());
    const prog = root.querySelector('.story__route');
    if (prog) { const c = centerOf(prog, root); haloRing(root, c.x, c.y, { size: 220, color: v.haloColor, dur: 900 }); driftSparkles(root, c.x, c.y, 8); }
    // mission 6 (grove, midpoint): recover the word + narrate Aurie joining, then the glimpse IS the beat
    if (story.midpointDue(arcId)) { audio.speakSequence([clip.word(word), clip.beat(zone)]); showGlimpse(arcId, root, ctx, pointNext); return; }
    // the cast in the picture: Mama + Alex, plus a grateful Charmander in the cave
    // beat when Alex has met one (his reading just relit its tail).
    const art = [
      { src: 'assets/characters/mama/mama-cheering.png', cls: 'cutscene__char--mama' },
      { src: 'assets/characters/alex/alex-cheering.png', cls: 'cutscene__char--alex' },
    ];
    if (zone === 'cave' && getPokedex()[4]) art.push({ src: 'sprites/4.png', cls: 'cutscene__char--mascot', alt: 'Charmander' });
    cutscene(root, ctx, {
      cls: 'cutscene--beat',
      bg: `assets/screens/scene-savedada-beat-${zone}.png`, // optional drop-in, named per zone; CSS gradient fallback
      art,
      title: story.beatOf(arcId, zone),
      lines: [() => clip.word(word), () => clip.beat(zone)], // the recovered word, then Dada narrates the moment
      cta: 'Onward!',
      onDone: pointNext,
    });
  }

  return root;
}

// ====================================================================
// Shared Saving-Dada set-pieces (cutscenes) — used by the quest path.
// ====================================================================

// A warm full-screen cutscene: optional drop-in backdrop + character art + narrated
// lines (audio-first) + an always-present continue button (tap-only, never a dead-
// end). Never scary.
function cutscene(root, ctx, { cls, bg, art, title, lines, cta, onDone }) {
  const overlay = el('div', { class: `cutscene ${cls || ''}`.trim() });
  if (bg) overlay.append(charImg(bg, 'cutscene__bg', ''));
  const stage = el('div', { class: 'cutscene__stage' },
    ...(art || []).map((a) => charImg(a.src, `cutscene__char ${a.cls || ''}`.trim(), a.alt || '')));
  const caption = el('div', { class: 'cutscene__caption' });
  if (title) caption.append(el('div', { class: 'cutscene__title' }, title));
  caption.append(el('button', { class: 'btn btn--big cutscene__cta', type: 'button',
    onClick: () => { audio.play(sfx.pop()); overlay.remove(); if (onDone) onDone(); } }, cta || 'Next'));
  overlay.append(stage, caption);
  root.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-in'));
  if (lines && lines.length) audio.speakSequence(lines.map((fn) => fn()));
  return overlay;
}

// The opening: a friendly lab whoosh swept Dada to the world's edge + scattered his
// words; his whisper calls Alex to the adventure. (Once; then team-pick.)
function showOpening(arcId, root, ctx, onDone) {
  story.markOpeningSeen(arcId);
  audio.play(sfx.sparkle());
  cutscene(root, ctx, {
    cls: 'cutscene--opening',
    bg: 'assets/screens/scene-saving-dada-opening.png',
    art: [
      { src: 'assets/characters/dada/dada-encouraging.png', cls: 'cutscene__char--far', alt: 'Professor Dada, far away' },
      { src: 'assets/characters/mama/mama-greeting.png', cls: 'cutscene__char--mama' },
      { src: 'assets/characters/alex/alex-ready.png', cls: 'cutscene__char--alex' },
    ],
    title: "Dada's words flew away!",
    lines: [() => clip.dadaCall()],
    cta: "Let's go find Dad!",
    onDone,
  });
}

// The middle turn (~halfway): Alex GLIMPSES Dada far across the world, waving; his
// voice is stronger now. Anticipation renews.
function showGlimpse(arcId, root, ctx, onDone) {
  story.markMidpointSeen(arcId);
  cutscene(root, ctx, {
    cls: 'cutscene--glimpse',
    art: [
      { src: 'assets/characters/dada/dada-encouraging.png', cls: 'cutscene__char--far', alt: 'Professor Dada, waving from afar' },
      { src: 'assets/characters/alex/alex-ready.png', cls: 'cutscene__char--alex' },
    ],
    title: 'I can see you, Alex!',
    lines: [() => clip.dadaGlimpse()],
    cta: 'Keep going!',
    onDone,
  });
}

// The climax: the last word ('dad') returned Dada's full voice — and Alex reaches
// him. The biggest, warmest moment. A bloom of warm light + abundant sparkles.
function showReunion(arcId, root, ctx) {
  const v = ARC_VIEW[arcId];
  story.markFinaleSeen(arcId);
  audio.play(sfx.catch());
  // the LAST recovered word ('dad') returns his full voice — say it back, then reunite
  const lastZone = (story.chaptersOf(arcId).slice(-1)[0] || {}).zone;
  const lastWord = lastZone ? story.wordFor(arcId, lastZone) : null;
  const overlay = cutscene(root, ctx, {
    cls: 'cutscene--reunion',
    bg: 'assets/screens/scene-saving-dada-reunion.png',
    art: [
      { src: 'assets/characters/dada/dada-cheering.png', cls: 'cutscene__char--reunion-dada', alt: 'Professor Dada' },
      { src: 'assets/characters/alex/alex-cheering.png', cls: 'cutscene__char--reunion-alex', alt: 'Alex' },
    ],
    title: 'You found Dad!',
    lines: lastWord ? [() => clip.word(lastWord), () => clip.dadaReunion()] : [() => clip.dadaReunion()],
    cta: 'Hooray!',
    onDone: () => showEnding(arcId, root, ctx),
  });
  const reduce = prefersReducedMotion();
  requestAnimationFrame(() => {
    const c = centerOf(overlay, root);
    haloRing(root, c.x, c.y, { size: reduce ? 360 : 520, color: v.finaleHalo, dur: 1300 });
    sparkleBurst(root, c.x, c.y, reduce ? 14 : 28);
    driftSparkles(root, c.x, c.y, reduce ? 8 : 16);
    confetti(root);
  });
}

// The ending: home together, his voice whole — "Now let me read to YOU." A cozy close.
function showEnding(arcId, root, ctx) {
  cutscene(root, ctx, {
    cls: 'cutscene--ending',
    art: [
      { src: 'assets/characters/dada/dada-presenting.png', cls: 'cutscene__char--cozy-dada', alt: 'Professor Dada' },
      { src: 'assets/characters/alex/alex-ready.png', cls: 'cutscene__char--cozy-alex', alt: 'Alex' },
    ],
    title: 'Home together',
    lines: [() => clip.dadaEnding()],
    cta: 'The End',
    onDone: () => {},
  });
}
