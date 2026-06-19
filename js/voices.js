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
  hitBigger: () => url('hit-bigger.mp3'),              // "Use the bigger number to hit harder!"
  hitSmaller: () => url('hit-smaller.mp3'),            // "Tap the smaller one!"
  chargeUp: () => url('charge-up.mp3'),                // "Charge it up — tap the sounds!"
  yourMove: () => url('your-move.mp3'),                // "Your move is..." (number plays after)
  youWin: () => url('you-win.mp3'),                    // "You win, Alex!"
  fainted: () => url('fainted.mp3'),                   // "Night night!" (sleepy, happy)
};

export const PRAISE_COUNT = 4;
export const CATCH_CHEER_COUNT = 3;
export const rnd = (n) => 1 + Math.floor(Math.random() * n);
