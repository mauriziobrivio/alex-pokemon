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

  // Story Mode 2.0 — "Saving Professor Dada", rebuilt as a STORY QUEST (brief 026):
  // a told tale in chapters ALONG A PATH (a route, not a free board), with a story
  // BEAT (picture + narration) playing out between each mission, a TEAM of 3 Alex
  // brings, type-strategy battles, and a difficulty curve that climbs (tier 1→5).
  // A friendly lab *whoosh* swept Dada to the world's edge + scattered his WORDS;
  // each mission recovers one (his voice grows whisper→whole) and inks the path
  // onward. Climax: the last word ('dad') returns his full voice → the reunion →
  // Dad reads to Alex. NEVER scary (Dada is safe + happy throughout). This is the
  // TEMPLATE for all future stories: ordered `chapters` (missions) + `beats`.
  savedada: {
    id: 'savedada',
    type: 'quest',
    earnedKey: 'dadaWords',            // recovered missions (in order) = words found = path progress
    finaleSeenKey: 'savedDadaSeen',    // the ENDING cutscene seen (the arc completed, once)
    openingKey: 'savedDadaOpened',     // the opening cutscene seen (once)
    midpointKey: 'savedDadaMid',       // the "I can see you!" glimpse shown (once)
    midpointAfter: 6,                  // the glimpse beat after mission 6 (the grove battle)
    teamKey: 'questTeam',              // the team of 3 he brings (Pokémon ids)
    // The ordered 10-mission path — from home OUT to the world's edge, rising as it
    // goes. Each mission: a zone + an activity Alex knows + a difficulty `tier` (1→5)
    // + the `word` it recovers (Dada says it back, voice growing) + a story `beat`
    // (the picture-moment after the win). Battle missions may name a `foeType` so the
    // right team pick matters (type-strategy). Literacy-forward (build-word + read).
    chapters: [
      { zone: 'meadow',    kind: 'catch',      tier: 1, word: 'sun', beat: 'The first word glimmers back!' },
      { zone: 'forest',    kind: 'build-word', tier: 1, word: 'dog', beat: 'Forest friends cheer him on.' },
      { zone: 'beach',     kind: 'battle',     tier: 2, word: 'cat', beat: 'A little stronger — he sets off across the water.' },
      { zone: 'mountain',  kind: 'count',      tier: 2, word: 'hat', beat: 'From the peak, he spots the far edge.' },
      { zone: 'desert',    kind: 'build-word', tier: 3, word: 'hen', beat: 'A sandstorm clears to reveal the way onward.' },
      { zone: 'grove',     kind: 'battle',     tier: 3, word: 'big', beat: 'I can see you, Alex! Keep coming!' },           // midpoint glimpse
      { zone: 'cave',      kind: 'readit',     tier: 4, word: 'fun', beat: 'Glowing crystals light the path; his voice nearly whole.' },
      { zone: 'volcano',   kind: 'battle',     tier: 4, word: 'run', foeType: 'fire', beat: 'He crosses the warm pass — almost there.' },
      { zone: 'snowfield', kind: 'battle',     tier: 5, word: 'hug', beat: 'The last frozen stretch to the edge.' },
      { zone: 'ocean',     kind: 'battle',     tier: 5, word: 'dad', beat: "Dada's full voice returns — you reach him!" }, // the climax
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
export const midpointDue = (arc) => isQuest(arc) && !midpointSeen(arc)
  && earnedCount(arc) >= (arcById(arc).midpointAfter || 5) && !allChaptersDone(arc);

// --- Story Quest (brief 026) — the ordered-path arc (savedada is the first) ---
// A Story Quest = ordered `chapters` (missions) + story `beats`. Missions complete
// IN ORDER (the path enforces it), so `earnedCount` doubles as the next index. This
// is the reusable template for every future story.
export const isQuest = (arc) => arcType(arc) === 'quest';
export const missionAt = (arc, i) => chaptersOf(arc)[i] || null;
export const missionIndexOf = (arc, zone) => chaptersOf(arc).findIndex((m) => m.zone === zone);
export const nextMissionIndex = (arc) => earnedCount(arc);          // completed-in-order → next index
export const currentMission = (arc) => missionAt(arc, nextMissionIndex(arc));
// A mission's state on the map: 'done' · 'current' (the active one) · 'locked' (ahead).
export const missionState = (arc, i) => { const d = nextMissionIndex(arc); return i < d ? 'done' : i === d ? 'current' : 'locked'; };
export const tierOf = (arc, zone) => (chapterFor(arc, zone) || {}).tier || 1;
export const foeTypeOf = (arc, zone) => (chapterFor(arc, zone) || {}).foeType || null;
export const beatOf = (arc, zone) => (chapterFor(arc, zone) || {}).beat || '';

// The team of 3 Alex brings on the quest (Pokémon ids), chosen after the opening beat.
export const getTeam = (arc) => read(arcById(arc).teamKey || 'questTeam', []);
export const setTeam = (arc, ids) => write(arcById(arc).teamKey || 'questTeam', (ids || []).slice(0, 3));
// "Committed a team" — normally 3, but gracefully ≥1 (a brand-new player with fewer
// than 3 caught brings what he has). >=1 (not ===3) avoids a re-render loop when the
// team auto-fills with under three.
export const hasTeam = (arc) => getTeam(arc).length >= 1;

// The win-card CTA, per arc (brief 026 Part D — no arc ever shows another's wording).
export const tokenCta = (arc) => isQuest(arc) ? 'Onward!' : arc === 'wishstar' ? 'Find the wish-star!' : 'Find the rainbow feather!';

// --- Backward-compatible rainbow aliases (arc-1 byte-equivalence) ---
export const CHAPTERS = ARCS.rainbow.chapters;
export const HOOH_ID = ARCS.rainbow.finaleId;
export const getFeathers = () => getEarned('rainbow');
export const hasFeather = (zone) => hasEarned('rainbow', zone);
export const earnFeather = (zone) => earn('rainbow', zone);
