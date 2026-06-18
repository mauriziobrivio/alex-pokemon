// Sound-effects routing (our own synthesized sounds, in audio/sfx/).
// Separate from voices.js so the juice doesn't depend on the recorded voice.

const url = (f) => `audio/sfx/${f}`;

export const sfx = {
  pop: () => url('pop.mp3'),         // button tap
  soft: () => url('soft.mp3'),       // gentle wrong-tap (never a buzzer)
  wobble: () => url('wobble.mp3'),   // Poké Ball wobble tick (played x3)
  whoosh: () => url('whoosh.mp3'),   // throw
  catch: () => url('catch.mp3'),     // the win
  sparkle: () => url('sparkle.mp3'), // celebration shimmer
};

export const SFX_URLS = Object.values(sfx).map((f) => f());
