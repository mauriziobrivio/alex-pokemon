// Visual type indicators (Phase 9) — TCG-style, color-coded type SYMBOLS that
// replace the old text chips ("Grass", "Poison"). Each badge is a colored disc
// with a simple white glyph, so a pre-reader recognises a type by its look, not
// by reading. Accessibility is preserved: every badge carries an aria-label with
// the type name.
//
// Art path: each badge prefers a dropped-in PNG at assets/ui/type-<type>.png
// (generate the 18-symbol sheet and drop them in by filename — see the report).
// Until the PNGs exist, the inline SVG glyph below is shown — never a broken
// image, never an emoji.

import { el } from './ui.js';

// Canonical type → { color, glyph }. Colors match the existing .type--* palette
// (+ dark, which the old text-chip set lacked). Glyphs are solid white shapes in
// a 24×24 box; the few "punched" details use the disc color via inline style.
const TYPES = {
  normal:   { color: '#a8a77a', glyph: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2.6" style="fill:var(--type-color)"/>' },
  fire:     { color: '#ee8130', glyph: '<path d="M12 3c.5 3 3 4 3 7a3 3 0 0 1-6 0c0-1 .4-1.6 1-2.2.2 1.2.8 1.6.8 1.6C10 6.6 12 5 12 3z"/><path d="M12 4c2.5 2.5 5 4.7 5 9a5 5 0 0 1-10 0c0-2 .8-3.4 2-4.7" fill="none" stroke="currentColor" stroke-width="2"/>' },
  water:    { color: '#6390f0', glyph: '<path d="M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9z"/>' },
  grass:    { color: '#7ac74c', glyph: '<path d="M19 5C9 6 4 11 4 19c8 0 13-5 14-14z"/><path d="M8 17c2.5-4 5.5-6.5 9-8" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.7"/>' },
  electric: { color: '#e4b007', glyph: '<path d="M13 2L5 13h5l-1 9 9-13h-6l1-7z"/>' },
  ice:      { color: '#96d9d6', glyph: '<g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18"/><path d="M3.6 7.5l16.8 9"/><path d="M20.4 7.5l-16.8 9"/></g>' },
  fighting: { color: '#c22e28', glyph: '<path d="M8 7a4 4 0 0 1 8 0v3h1a2 2 0 0 1 0 4h-1a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V9a2 2 0 0 1 2-2z"/>' },
  poison:   { color: '#a33ea1', glyph: '<path d="M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9z"/><circle cx="10.5" cy="12.5" r="1.1" style="fill:var(--type-color)"/><circle cx="13.6" cy="12.5" r="1.1" style="fill:var(--type-color)"/>' },
  ground:   { color: '#cf8c4b', glyph: '<path d="M3 13c3-2.6 6-2.6 9 0s6 2.6 9 0v6H3z"/><path d="M3 10.5c3-2.6 6-2.6 9 0" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.7"/>' },
  flying:   { color: '#7aa9f7', glyph: '<path d="M21 6c-6 0-13 2-18 8 4-1 6-.4 6-.4S6.6 16 3.6 17.4C9.6 18.4 15 15 18 9.6c1.2-2 3-3.6 3-3.6z"/>' },
  psychic:  { color: '#f95587', glyph: '<path d="M12 4.6a7.4 7.4 0 1 0 7.4 7.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="12" r="2.4"/>' },
  bug:      { color: '#a6b91a', glyph: '<circle cx="12" cy="13.5" r="4.8"/><path d="M9.3 7.2L7.4 4.2M14.7 7.2l1.9-3M6.2 13H3.4M20.6 13h-2.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
  rock:     { color: '#b6a136', glyph: '<path d="M6.5 9l4-4 7.5 2 1.5 7-6.5 5L4 16z"/>' },
  ghost:    { color: '#735797', glyph: '<path d="M6 12a6 6 0 0 1 12 0v8l-2-2-2 2-2-2-2 2-2-2z"/><circle cx="10" cy="11.5" r="1.1" style="fill:var(--type-color)"/><circle cx="14" cy="11.5" r="1.1" style="fill:var(--type-color)"/>' },
  dragon:   { color: '#6f35fc', glyph: '<path d="M12 3l4.5 4.5-2 2 4 4-6.5 6.5L5.5 13.5l4-4-2-2z"/>' },
  dark:     { color: '#705746', glyph: '<path d="M16 3.5a9 9 0 1 0 0 17 7.2 7.2 0 0 1 0-17z"/>' },
  steel:    { color: '#b7b7ce', glyph: '<path d="M8 4h8l4 8-4 8H8l-4-8z"/><circle cx="12" cy="12" r="3.1" style="fill:var(--type-color)"/>' },
  fairy:    { color: '#d685ad', glyph: '<path d="M12 3l2.1 5.9L20 11l-5.9 2.1L12 19l-2.1-5.9L4 11l5.9-2.1z"/>' },
};

const label = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// One type badge. Decorative glyph + an aria-label naming the type. If the
// dropped-in PNG loads it covers the glyph; if it's missing it falls away to the
// SVG. Pass extra classes for sizing in context.
export function typeBadge(type, className = '') {
  const t = String(type || '').toLowerCase();
  const def = TYPES[t] || TYPES.normal;
  const wrap = el('span', {
    class: `typebadge ${className}`.trim(),
    'aria-label': label(t),
    style: { '--type-color': def.color },
  });
  wrap.append(el('span', { class: 'typebadge__glyph', 'aria-hidden': 'true',
    html: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden="true">${def.glyph}</svg>` }));
  const art = el('img', { class: 'typebadge__art', src: `assets/ui/type-${t}.png`, alt: '', draggable: false });
  art.addEventListener('error', () => art.remove()); // missing PNG → keep the SVG glyph
  wrap.append(art);
  return wrap;
}

// A row of type badges for a Pokémon's types.
export function typeBadges(types, className = '') {
  const row = el('div', { class: `typebadges ${className}`.trim() });
  (types || []).forEach((t) => row.append(typeBadge(t)));
  return row;
}
