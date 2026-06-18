// Visual juice: sparkle bursts and catch confetti. The celebration is the
// phase's showpiece. Honours prefers-reduced-motion (fewer, calmer particles).

import { el, prefersReducedMotion } from './ui.js';

const COLORS = ['#ffd54a', '#7fc6e6', '#8fcf5a', '#ff8fa3', '#c79bff', '#fff3b0'];
const rand = (a, b) => a + Math.random() * (b - a);

// A burst of sparkles around a point within `container`.
export function sparkleBurst(container, x, y, count = 16) {
  const reduced = prefersReducedMotion();
  const n = reduced ? 6 : count;
  const layer = el('div', { class: 'fx-layer' });
  container.append(layer);
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n + rand(-0.2, 0.2);
    const dist = rand(40, reduced ? 70 : 130);
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
