// Entry point: splash logic, the iOS audio unlock, and service-worker registration.

import { preload, unlock, play } from './audio.js';

const CLIP = 'greeting';

function start() {
  const splash = document.getElementById('splash');
  if (!splash) return;

  // Decode the clip now so the very first tap is instant.
  preload(CLIP).catch(() => { /* play() will load on demand if this fails */ });

  let firstTap = true;

  function onTap() {
    // Unlock synchronously inside the gesture (the iOS requirement), then play.
    if (firstTap) {
      firstTap = false;
      unlock();
    }
    bounce(splash);
    play(CLIP);
  }

  // pointerup fires for touch, pen, and mouse, and counts as a user gesture.
  splash.addEventListener('pointerup', onTap);

  // Keyboard access (Enter / Space) for completeness.
  splash.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      onTap();
    }
  });
}

// Restart the tap-bounce animation on every tap for satisfying feedback.
function bounce(el) {
  el.classList.remove('is-playing');
  void el.offsetWidth; // force reflow so the animation replays
  el.classList.add('is-playing');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

// Register the service worker (relative path → correct scope at any base URL).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('service-worker.js')
      .catch((err) => console.warn('[sw] registration failed', err));
  });
}
