// The teen ten-frame scaffold: quantity made visible.
//
// For n<=10, one ten-frame with n cells filled. For teens (11–20), a FULL frame
// of ten ("one ten") plus a second frame with the remainder ("and some more") —
// the picture that makes the irregular teen words click.

import { el } from './ui.js';

// One 10-cell frame (2 rows of 5) with `count` cells filled (0..10).
function oneFrame(count) {
  const frame = el('div', { class: 'tenframe__grid' });
  for (let i = 0; i < 10; i++) {
    frame.append(el('div', { class: 'tenframe__cell' + (i < count ? ' is-filled' : '') }));
  }
  return frame;
}

export function tenFrame(n) {
  const wrap = el('div', { class: 'tenframe', role: 'img', 'aria-label': `${n}` });
  if (n <= 10) {
    wrap.append(oneFrame(Math.max(0, n)));
  } else {
    wrap.append(oneFrame(10), oneFrame(n - 10));
    wrap.classList.add('tenframe--teen');
  }
  return wrap;
}
