// Story Mode — TWO data-driven arcs sharing one engine (brief 022).
//
//  • Arc 1, "rainbow" (the Rainbow Wonder-Quest, brief 015): sunlit day, a rainbow
//    that fills as feathers gather, Ho-Oh at the end. UNCHANGED — same storage keys
//    and behavior; the rainbow journey is byte-equivalent to before.
//  • Arc 2, "wishstar" (Jirachi's Wish Stars, brief 022): cozy twilight, a
//    constellation of golden wish-stars that fills, Jirachi at the end.
//
// Each arc names its own chapter list, its persisted earned-set key, and its
// once-ever finale friend. A zone's chapter goal is a learning activity Alex
// already loves; finishing it earns that zone's token (feather / wish-star).
// No fail, no fixed order, no timer, no streak — wonder, not a checklist. Free-play
// stays one tap away and completely unchanged.

import { read, write } from './storage.js';

export const ARCS = {
  rainbow: {
    id: 'rainbow',
    earnedKey: 'feathers',
    finaleId: 250,                 // Ho-Oh, the Rainbow Pokémon
    finaleSeenKey: 'finaleSeen',
    chapters: [
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
    ],
  },
  wishstar: {
    id: 'wishstar',
    earnedKey: 'wishStars',
    finaleId: 385,                 // Jirachi, the Wish-granting Star Pokémon (reserved like Ho-Oh)
    finaleSeenKey: 'jirachiSeen',
    // A DIFFERENT mix from the rainbow arc so the two journeys *feel* different —
    // and it features the new Pattern Play. All ten zones lit (Stage 2). Spread:
    // pattern ×3, catch ×2, build-word ×2, count ×2, battle ×1.
    chapters: [
      { zone: 'meadow', kind: 'pattern' },     // Pattern Play (brief 021)
      { zone: 'forest', kind: 'catch' },
      { zone: 'beach', kind: 'pattern' },
      { zone: 'mountain', kind: 'count' },     // (rainbow's mountain is catch — varied)
      { zone: 'desert', kind: 'build-word' },  // (rainbow's desert is catch — varied)
      { zone: 'volcano', kind: 'battle' },
      { zone: 'snowfield', kind: 'catch' },    // (rainbow's snowfield is count — varied)
      { zone: 'grove', kind: 'pattern' },      // (rainbow's grove is build-word — varied)
      { zone: 'cave', kind: 'build-word' },    // (rainbow's cave is catch — varied)
      { zone: 'ocean', kind: 'count' },        // (rainbow's ocean is catch — varied)
    ],
  },

  // Story Mode 2.0 — "Saving Professor Dada" (brief 024): a REAL narrative, not a
  // collection. A friendly lab *whoosh* swept Dada to the world's edge and
  // scattered his WORDS. Alex journeys zone by zone; each chapter recovers one of
  // Dada's words → Dada says it back (his whisper growing stronger) → the next
  // glowing stepping-stone of the path toward him lights. The words ARE the path.
  // Climax: the last word ('dad') returns his full voice → the reunion. Warm,
  // brave, a little wistful → triumphantly happy. NEVER scary (Dada is safe + happy).
  savedada: {
    id: 'savedada',
    type: 'narrative',
    earnedKey: 'dadaWords',            // recovered chapter zones (= words found)
    finaleSeenKey: 'savedDadaSeen',    // the ENDING cutscene seen (the arc completed, once)
    openingKey: 'savedDadaOpened',     // the opening cutscene seen (once)
    midpointKey: 'savedDadaMid',       // the "I can see you!" glimpse shown (once)
    midpointAfter: 5,                  // the glimpse beat after this many words (~halfway of 10)
    // Literacy-leaning (we're gathering words): build-word ×5, pattern ×2, plus
    // catch/count/battle. Each `word` is a real CVC word Dada says back (the
    // word-*.mp3 clips already exist, in Dada's voice). The final word is 'dad'.
    chapters: [
      { zone: 'meadow', kind: 'build-word', word: 'sun' },
      { zone: 'forest', kind: 'catch', word: 'dog' },
      { zone: 'beach', kind: 'build-word', word: 'cat' },
      { zone: 'mountain', kind: 'pattern', word: 'hat' },
      { zone: 'desert', kind: 'build-word', word: 'hen' },
      { zone: 'volcano', kind: 'battle', word: 'big' },
      { zone: 'snowfield', kind: 'count', word: 'run' },
      { zone: 'grove', kind: 'build-word', word: 'fun' },
      { zone: 'cave', kind: 'pattern', word: 'hug' },
      { zone: 'ocean', kind: 'build-word', word: 'dad' }, // the climax: the word "dad" → full voice → reunion
    ],
  },
};

export const DEFAULT_ARC = 'rainbow';
export const arcById = (id) => ARCS[id] || ARCS[DEFAULT_ARC];
export const arcExists = (id) => !!ARCS[id];

// --- Generalized, arc-parameterized engine ---
export const chaptersOf = (arc) => arcById(arc).chapters;
export const chapterFor = (arc, zone) => chaptersOf(arc).find((c) => c.zone === zone) || null;
export const isChapter = (arc, zone) => !!chapterFor(arc, zone);

// Earned tokens — array of zone ids, persisted per arc. (Only chapter zones count.)
export const getEarned = (arc) => read(arcById(arc).earnedKey, []).filter((z) => isChapter(arc, z));
export const hasEarned = (arc, zone) => getEarned(arc).includes(zone);
export function earn(arc, zone) {
  if (!isChapter(arc, zone) || hasEarned(arc, zone)) return false;
  const key = arcById(arc).earnedKey;
  const list = read(key, []);
  list.push(zone);
  write(key, list);
  return true; // newly earned (caller plays the celebration)
}

export const earnedCount = (arc) => getEarned(arc).length;
export const totalChapters = (arc) => chaptersOf(arc).length;
export const allChaptersDone = (arc) => earnedCount(arc) >= totalChapters(arc);

// The next chapter still missing its token — where Mama gently points. Null when
// the (currently lit) arc is complete.
export const nextChapterZone = (arc) => {
  const c = chaptersOf(arc).find((ch) => !hasEarned(arc, ch.zone));
  return c ? c.zone : null;
};

// The once-ever finale: a wondrous reveal when every token is home.
export const finaleId = (arc) => arcById(arc).finaleId;
export const finaleSeen = (arc) => !!read(arcById(arc).finaleSeenKey, false);
export const markFinaleSeen = (arc) => write(arcById(arc).finaleSeenKey, true);

// --- Narrative arc (Saving Professor Dada) extras: cutscenes + voice-growth ---
export const arcType = (arc) => arcById(arc).type || 'collect';
export const wordFor = (arc, zone) => (chapterFor(arc, zone) || {}).word || null;
// Dada's voice grows fuller with every recovered word (0 → 1). The script + visual
// carry it; tier 0 = whisper, 1 = stronger, 2 = nearly whole.
export const voiceGrowth = (arc) => (totalChapters(arc) ? earnedCount(arc) / totalChapters(arc) : 0);
export const voiceTier = (arc) => { const g = voiceGrowth(arc); return g < 0.34 ? 0 : g < 0.7 ? 1 : 2; };
// Cutscene flags — the opening (Dada's whisper) + the midpoint glimpse, each once.
export const openingSeen = (arc) => !!read(arcById(arc).openingKey, false);
export const markOpeningSeen = (arc) => write(arcById(arc).openingKey, true);
export const midpointSeen = (arc) => !!read(arcById(arc).midpointKey, false);
export const markMidpointSeen = (arc) => write(arcById(arc).midpointKey, true);
export const midpointDue = (arc) => arcType(arc) === 'narrative' && !midpointSeen(arc)
  && earnedCount(arc) >= (arcById(arc).midpointAfter || 5) && !allChaptersDone(arc);

// --- Backward-compatible rainbow aliases (arc-1 byte-equivalence) ---
export const CHAPTERS = ARCS.rainbow.chapters;
export const HOOH_ID = ARCS.rainbow.finaleId;
export const getFeathers = () => getEarned('rainbow');
export const hasFeather = (zone) => hasEarned('rainbow', zone);
export const earnFeather = (zone) => earn('rainbow', zone);
