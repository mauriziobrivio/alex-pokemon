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
};

export const PRAISE_COUNT = 4;
export const CATCH_CHEER_COUNT = 3;
export const rnd = (n) => 1 + Math.floor(Math.random() * n);
