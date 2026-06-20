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

// All ten zones are chapters; the kind is the learning activity Alex already
// loves, spread across his skills (numbers, blending, counting, comparison).
// Order = the gentle suggested path Mama points along. Stage 3 adds the Ho-Oh
// finale when every feather is home.
export const CHAPTERS = [
  { zone: 'meadow', kind: 'catch' },       // number recognition
  { zone: 'forest', kind: 'build-word' },  // blending (Train build-a-word)
  { zone: 'beach', kind: 'count' },        // one-to-one counting (Train berries)
  { zone: 'mountain', kind: 'catch' },
  { zone: 'desert', kind: 'catch' },
  { zone: 'volcano', kind: 'battle' },     // comparison / blend-to-charge (gentle battle)
  { zone: 'snowfield', kind: 'count' },
  { zone: 'grove', kind: 'build-word' },
  { zone: 'cave', kind: 'catch' },
  { zone: 'ocean', kind: 'catch' },
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

// The Ho-Oh finale: a once-ever wondrous reveal when every feather is home.
export const HOOH_ID = 250; // the Rainbow Pokémon (swappable: Lugia 249 / Rayquaza 384)
export const finaleSeen = () => !!read('finaleSeen', false);
export const markFinaleSeen = () => write('finaleSeen', true);

// The next chapter still missing its feather — where Mama gently points. Null when
// the (currently lit) rainbow is complete.
export const nextChapterZone = () => {
  const c = CHAPTERS.find((ch) => !hasFeather(ch.zone));
  return c ? c.zone : null;
};
