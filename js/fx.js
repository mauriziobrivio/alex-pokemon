// Visual juice: sparkle bursts and catch confetti. The celebration is the
// phase's showpiece. Honours prefers-reduced-motion (fewer, calmer particles).

import { el, prefersReducedMotion } from './ui.js';

const COLORS = ['#ffd54a', '#7fc6e6', '#8fcf5a', '#ff8fa3', '#c79bff', '#fff3b0'];
const rand = (a, b) => a + Math.random() * (b - a);

// A burst of sparkles around a point within `container`.
export function sparkleBurst(container, x, y, count = 16) {
  if (prefersReducedMotion()) return; // no frozen dots under reduced motion (matches confetti)
  const n = count;
  const layer = el('div', { class: 'fx-layer' });
  container.append(layer);
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n + rand(-0.2, 0.2);
    const dist = rand(40, 130);
    const p = el('div', { class: 'fx-spark' });
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.background = COLORS[i % COLORS.length];
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    p.style.animationDelay = `${rand(0, 0.08)}s`;
    layer.append(p);
  }
  setTimeout(() => layer.remove(), 1100);
}

// A soft single-node bloom of light — the calm centrepiece for the wins that
// matter (catch reveal, foil card, evolution morph, quest sticker).
export function haloRing(container, x, y, { size = 120, color = 'rgba(255,243,176,0.9)', dur = 900 } = {}) {
  if (prefersReducedMotion()) return;
  const layer = el('div', { class: 'fx-layer' });
  container.append(layer);
  const ring = el('div', { class: 'fx-halo' });
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ring.style.setProperty('--halo-size', `${size}px`);
  ring.style.setProperty('--halo-color', color);
  ring.style.setProperty('--halo-dur', `${dur}ms`);
  layer.append(ring);
  setTimeout(() => layer.remove(), dur + 120);
}

// A slow, calm rise of a few twinkles drifting up from a point (pack reveal,
// sticker arrival) — gentler and longer-lived than sparkleBurst.
export function driftSparkles(container, x, y, count = 8, { spread = 60, rise = 90, dur = 1400 } = {}) {
  if (prefersReducedMotion()) return;
  const layer = el('div', { class: 'fx-layer' });
  container.append(layer);
  for (let i = 0; i < count; i++) {
    const p = el('div', { class: 'fx-twinkle' });
    p.style.left = `${x + rand(-spread, spread)}px`;
    p.style.top = `${y + rand(-spread / 2, spread / 2)}px`;
    p.style.background = COLORS[i % COLORS.length];
    p.style.setProperty('--rise', `${-rise - rand(0, 40)}px`);
    p.style.setProperty('--dur', `${dur}ms`);
    p.style.animationDelay = `${rand(0, 0.5)}s`;
    layer.append(p);
  }
  setTimeout(() => layer.remove(), dur + 600);
}

// Confetti raining down for a catch.
export function confetti(container) {
  if (prefersReducedMotion()) return;
  const layer = el('div', { class: 'fx-layer' });
  container.append(layer);
  const n = 36;
  for (let i = 0; i < n; i++) {
    const c = el('div', { class: 'fx-confetti' });
    c.style.left = `${rand(0, 100)}%`;
    c.style.background = COLORS[i % COLORS.length];
    c.style.animationDelay = `${rand(0, 0.5)}s`;
    c.style.setProperty('--rot', `${rand(-180, 180)}deg`);
    c.style.setProperty('--drift', `${rand(-40, 40)}px`);
    layer.append(c);
  }
  setTimeout(() => layer.remove(), 2200);
}

// Center coordinates of an element relative to a container.
export function centerOf(elem, container) {
  const a = elem.getBoundingClientRect();
  const b = container.getBoundingClientRect();
  return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
}
