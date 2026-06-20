// Story Mode — the Rainbow Wonder-Quest (Part 3, brief 015). A loose journey
// Mama gently suggests and Alex freely chooses: each zone's chapter goal is a
// learning activity he already loves (catch, build a word, count, a gentle
// battle), and finishing it earns that zone's rainbow feather. The rainbow fills
// in as feathers gather; when all are home, Ho-Oh comes to say hello.
//
// No fail, no fixed order, no timer, no streak — wonder, not a checklist. The
// engine is data-driven (CHAPTERS) so lighting more zones is a one-line add.
// Free-play stays one tap away and completely unchanged.

import { read, write } from './storage.js';

// Stage 1 lights three chapters (all 'catch' — the core loop). Stage 2 lights the
// remaining zones and varies the kind (build-word / count / battle); Stage 3 adds
// the Ho-Oh finale when every feather is home. Order = the gentle suggested path.
export const CHAPTERS = [
  { zone: 'meadow', kind: 'catch' },
  { zone: 'forest', kind: 'catch' },
  { zone: 'beach', kind: 'catch' },
];

export const chapterFor = (zone) => CHAPTERS.find((c) => c.zone === zone) || null;
export const isChapter = (zone) => !!chapterFor(zone);

// Earned feathers — array of zone ids, persisted. (Only chapter zones count.)
export const getFeathers = () => read('feathers', []).filter(isChapter);
export const hasFeather = (zone) => getFeathers().includes(zone);
export function earnFeather(zone) {
  if (!isChapter(zone) || hasFeather(zone)) return false;
  const f = read('feathers', []);
  f.push(zone);
  write('feathers', f);
  return true; // newly earned (caller plays the celebration)
}

export const earnedCount = () => getFeathers().length;
export const totalChapters = () => CHAPTERS.length;
export const allChaptersDone = () => earnedCount() >= totalChapters();

// The next chapter still missing its feather — where Mama gently points. Null when
// the (currently lit) rainbow is complete.
export const nextChapterZone = () => {
  const c = CHAPTERS.find((ch) => !hasFeather(ch.zone));
  return c ? c.zone : null;
};
