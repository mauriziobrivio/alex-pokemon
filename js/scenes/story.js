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
import { ZONES, pokemonById, zoneById, zoneExists } from '../data.js';
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
  return el('div', { class: 'story__path', 'aria-label': `Journey: ${earned} of ${total} stops` },
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
    // Beat art + narration (per-zone for this arc). `beatArt` is the FALLBACK cast
    // shown only when the bespoke full-bleed image is absent.
    beatImg: (s) => `assets/screens/scene-savedada-beat-${s}.png`,
    beatClip: (s) => clip.beat(s),
    beatArt: (zone) => {
      const a = [{ src: 'assets/characters/mama/mama-cheering.png', cls: 'cutscene__char--mama' },
                 { src: 'assets/characters/alex/alex-cheering.png', cls: 'cutscene__char--alex' }];
      if (zone === 'cave' && getPokedex()[4]) a.push({ src: 'sprites/4.png', cls: 'cutscene__char--mascot', alt: 'Charmander' });
      return a;
    },
    // The four set-piece cutscenes (opening · glimpse · reunion · ending), arc-scoped.
    cut: {
      opening: { bg: 'assets/screens/scene-saving-dada-opening.png', title: "Dada's words flew away!", cta: "Let's go find Dad!", line: () => clip.dadaCall(),
        art: [{ src: 'assets/characters/dada/dada-encouraging.png', cls: 'cutscene__char--far', alt: 'Professor Dada, far away' },
              { src: 'assets/characters/mama/mama-greeting.png', cls: 'cutscene__char--mama' },
              { src: 'assets/characters/alex/alex-ready.png', cls: 'cutscene__char--alex' }] },
      glimpse: { title: 'I can see you, Alex!', cta: 'Keep going!', line: () => clip.dadaGlimpse(),
        art: [{ src: 'assets/characters/dada/dada-encouraging.png', cls: 'cutscene__char--far', alt: 'Professor Dada, waving from afar' },
              { src: 'assets/characters/alex/alex-ready.png', cls: 'cutscene__char--alex' }] },
      reunion: { bg: 'assets/screens/scene-saving-dada-reunion.png', title: 'You found Dad!', cta: 'Hooray!', line: () => clip.dadaReunion(),
        art: [{ src: 'assets/characters/dada/dada-cheering.png', cls: 'cutscene__char--reunion-dada', alt: 'Professor Dada' },
              { src: 'assets/characters/alex/alex-cheering.png', cls: 'cutscene__char--reunion-alex', alt: 'Alex' }] },
      ending: { title: 'Home together', cta: 'The End', line: () => clip.dadaEnding(),
        art: [{ src: 'assets/characters/dada/dada-presenting.png', cls: 'cutscene__char--cozy-dada', alt: 'Professor Dada' },
              { src: 'assets/characters/alex/alex-ready.png', cls: 'cutscene__char--cozy-alex', alt: 'Alex' }] },
    },
  },
  // "Save Mama!" — Story Quest #2 (brief 029). Mirrors savedada with its OWN cover,
  // beat-image prefix (scene-savemama-beat-<slug>), arc-scoped beat narration
  // (clip.mamaBeat), and four cutscenes (Aunt Kaitlin comes → glimpse Mama ahead →
  // Mama's arms → home together). Mama/Kaitlin live in the bespoke art; the PNG cast
  // is just the graceful fallback (Mama is ABSENT until the reunion, so beats fall
  // back to Alex alone).
  savemama: {
    title: 'Save Mama!', mapClass: 'story--journey', progress: pathProgress, marker: wordStone,
    haloColor: 'rgba(255,205,222,0.92)', finaleHalo: 'rgba(255,224,150,0.92)',
    type: 'quest',
    beatImg: (s) => `assets/screens/scene-savemama-beat-${s}.png`,
    beatClip: (s) => clip.mamaBeat(s),
    beatArt: () => [{ src: 'assets/characters/alex/alex-cheering.png', cls: 'cutscene__char--alex' }], // Mama's ahead; Alex carries the fallback
    cut: {
      opening: { bg: 'assets/screens/scene-saving-mama-opening.png', title: 'Off to find Mama!', cta: "Let's follow her home!", line: () => clip.mamaOpening(),
        art: [{ src: 'assets/characters/alex/alex-ready.png', cls: 'cutscene__char--alex' }] },
      glimpse: { title: 'There she is — Mama!', cta: 'Almost there!', line: () => clip.mamaGlimpse(),
        art: [{ src: 'assets/characters/mama/mama-greeting.png', cls: 'cutscene__char--far', alt: 'Mama, waving from afar' },
              { src: 'assets/characters/alex/alex-ready.png', cls: 'cutscene__char--alex' }] },
      reunion: { bg: 'assets/screens/scene-saving-mama-reunion.png', title: "Mama's arms!", cta: 'Hooray!', line: () => clip.mamaReunion(),
        art: [{ src: 'assets/characters/mama/mama-cheering.png', cls: 'cutscene__char--reunion-dada', alt: 'Mama' },
              { src: 'assets/characters/alex/alex-cheering.png', cls: 'cutscene__char--reunion-alex', alt: 'Alex' }] },
      ending: { title: 'Home together', cta: 'The End', line: () => clip.mamaEnding(),
        art: [{ src: 'assets/characters/mama/mama-presenting.png', cls: 'cutscene__char--cozy-dada', alt: 'Mama' },
              { src: 'assets/characters/alex/alex-ready.png', cls: 'cutscene__char--cozy-alex', alt: 'Alex' }] },
    },
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
    const cover = charImg(`assets/screens/cover-${arcId}.png`, 'adventure-card__cover', ''); // optional drop-in cover (hides if absent)
    const btn = el('button', { class: `adventure-card adventure-card--${arcId}` + (headline ? ' adventure-card--headline' : ''), type: 'button', 'aria-label': v.title,
      onClick: () => { audio.play(sfx.pop()); ctx.go('story', { arc: arcId }); } },
      cover,
      el('span', { class: 'adventure-card__art' }, preview),
      el('span', { class: 'adventure-card__title' }, v.title),
      el('span', { class: 'adventure-card__sub' }, subtitle),
      el('span', { class: 'adventure-card__count', 'aria-hidden': 'true' }, `${done} / ${total}`));
    // when the cover art loads, it becomes the card's backdrop (the gradient + glyph are the fallback)
    cover.addEventListener('load', () => btn.classList.add('has-cover'));
    return btn;
  };

  const explore = el('button', { class: 'btn btn--ghost story__explore', type: 'button',
    onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, icon('catch'), ' Just explore');

  root.append(
    el('h1', { class: 'story__title' }, 'Which adventure today?'),
    // the two rescue Story Quests — peers, both headline (brief 029)
    el('div', { class: 'adventure-choices adventure-choices--quests' },
      card('savedada', 'Bring Dad — and his voice — home', pathProgress('savedada'), true),
      card('savemama', "Follow Mama's kindness home", pathProgress('savemama'), true)),
    el('div', { class: 'adventure-choices' },
      card('rainbow', 'A sunny rainbow quest', rainbowArc('rainbow')),
      card('wishstar', 'A starlit wish journey', constellation('wishstar'))),
    explore);
  ctx.after(450, () => { if (ctx.alive()) audio.speak(clip.chooseAdventure()); });
  return root;
}

// "Play it again!" — restart a COMPLETED adventure from the very beginning (brief 028).
// `resetQuestProgress` clears ONLY this arc's earned set + team + opening/midpoint/
// finale flags — the Pokédex, bonds, foils, stickers, the room, and the other two
// adventures are all untouched. Shown only when the arc is finished.
function playAgainButton(arcId, ctx) {
  return el('button', { class: 'btn btn--big story__replay', type: 'button', 'aria-label': 'Play this adventure again',
    onClick: () => { audio.play(sfx.pop()); story.resetQuestProgress(arcId); delete greeted[arcId]; ctx.go('story', { arc: arcId }); } },
    icon('replay', 'story__replay-icon'), ' Play it again!');
}
const arcDone = (arcId) => story.allChaptersDone(arcId) && story.finaleSeen(arcId);

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
  if (arcDone(arcId)) root.append(playAgainButton(arcId, ctx)); // a finished journey can start over

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
      el('button', { class: 'btn btn--big', type: 'button', onClick: () => { audio.play(sfx.pop()); overlay.remove(); ctx.go('story', { arc: arcId }); } }, 'Yay!'), // → the completed journey, where "Play it again!" awaits
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
  // The choose-your-path FORK (brief 029): two short branch wisps off the fork stop.
  // Before choosing, both gently invite; after, the taken one glows and the other
  // stays a soft, faded "another day" road (a true, no-nag hint that replaying offers
  // something new). Only arcs with a `fork` chapter draw this; savedada has none.
  let forkWisps = '';
  const fi = story.forkIndex(arcId);
  if (fi >= 0 && QUEST_PATH[fi]) {
    const f = QUEST_PATH[fi];
    const taken = story.getPath(arcId);              // 'mountain' | 'river' | null
    const fdone = story.hasEarned(arcId, 'fork');
    const tips = { mountain: { x: f.x + 4, y: f.y - 11 }, river: { x: f.x + 4.5, y: f.y + 8 } };
    forkWisps = Object.keys(tips).map((k) => {
      const lit = fdone && taken === k;
      const op = fdone ? (lit ? 0.92 : 0.16) : 0.42;  // un-chosen → faint; taken → glows
      return `<path d="M ${f.x} ${f.y} L ${tips[k].x} ${tips[k].y}" fill="none" stroke="rgba(255,216,106,${op})" stroke-width="${lit ? 1.3 : 0.8}" stroke-linecap="round"${lit ? '' : ' stroke-dasharray="2 2"'}/>`;
    }).join('');
  }
  return el('span', { class: 'story__route', 'aria-hidden': 'true',
    html: `<svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%"><defs><filter id="qglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="${ahead}" fill="none" stroke="rgba(255,216,106,0.28)" stroke-width="0.8" stroke-linecap="round" stroke-dasharray="2.4 2.4"/><path d="${inked}" fill="none" stroke="rgba(255,216,106,0.95)" stroke-width="1.4" stroke-linecap="round" filter="url(#qglow)"/>${forkWisps}${dada}</svg>` });
}

function renderQuest(arcId, params, ctx) {
  story.ensureQuestFresh(arcId); // one-time: clear any pre-quest progress so the story starts at mission 1
  const v = ARC_VIEW[arcId];
  const root = el('div', { class: `scene story story--quest ${v.mapClass}`.trim() });
  music.play('home');

  const map = el('div', { class: 'story__map', style: { backgroundImage: "url('assets/screens/screen-worldmap.png')" } });
  map.append(el('span', { class: 'story__journeyveil', 'aria-hidden': 'true' }), questPathSvg(arcId));

  const chapters = story.chaptersOf(arcId);
  chapters.forEach((m, i) => {
    const pos = QUEST_PATH[i] || { x: 50, y: 50 };
    const state = story.missionState(arcId, i); // done · current · locked
    // A friendly name for the stop: a chapter `label` (for fork/bridge/reunion and
    // other non-zone stops) else the real zone's name.
    const name = m.label || (zoneById(m.zone) || {}).name || m.zone;
    const spot = el('button', {
      class: `quest-stop quest-stop--${state}` + (m.kind === 'fork' ? ' quest-stop--fork' : ''),
      type: 'button',
      'aria-label': `${name}${state === 'current' ? ', play this mission' : state === 'done' ? ', done' : ''}`,
      style: { left: `${pos.x}%`, top: `${pos.y}%` },
      onClick: () => tapStop(m, i, state),
    },
      el('span', { class: 'quest-stop__dot', 'aria-hidden': 'true' }, String(i + 1)),
      state === 'current' ? el('span', { class: 'quest-stop__pulse', 'aria-hidden': 'true' }) : null,
      el('span', { class: 'quest-stop__label' }, name));
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
  if (arcDone(arcId)) root.append(playAgainButton(arcId, ctx)); // a finished quest can start over

  // --- tapping a stop ---
  function tapStop(m, i, state) {
    audio.play(sfx.pop());
    if (state === 'current') {
      if (m.kind === 'fork') { ctx.after(220, () => { if (ctx.alive()) chooseFork(m); }); return; } // the choose-your-path moment
      if (zoneExists(m.zone)) audio.speak(clip.zone(m.zone)); // real zones announce themselves; fork/bridge/reunion let the activity speak (no zone clip)
      ctx.after(360, () => { if (ctx.alive()) startMission(m); });
    } else if (state === 'done') {
      const w = m.kind === 'fork' ? (story.chosenBranch(arcId) || {}).word : m.word;
      if (w) audio.speak(clip.word(w)); // a gentle review — Dada says the word found here (no re-earn)
    } else {
      const cur = story.currentMission(arcId); // a soft nudge toward the current mission — never a penalty
      if (cur && zoneExists(cur.zone)) audio.speak(clip.suggest(cur.zone));
    }
  }

  // route the mission to its activity (in quest mode). Battles carry the team + tier
  // + foe type (type-strategy). Read-it falls back to build-word if he isn't ready
  // yet (never a dead-end). `teens` forces the count's hero range (11–20 + ten-frame).
  function startMission(m) {
    const common = { story: true, zone: m.zone, arc: arcId };
    if (m.kind === 'build-word') ctx.go('train', { ...common, kind: 'build-word' });
    else if (m.kind === 'count') ctx.go('train', { ...common, kind: 'count', teens: !!m.teens });
    else if (m.kind === 'battle') ctx.go('battle', { ...common, quest: true, tier: m.tier || 1, foeType: m.foeType || null, team: story.getTeam(arcId) });
    else if (m.kind === 'readit') { if (readyToRead()) ctx.go('game-readit', { ...common }); else ctx.go('train', { ...common, kind: 'build-word' }); }
    else ctx.go('catch', { zoneId: m.zone, story: true, arc: arcId });
  }

  // The choose-your-path FORK (brief 029) — the one new mechanic. Two big tappable
  // path cards (audio-first: Dada says "which way?"). There is NO wrong choice: both
  // are the same tier, both lead onward to Mama. The pick is remembered; the chosen
  // branch plays this time, the other waits "another day" (and replaying lets him take
  // it — pairs with brief 028 "Play again"). Tapping the backdrop = no-dead-end pick.
  function chooseFork(m) {
    const entries = Object.entries(m.branches || {});
    const overlay = el('div', { class: 'panel-overlay fork-pick' });
    const cards = el('div', { class: 'fork-pick__cards' });
    // Inline SVG glyphs (the codebase is emoji-free): peaks for the mountain, waves
    // for the river. Words on the cards are decoration — the choice is spoken.
    const GLYPH = {
      mountain: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M2 20 L9 7 L13 14 L16 9 L22 20 Z" fill="currentColor"/></svg>',
      river: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M2 8c4-3 6 3 10 0s6-3 10 0M2 13c4-3 6 3 10 0s6-3 10 0M2 18c4-3 6 3 10 0s6-3 10 0" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg>',
    };
    const LABEL = { mountain: 'Over the mountain', river: 'Along the river' };
    const pick = (key, br) => { audio.play(sfx.pop()); story.setPath(arcId, key); overlay.remove(); ctx.after(200, () => { if (ctx.alive()) startBranch(m, br); }); };
    entries.forEach(([key, br]) => {
      const card = el('button', { class: `fork-pick__card fork-pick__card--${key}`, type: 'button', 'aria-label': LABEL[key] || key,
        onClick: () => pick(key, br) },
        el('span', { class: 'fork-pick__glyph', 'aria-hidden': 'true', html: GLYPH[key] || '' }),
        el('span', { class: 'fork-pick__label' }, LABEL[key] || key));
      cards.append(card);
    });
    overlay.append(el('div', { class: 'panel fork-pick__panel' },
      el('h2', { class: 'panel__title' }, 'Which way, Alex?'), cards));
    // No-dead-end: tapping the dark backdrop picks the first path (both lead home).
    overlay.addEventListener('click', (e) => { if (e.target !== overlay) return; const [k, b] = entries[0]; pick(k, b); });
    root.append(overlay);
    audio.speak(clip.whichWay());
  }

  // Run the chosen branch's activity. It earns the FORK token (`zone:'fork'`), so the
  // fork completes as one mission and both branches reconverge at the next stop. The
  // branch's real flavour (mountain/river) lives only in its beat art + narration.
  function startBranch(m, br) {
    const common = { story: true, zone: m.zone, arc: arcId }; // m.zone === 'fork'
    if (br.kind === 'build-word') ctx.go('train', { ...common, kind: 'build-word' });
    else if (br.kind === 'count') ctx.go('train', { ...common, kind: 'count', teens: !!br.teens });
    else if (br.kind === 'battle') ctx.go('battle', { ...common, quest: true, tier: m.tier || 1, foeType: br.foeType || null, team: story.getTeam(arcId) });
    else ctx.go('catch', { zoneId: br.zone || m.zone, story: true, arc: arcId });
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
    ctx.after(500, () => { if (ctx.alive() && cur && zoneExists(cur.zone)) audio.speak(clip.suggest(cur.zone)); });
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

  function pointNext() { const cur = story.currentMission(arcId); if (cur && zoneExists(cur.zone)) ctx.after(300, () => { if (ctx.alive()) audio.speak(clip.suggest(cur.zone)); }); }

  // The story beat after a mission win (brief 027/029): a full-screen picture + Dada
  // (the storyteller) says the recovered word, then NARRATES the moment — a person + a
  // problem the activity just solved. Then the path inks on. Arc-generic: the beat
  // image/audio/cast come from ARC_VIEW (`beatImg`/`beatClip`/`beatArt`), keyed by the
  // chapter's `img` slug (so repeated zones get distinct art). The FORK resolves to the
  // chosen branch's word/slug/caption.
  function showBeat(zone) {
    const chap = story.chapterFor(arcId, zone);
    const branch = chap && chap.kind === 'fork' ? story.chosenBranch(arcId) : null;
    const word = branch ? branch.word : story.wordFor(arcId, zone);
    const slug = (branch ? branch.img : (chap && chap.img)) || zone; // per-chapter image/audio slug, falling back to zone
    const title = branch ? branch.beat : story.beatOf(arcId, zone);
    confetti(root); audio.play(sfx.catch());
    const prog = root.querySelector('.story__route');
    if (prog) { const c = centerOf(prog, root); haloRing(root, c.x, c.y, { size: 220, color: v.haloColor, dur: 900 }); driftSparkles(root, c.x, c.y, 8); }
    const lines = [() => clip.word(word), () => v.beatClip(slug)]; // the recovered word, then Dada narrates the moment
    // midpoint: recover the word + narrate, then the glimpse IS the beat (uses this beat's art)
    if (story.midpointDue(arcId)) { audio.speakSequence(lines.map((fn) => fn())); showGlimpse(arcId, root, ctx, pointNext, v.beatImg(slug)); return; }
    cutscene(root, ctx, {
      cls: 'cutscene--beat',
      bg: v.beatImg(slug), // optional drop-in (per-chapter slug); CSS gradient fallback
      art: v.beatArt(zone), // FALLBACK cast — suppressed when the bespoke image loads
      title,
      lines,
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
  // When a bespoke full-bleed backdrop is present it IS the whole scene (it already
  // contains the cast) — so on load, suppress the character-PNG overlays (those are
  // the FALLBACK for when there's no art). On error the bg hides itself + the cast shows.
  if (bg) { const bgImg = charImg(bg, 'cutscene__bg', ''); bgImg.addEventListener('load', () => overlay.classList.add('cutscene--has-bg')); overlay.append(bgImg); }
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

// The opening — arc-scoped (savedada: Dad's words flew away; savemama: Aunt Kaitlin
// comes for Alex). (Once; then team-pick.) Config lives in ARC_VIEW[arc].cut.opening.
function showOpening(arcId, root, ctx, onDone) {
  story.markOpeningSeen(arcId);
  audio.play(sfx.sparkle());
  const c = ARC_VIEW[arcId].cut.opening;
  cutscene(root, ctx, { cls: 'cutscene--opening', bg: c.bg, art: c.art, title: c.title, lines: [c.line], cta: c.cta, onDone });
}

// The middle turn (~halfway): Alex GLIMPSES the parent far across the world, waving —
// closer now. Anticipation renews. `bg` = the midpoint mission's beat art when present.
function showGlimpse(arcId, root, ctx, onDone, bg) {
  story.markMidpointSeen(arcId);
  const c = ARC_VIEW[arcId].cut.glimpse;
  cutscene(root, ctx, { cls: 'cutscene--glimpse', bg, art: c.art, title: c.title, lines: [c.line], cta: c.cta, onDone });
}

// The climax: Alex reaches the parent — the biggest, warmest moment. The LAST recovered
// word is said back, then the reunion. A bloom of warm light + abundant sparkles.
function showReunion(arcId, root, ctx) {
  const v = ARC_VIEW[arcId];
  const c = v.cut.reunion;
  story.markFinaleSeen(arcId);
  audio.play(sfx.catch());
  const lastZone = (story.chaptersOf(arcId).slice(-1)[0] || {}).zone;
  const lastWord = lastZone ? story.wordFor(arcId, lastZone) : null;
  const overlay = cutscene(root, ctx, {
    cls: 'cutscene--reunion', bg: c.bg, art: c.art, title: c.title,
    lines: lastWord ? [() => clip.word(lastWord), c.line] : [c.line],
    cta: c.cta,
    onDone: () => showEnding(arcId, root, ctx),
  });
  const reduce = prefersReducedMotion();
  requestAnimationFrame(() => {
    const ctr = centerOf(overlay, root);
    haloRing(root, ctr.x, ctr.y, { size: reduce ? 360 : 520, color: v.finaleHalo, dur: 1300 });
    sparkleBurst(root, ctr.x, ctr.y, reduce ? 14 : 28);
    driftSparkles(root, ctr.x, ctr.y, reduce ? 8 : 16);
    confetti(root);
  });
}

// The ending: home together — a cozy close (savedada: "let me read to YOU"; savemama:
// "the best hug of all"). Back to the now-complete journey → "Play it again!" awaits.
function showEnding(arcId, root, ctx) {
  const c = ARC_VIEW[arcId].cut.ending;
  cutscene(root, ctx, { cls: 'cutscene--ending', art: c.art, title: c.title, lines: [c.line], cta: c.cta, onDone: () => ctx.go('story', { arc: arcId }) });
}
