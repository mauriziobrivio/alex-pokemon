// Voice routing layer.
//
// The game always plays clips from the ACTIVE voice's folder, so a second voice
// could be added later by dropping in a folder and flipping ACTIVE_VOICE — with
// no other code change. This is the ONLY place audio file paths are defined.

export const ACTIVE_VOICE = 'dada';

// Logical clip name -> filename inside audio/<voice>/.
// To ship the real voice: replace audio/dada/greeting.mp3 with Dada's recorded
// "Hi Alex!" clip (same filename) — no code change needed. The service worker
// uses stale-while-revalidate, so an already-installed device picks up the new
// clip on its next launch; bump CACHE in service-worker.js to force it instantly.
const CLIPS = {
  greeting: 'greeting.mp3',
};

// Returns a path RELATIVE to the page, so it resolves correctly whether the app
// is served from a domain root, a GitHub Pages project subpath, or localhost.
export function clipUrl(name) {
  const file = CLIPS[name];
  if (!file) throw new Error(`Unknown clip: "${name}"`);
  return `audio/${ACTIVE_VOICE}/${file}`;
}
