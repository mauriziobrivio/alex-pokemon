// Tiny DOM helpers + the sprite image with a graceful fallback.
//
// Sprites are public (committed), so the live site shows real Pokémon. spriteImg()
// keeps a friendly Poké-Ball fallback as a safety net for any individual sprite
// that fails to load, so the game stays delightful even if one is missing.

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') node.innerHTML = v;
    else if (k in node && k !== 'list') node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); };

// A Pokémon sprite that degrades to a placeholder if the image is missing.
// opts: { silhouette: true } renders an uncaught, darkened silhouette.
// Tolerates a falsy pokemon (renders the placeholder ball) so stale/unknown ids
// can never crash a scene.
export function spriteImg(pokemon, opts = {}) {
  const wrap = el('div', { class: 'sprite' + (opts.silhouette ? ' sprite--silhouette' : '') });
  if (!pokemon || !pokemon.sprite) {
    wrap.classList.add('sprite--missing');
    wrap.append(el('div', { class: 'sprite__ball', 'aria-hidden': 'true' }));
    return wrap;
  }
  const img = el('img', {
    src: pokemon.sprite,
    alt: opts.silhouette ? '' : pokemon.name,
    decoding: 'async',
    loading: 'lazy',
    draggable: false,
  });
  img.addEventListener('error', () => {
    wrap.classList.add('sprite--missing');
    img.remove();
    wrap.append(el('div', { class: 'sprite__ball', 'aria-hidden': 'true' }));
  });
  wrap.append(img);
  return wrap;
}

// A character image (Dada/Mama/Alex) that hides itself if the file is missing,
// rather than showing the browser's broken-image glyph.
export function charImg(src, className, alt = '') {
  const img = el('img', { class: className, src, alt, draggable: false });
  img.addEventListener('error', () => { img.style.display = 'none'; });
  return img;
}

// On-style art (UI icons + reward stickers), replacing system emoji. Each is an
// <img>; if the PNG isn't present yet (art is generated/dropped in by filename),
// it falls back to a tasteful warm rounded chip — never an emoji, never a broken
// image. Decorative by default (aria-hidden); pass alt for a meaningful label.
export function artImg(src, { className = '', alt = '' } = {}) {
  const wrap = el('span', { class: `art ${className}`.trim() });
  if (alt) wrap.setAttribute('aria-label', alt);
  else wrap.setAttribute('aria-hidden', 'true');
  const img = el('img', { src, alt: '', draggable: false });
  img.addEventListener('error', () => { wrap.classList.add('is-fallback'); img.remove(); });
  wrap.append(img);
  return wrap;
}

// A named UI icon: assets/ui/ic-<name>.png (e.g. icon('catch')).
export const icon = (name, className = '') => artImg(`assets/ui/ic-${name}.png`, { className: `ic ${className}`.trim() });

// A reward sticker by its stored asset path (assets/stickers/st-*.png).
export const stickerImg = (src, className = '') => artImg(src, { className: `sticker-img ${className}`.trim() });

// A big, forgiving tap button (>=88px target via CSS).
export function bigButton(label, onTap, extraClass = '') {
  return el('button', { class: `btn ${extraClass}`.trim(), type: 'button', onClick: onTap }, label);
}

export const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
