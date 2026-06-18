// Versioned, namespaced localStorage. All game state lives here — no backend,
// no accounts, no tracking. Keys are `dada.v1.*` so Phase 2 can add letter items
// and bond meters under the same scheme without a migration.

const NS = 'dada';
const VERSION = 1;
const keyFor = (k) => `${NS}.v${VERSION}.${k}`;

export function read(k, fallback) {
  try {
    const v = localStorage.getItem(keyFor(k));
    return v == null ? fallback : JSON.parse(v);
  } catch (_) {
    return fallback;
  }
}

export function write(k, value) {
  try {
    localStorage.setItem(keyFor(k), JSON.stringify(value));
    return true;
  } catch (_) {
    return false; // private mode / quota — game still runs, just won't persist
  }
}

export function remove(k) {
  try { localStorage.removeItem(keyFor(k)); } catch (_) {}
}

// Wipe only this app's namespaced keys (used by the grown-up reset).
export function clearAll() {
  try {
    const prefix = `${NS}.v${VERSION}.`;
    Object.keys(localStorage).filter((k) => k.startsWith(prefix)).forEach((k) => localStorage.removeItem(k));
  } catch (_) {}
}
