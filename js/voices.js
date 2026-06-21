// Voice routing layer — the ONLY place voice-clip paths are defined.
//
// Everything resolves to a file in audio/<ACTIVE_VOICE>/. To ship Dada's real
// voice, drop the recordings in by filename (see tools/audio-manifest.json) —
// no code changes here. Adding a second voice later = a new folder + flip
// ACTIVE_VOICE. Filenames here are the contract the manifest/recordings honour.

export const ACTIVE_VOICE = 'dada';

const url = (file) => `audio/${ACTIVE_VOICE}/${file}`;

// Resolvers (parametric clips) + fixed lines. All speech goes through these.
export const clip = {
  greeting: () => url('greeting.mp3'),               // "Hi Alex!"
  homeWelcome: () => url('home-welcome.mp3'),         // "Ready to catch some Pokémon, Alex?"
  starterIntro: () => url('starter-intro.mp3'),       // "Choose your very first Pokémon!"
  greatChoice: () => url('great-choice.mp3'),         // "Great choice, Alex!"

  number: (n) => url(`number-${n}.mp3`),              // "fourteen"
  prompt: (n) => url(`prompt-${n}.mp3`),              // "Tap the fourteen!"
  reprompt: (n) => url(`reprompt-${n}.mp3`),          // "Let's find the fourteen!"

  praise: (i) => url(`praise-${i}.mp3`),              // "Amazing, Alex!"
  catchCheer: (i) => url(`catch-cheer-${i}.mp3`),     // "You caught..."

  name: (id) => url(`name-${id}.mp3`),                // "Pikachu!"
  zone: (id) => url(`zone-${id}.mp3`),                // "Meadow!"
  suggest: (id) => url(`suggest-${id}.mp3`),          // "Let's try the Meadow today!"

  // --- Phase 2: phonics, Train, evolution ---
  phoneme: (ch) => url(`phoneme-${ch}.mp3`),          // RECORD: the pure sound "/sss/"
  whichSays: () => url('which-one-says.mp3'),          // carrier "Which one says..."
  letsBuild: () => url('lets-build.mp3'),              // "Let's build a word!"
  youTaught: () => url('you-taught.mp3'),              // "You taught..."
  word: (w) => url(`word-${w}.mp3`),                   // the whole word, e.g. "sat!"
  pickBuddy: () => url('pick-buddy.mp3'),              // "Which buddy will you train?"
  feedBerries: () => url('feed-berries.mp3'),          // "Feed it ... berries!"
  isEvolving: () => url('is-evolving.mp3'),            // "...is evolving!"
  evolveCheer: () => url('evolve-cheer.mp3'),          // "Wow! Amazing!"

  // --- Phase 3: Battle ---
  battleStart: () => url('battle-start.mp3'),          // "Let's battle!"
  tuckeredOut: () => url('tuckered-out.mp3'),          // "Aw, all tuckered out — let's try again!" (the soft landing)
  superEffective: () => url('super-effective.mp3'),    // "Super effective!" (gentle type hint)
  hitBigger: () => url('hit-bigger.mp3'),              // "Use the bigger number to hit harder!"
  hitSmaller: () => url('hit-smaller.mp3'),            // "Tap the smaller one!"
  chargeUp: () => url('charge-up.mp3'),                // "Charge it up — tap the sounds!"
  yourMove: () => url('your-move.mp3'),                // "Your move is..." (number plays after)
  youWin: () => url('you-win.mp3'),                    // "You win, Alex!"
  fainted: () => url('fainted.mp3'),                   // "Night night!" (sleepy, happy)

  // --- Phase 4: gentle quests (catch-in-zone reuses suggest()) ---
  questCatch: () => url('quest-catch.mp3'),            // "Let's catch lots of Pokémon!"
  questEvolve: () => url('quest-evolve.mp3'),          // "Can you help a Pokémon evolve?"

  // --- Phase 5: Catch, deeper ---
  escape: () => url('escape.mp3'),                     // "Aw, it hopped away! Here comes another!"
  outingEnd: () => url('outing-end.mp3'),              // "What a great adventure — let's head home!"

  // --- Phase 6: The Collection ---
  revealFoil: () => url('reveal-foil.mp3'),            // "Ooh, a sparkly one!" (earned foil)
  peek: () => url('peek.mp3'),                         // "Who could this be? Keep exploring!"
  milestone: (m) => url(`milestone-${m}.mp3`),         // "Fifty Pokémon! Amazing, Alex!" — top stop is a warm high-count "wow", no "all" claim

  // --- Phase 8: Train counting + the Play & Learn mini-games ---
  thatsEnough: () => url('thats-enough.mp3'),          // count-the-berries gentle stop (number plays after)
  playLearnIntro: () => url('playlearn-intro.mp3'),    // "Pick a game to play!"
  gQuickCount: () => url('game-quick-count.mp3'),      // "Quick Count!"
  gWhatNext: () => url('game-what-next.mp3'),          // "What Comes Next!"
  gSoundMatch: () => url('game-sound-match.mp3'),      // "Sound Match!"
  howMany: () => url('how-many.mp3'),                  // subitize "How many?"
  whatComesAfter: () => url('what-comes-after.mp3'),   // "What comes after" (the number plays after)
  putInOrder: () => url('put-in-order.mp3'),           // "Put them in order!"
  whichStartSame: () => url('which-start-same.mp3'),   // "Which two start the same?" (the phoneme plays after)
  whichRhyme: () => url('which-rhyme.mp3'),            // "Which ones rhyme?" (rhyme variant — backlog)
  whatsNext: () => url('whats-next.mp3'),              // Pattern Play: "What comes next?"

  // --- "Ten and more" — teens as a concept (Ch.4, Part 5) ---
  // Carriers; the remainder + teen number clips play around them:
  // [tenAnd] [number(rem)] [moreMakes] … then [number(teen)] on the correct tap.
  tenAnd: () => url('ten-and.mp3'),                    // "Ten… and"
  moreMakes: () => url('more-makes.mp3'),              // "more… makes…?"

  // --- "Read it yourself" — the independent-reading milestone (Ch.4, Part 1) ---
  canYouRead: () => url('can-you-read.mp3'),           // "Can you read this word, Alex?"
  youRead: () => url('you-read.mp3'),                  // the proud eruption: "You READ it! You're reading, Alex!"
  firstRead: () => url('first-read.mp3'),              // the keepsake: "Alex read his very first word!"

  // --- Phase 9: My Words (review wall) ---
  myWords: () => url('my-words.mp3'),                  // "Here are all the words you built! Tap one to read it."

  // --- Phase 10: Story Mode — arc 1, the Rainbow Wonder-Quest (Mama-suggest reuses suggest(zone)) ---
  storyIntro: () => url('story-intro.mp3'),            // "Let's go on a rainbow adventure, Alex!"
  featherFound: () => url('feather-found.mp3'),        // "You found a rainbow feather! The rainbow is growing!"
  storyMore: () => url('story-more.mp3'),              // "More rainbow feathers are waiting — let's keep exploring!"
  finale: () => url('story-finale.mp3'),               // "You found every rainbow feather! Look — Ho-Oh has come to say hello, Alex!"

  // --- Story Mode — the front-door chooser + arc 2, Jirachi's Wish Stars (brief 022) ---
  chooseAdventure: () => url('choose-adventure.mp3'),  // "Which adventure today?"
  wishIntro: () => url('wish-intro.mp3'),              // "Let's follow the wish-stars tonight, Alex!"
  wishStarFound: () => url('wish-star-found.mp3'),     // "You found a wish-star! The night sky is glowing!"
  makeAWish: () => url('make-a-wish.mp3'),             // "Make a little wish, Alex!"
  wishMore: () => url('wish-more.mp3'),                // "More wish-stars are waiting — let's keep exploring!"
  jirachiFinale: () => url('jirachi-finale.mp3'),      // "Every wish-star is home — Jirachi woke up to say hello!" (Stage 3)

  // --- Story Mode 2.0 — "Saving Professor Dada" (brief 024). Dada's voice grows
  // from a whisper to whole as Alex recovers his words. Reuses word(w) for the
  // recovered word said back; these are the narrative beats (placeholders). ---
  dadaCall: () => url('dada-call.mp3'),                // opening whisper: "Alex… can you hear me? My words flew away…"
  dadaGrow: (n) => url(`dada-grow-${n}.mp3`),          // tiered word-recovered beat (1 whisper → 3 nearly whole)
  dadaGlimpse: () => url('dada-glimpse.mp3'),          // midpoint: "I can see you, Alex! Keep going!"
  dadaReunion: () => url('dada-reunion.mp3'),          // climax: "You found all my words… and you found me!"
  dadaEnding: () => url('dada-ending.mp3'),            // ending: "Now — let me read to you."
  dadaMore: () => url('dada-more.mp3'),                // gentle progress: "Keep following my voice, find my words!"
};

export const PRAISE_COUNT = 4;
export const CATCH_CHEER_COUNT = 3;
export const rnd = (n) => 1 + Math.floor(Math.random() * n);
