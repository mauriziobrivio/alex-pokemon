// Story Mode — the journey maps + the front-door chooser (brief 022).
//
// The front door is now a gentle chooser: "Which adventure today?" — the Rainbow
// Wonder-Quest (sunlit day) or the Wish-Star Journey (cozy twilight) — with
// free-play still one tap away ("Just explore"). Each arc's journey IS the world
// map: Mama points (Dada narrates) at the next zone whose token is still missing,
// but Alex taps ANY zone freely. A chapter zone → its learning activity → earns
// that zone's token (feather / wish-star); the rainbow / constellation fills in.
// No locks, no fail, no fixed order. The rainbow journey is byte-equivalent to before.

import { el, charImg, icon, spriteImg, prefersReducedMotion } from '../ui.js';
import * as audio from '../audio.js';
import { clip } from '../voices.js';
import { sfx } from '../sfx.js';
import { ZONES, pokemonById } from '../data.js';
import { recordCatch } from '../game.js';
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

// --- Story Mode 2.0 (Saving Dada) progress: a trail of glowing word-stepping-stones
// across the world toward Dada (who waits at the far end — faint when far, brighter
// as the path lights). Each recovered word lights the next stone. The words ARE the path. ---
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
  const dx = 176, dy = 30; // Dada waits at the world's edge — grows brighter/nearer as the path lights
  const dada = `<g opacity="${(0.32 + near * 0.62).toFixed(2)}" filter="url(#pathglow)"><circle cx="${dx}" cy="${dy}" r="${(4 + near * 2).toFixed(1)}" fill="#ffe6a0"/><circle cx="${dx}" cy="${dy - 0.5}" r="2" fill="#8a6a3a"/></g>`;
  return el('div', { class: 'story__path', 'aria-label': `Dada's words: ${earned} of ${total} found` },
    el('span', { class: 'story__path-svg', 'aria-hidden': 'true',
      html: `<svg viewBox="0 0 190 92" width="100%" height="100%"><defs><filter id="pathglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="${line} L ${dx} ${dy}" fill="none" stroke="rgba(255,216,106,0.4)" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="3 3"/>${stones}${dada}</svg>` }));
}
function wordStone(earned) {
  return el('span', { class: 'hotspot__wordstone' + (earned ? ' is-earned' : ''), 'aria-hidden': 'true',
    html: '<svg viewBox="0 0 24 24" width="100%" height="100%"><ellipse cx="12" cy="14" rx="9" ry="6" fill="currentColor"/><path d="M6.5 13.5c2.2-2 8.8-2 11 0" stroke="rgba(255,255,255,0.75)" stroke-width="1.2" fill="none"/></svg>' });
}

// Per-arc view config — the only place the two journeys differ visually/audibly.
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
    finaleReady: true, // Stage 3: Jirachi wakes when the constellation is complete
    finaleArt: 'assets/screens/scene-jirachi-finale.png', // optional drop-in; the CSS starfield carries it otherwise
  },
  savedada: {
    title: 'Save Professor Dada!', mapClass: 'story--journey', progress: pathProgress, marker: wordStone,
    findLabel: "find Dada's word", gotLabel: 'word found',
    haloColor: 'rgba(255,224,150,0.92)', finaleHalo: 'rgba(255,236,150,0.92)',
    // intro is the OPENING cutscene (not a spoken line); `more` gently keeps him going.
    clips: { intro: () => clip.dadaCall(), found: () => clip.dadaMore(), more: () => clip.dadaMore() },
    type: 'narrative',
  },
};

export function renderStory(params, ctx) {
  const arcId = params && params.arc;
  if (arcId && story.arcExists(arcId)) return renderJourney(arcId, params, ctx);
  return renderChooser(ctx);
}

// The front door: "Which adventure today?" — two arcs, plus free-play one tap away.
function renderChooser(ctx) {
  const root = el('div', { class: 'scene story story--chooser' });
  music.play('home');

  const card = (arcId, subtitle, preview, headline) => {
    const v = ARC_VIEW[arcId];
    const done = story.earnedCount(arcId), total = story.totalChapters(arcId);
    return el('button', { class: `adventure-card adventure-card--${arcId}` + (headline ? ' adventure-card--headline' : ''), type: 'button', 'aria-label': v.title,
      onClick: () => { audio.play(sfx.pop()); ctx.go('story', { arc: arcId }); } },
      el('span', { class: 'adventure-card__art' }, preview),
      el('span', { class: 'adventure-card__title' }, v.title),
      el('span', { class: 'adventure-card__sub' }, subtitle),
      el('span', { class: 'adventure-card__count', 'aria-hidden': 'true' }, `${done} / ${total}`));
  };

  const explore = el('button', { class: 'btn btn--ghost story__explore', type: 'button',
    onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, icon('catch'), ' Just explore');

  root.append(
    el('h1', { class: 'story__title' }, 'Which adventure today?'),
    card('savedada', 'Bring Dad — and his voice — home', pathProgress('savedada'), true), // the headline story
    el('div', { class: 'adventure-choices' },
      card('rainbow', 'A sunny rainbow quest', rainbowArc('rainbow')),
      card('wishstar', 'A starlit wish journey', constellation('wishstar'))),
    explore);
  ctx.after(450, () => { if (ctx.alive()) audio.speak(clip.chooseAdventure()); });
  return root;
}

// One generalized journey map, parameterized by arc.
function renderJourney(arcId, params, ctx) {
  const v = ARC_VIEW[arcId];
  const root = el('div', { class: `scene story ${v.mapClass}`.trim() });
  music.play('home');

  const map = el('div', { class: 'story__map', style: { backgroundImage: "url('assets/screens/screen-worldmap.png')" } });
  if (v.mapClass) map.append(el('span', { class: 'story__nightveil', 'aria-hidden': 'true' })); // warm twilight overlay
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

  // Back to the chooser (the front door) — free-play is one more tap from there.
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
      // A quest zone starts its chapter's activity (→ token). An already-earned zone
      // is free exploration — never a dead end. `arc`/`from` only steer the activity's
      // Back button back to THIS journey; they never change the activity's behavior.
      if (questHere) startChapter(z.id, chap.kind);
      else ctx.go('catch', { zoneId: z.id, from: 'story', arc: arcId });
    });
  }

  // Each chapter routes to the activity Alex already knows, in Story mode (it earns
  // this zone's token on success and returns to this journey).
  function startChapter(zone, kind) {
    if (kind === 'build-word') ctx.go('train', { story: true, zone, kind: 'build-word', arc: arcId });
    else if (kind === 'count') ctx.go('train', { story: true, zone, kind: 'count', arc: arcId });
    else if (kind === 'battle') ctx.go('battle', { story: true, zone, arc: arcId });
    else if (kind === 'pattern') ctx.go('game-pattern', { story: true, zone, arc: arcId });
    else ctx.go('catch', { zoneId: zone, story: true, arc: arcId });
  }

  // Entry narration / set-pieces. When every token is home and the arc's finale is
  // ready and unseen, the reveal supersedes everything (once ever). Otherwise:
  // returning from a just-earned token → celebrate + grow the arc; else the
  // once-per-session intro, then Mama gently points at what's next.
  const earnedZone = params && params.earned;
  const narrative = story.arcType(arcId) === 'narrative';
  if (narrative && story.allChaptersDone(arcId) && !story.finaleSeen(arcId)) {
    ctx.after(earnedZone ? 1100 : 600, () => { if (ctx.alive()) showReunion(); }); // the climax → the ending
  } else if (!narrative && story.allChaptersDone(arcId) && v.finaleReady && !story.finaleSeen(arcId)) {
    ctx.after(earnedZone ? 1100 : 600, () => { if (ctx.alive()) showFinale(); });
  } else if (narrative && !story.openingSeen(arcId) && !earnedZone) {
    ctx.after(450, () => { if (ctx.alive()) showOpening(); }); // Dada's whisper sets up the quest, once
  } else if (earnedZone) {
    ctx.after(450, () => { if (ctx.alive()) (narrative ? celebrateNarrative(earnedZone) : celebrate()); });
  } else {
    const next = story.nextChapterZone(arcId);
    if (narrative) {
      ctx.after(500, () => audio.speak(next ? clip.suggest(next) : v.clips.more())); // opening already seen; gently point on
    } else if (!greeted[arcId]) {
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
    // Arc 2's gentle twist: each earned wish-star earns a little "make a wish".
    if (v.clips.wish) audio.speak(v.clips.wish());
    const next = story.nextChapterZone(arcId);
    if (next) audio.speak(clip.suggest(next)); // (all-done is handled by the finale path above)
  }

  // The finale — a BIG, full-screen, wondrous reveal (brief 023, item 2). Never a
  // battle, never scary: the arc's friend descends/awakens slowly into view in a
  // bloom of warm light + abundant sparkles, the awe is held for a beat, THEN the
  // title + "Yay!" appear. Reduced-motion → a calm, still, grand version.
  function showFinale() {
    const fid = story.finaleId(arcId);
    recordCatch(fid); // met with joy, not caught in a ball
    story.markFinaleSeen(arcId);
    const friend = pokemonById(fid);
    const reduce = prefersReducedMotion();

    const sprite = spriteImg(friend); sprite.classList.add('finale__friend');
    const stage = el('div', { class: 'finale__stage' },
      el('div', { class: 'finale__rays', 'aria-hidden': 'true' }),   // soft warm god-rays behind
      el('div', { class: 'finale__bloom', 'aria-hidden': 'true' }),  // a brightening bloom
      el('div', { class: 'finale__arrive' }, sprite));               // the slow entrance wrapper
    const reveal = el('div', { class: 'finale__reveal' });           // title + CTA, after the held beat
    const overlay = el('div', { class: `finale finale--${arcId}` + (reduce ? ' is-still' : '') },
      charImg(v.finaleArt, 'finale__bg'), // the grand hero image, full-bleed, when dropped in; else the CSS carries it
      stage, reveal);
    root.append(overlay);
    requestAnimationFrame(() => overlay.classList.add('is-arriving')); // descend/awaken in

    audio.play(sfx.catch());
    audio.speakSequence([clip.name(fid), v.clips.finale()]); // the name + a warm line, clearly (rides the voice boost)

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

    if (reduce) {
      // calm, still, grand: the big legendary + one gentle bloom, then the title — no big motion
      burst(14, 8); confetti(root);
      showReveal();
    } else {
      ctx.after(450, () => burst(28, 14));
      ctx.after(1500, () => { burst(30, 16); confetti(root); });
      ctx.after(2400, () => burst(20, 12));
      ctx.after(2700, showReveal); // let the awe breathe before the button
    }
  }

  // ---------- Story Mode 2.0 (Saving Dada) — the narrative set-pieces ----------

  // A warm full-screen story cutscene: an optional drop-in backdrop + character art
  // + narrated lines (spoken in sequence, audio-first) + a continue button that is
  // ALWAYS present (tap-only, never a dead-end). Never scary.
  function cutscene({ cls, bg, art, title, lines, cta, onDone }) {
    const overlay = el('div', { class: `cutscene ${cls || ''}`.trim() });
    if (bg) overlay.append(charImg(bg, 'cutscene__bg', '')); // full-bleed drop-in art if present (else hidden)
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

  // The opening: a friendly lab whoosh swept Dada to the world's edge + scattered
  // his words; his whisper calls Alex to the adventure. (Once; then the journey.)
  function showOpening() {
    story.markOpeningSeen(arcId);
    audio.play(sfx.sparkle());
    cutscene({
      cls: 'cutscene--opening',
      bg: 'assets/screens/scene-saving-dada-opening.png', // optional drop-in
      art: [
        { src: 'assets/characters/dada/dada-encouraging.png', cls: 'cutscene__char--far', alt: 'Professor Dada, far away' },
        { src: 'assets/characters/mama/mama-greeting.png', cls: 'cutscene__char--mama' },
        { src: 'assets/characters/alex/alex-ready.png', cls: 'cutscene__char--alex' },
      ],
      title: "Dada's words flew away!",
      lines: [() => clip.dadaCall()],
      cta: "Let's go find Dad!",
      onDone: () => { const next = story.nextChapterZone(arcId); if (next) audio.speak(clip.suggest(next)); },
    });
  }

  // The word-recovery beat (replaces the collect-arc celebrate): Dada says the
  // recovered WORD back in his strengthening voice, the path lights one more stone,
  // and — at the midpoint — the "I can see you!" glimpse.
  function celebrateNarrative(zone) {
    confetti(root);
    audio.play(sfx.catch());
    const word = story.wordFor(arcId, zone);
    const tier = story.voiceTier(arcId); // 0 whisper → 2 nearly whole
    const lines = [];
    if (word) lines.push(() => clip.word(word)); // Dada says the recovered word (his voice)
    lines.push(() => clip.dadaGrow(tier + 1));    // a tiered growth encouragement (whisper → fuller)
    audio.speakSequence(lines.map((fn) => fn()));
    const prog = root.querySelector('.story__path');
    if (prog) {
      const c = centerOf(prog, root);
      haloRing(root, c.x, c.y, { size: 240, color: v.haloColor, dur: 950 });
      driftSparkles(root, c.x, c.y, 9);
      prog.classList.add('is-growing');
    }
    if (story.midpointDue(arcId)) { ctx.after(1500, () => { if (ctx.alive()) showGlimpse(); }); return; }
    const next = story.nextChapterZone(arcId);
    if (next) audio.speak(clip.suggest(next));
  }

  // The middle turn (~halfway): Alex GLIMPSES Dada far across the world, waving;
  // his voice is stronger now (whole phrases). Anticipation renews.
  function showGlimpse() {
    story.markMidpointSeen(arcId);
    cutscene({
      cls: 'cutscene--glimpse',
      art: [
        { src: 'assets/characters/dada/dada-encouraging.png', cls: 'cutscene__char--far', alt: 'Professor Dada, waving from afar' },
        { src: 'assets/characters/alex/alex-ready.png', cls: 'cutscene__char--alex' },
      ],
      title: 'I can see you, Alex!',
      lines: [() => clip.dadaGlimpse()],
      cta: 'Keep going!',
      onDone: () => { const next = story.nextChapterZone(arcId); if (next) audio.speak(clip.suggest(next)); },
    });
  }

  // The climax: the last word ('dad') returned Dada's full voice — and Alex reaches
  // him. The biggest, warmest moment. A bloom of warm light + abundant sparkles.
  function showReunion() {
    story.markFinaleSeen(arcId); // the arc is completed (once)
    audio.play(sfx.catch());
    const overlay = cutscene({
      cls: 'cutscene--reunion',
      bg: 'assets/screens/scene-saving-dada-reunion.png', // optional drop-in
      art: [
        { src: 'assets/characters/dada/dada-cheering.png', cls: 'cutscene__char--reunion-dada', alt: 'Professor Dada' },
        { src: 'assets/characters/alex/alex-cheering.png', cls: 'cutscene__char--reunion-alex', alt: 'Alex' },
      ],
      title: 'You found Dad!',
      lines: [() => clip.dadaReunion()],
      cta: 'Hooray!',
      onDone: showEnding,
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
  function showEnding() {
    cutscene({
      cls: 'cutscene--ending',
      art: [
        { src: 'assets/characters/dada/dada-presenting.png', cls: 'cutscene__char--cozy-dada', alt: 'Professor Dada' },
        { src: 'assets/characters/alex/alex-ready.png', cls: 'cutscene__char--cozy-alex', alt: 'Alex' },
      ],
      title: 'Home together',
      lines: [() => clip.dadaEnding()],
      cta: 'The End',
      onDone: () => {}, // closes back onto the (now complete) journey — revisitable
    });
  }

  return root;
}
