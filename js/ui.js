// Tiny DOM helpers + the sprite image with a graceful fallback.
//
// Sprites are kept private (not on the public site), so on the live URL the PNGs
// 404. spriteImg() detects that and shows a friendly Poké Ball placeholder, so
// the game stays delightful everywhere; locally (sprites present) it shows the
// real artwork.

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

// A big, forgiving tap button (>=88px target via CSS).
export function bigButton(label, onTap, extraClass = '') {
  return el('button', { class: `btn ${extraClass}`.trim(), type: 'button', onClick: onTap }, label);
}

export const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
