// Who is commenting, remembered per device: their name, a random device ID, and (for Nathan) the owner key.
// Storage can be blocked (private windows), so every read and write falls back to memory for the session.

const memory = new Map();

function read(key) {
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return v;
  } catch { /* storage blocked */ }
  return memory.has(key) ? memory.get(key) : null;
}

function write(key, value) {
  memory.set(key, value);
  try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
}

export const getName = () => read('cn-review-name');
export const setName = name => write('cn-review-name', name);

export function getDeviceId() {
  let id = read('cn-review-device');
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
    write('cn-review-device', id);
  }
  return id;
}

export const getOwnerKey = () => read('cn-review-owner');

// Reads ?owner=<key> from the address, remembers it, and removes just that parameter from the address bar
export function captureOwnerKey(loc = location, hist = history) {
  const parts = loc.search.replace(/^\?/, '').split('&').filter(Boolean);
  const ownerPart = parts.find(p => p === 'owner' || p.startsWith('owner='));
  if (!ownerPart) return null;
  const key = decodeURIComponent(ownerPart.slice('owner='.length));
  const rest = parts.filter(p => p !== ownerPart).join('&');
  hist.replaceState(hist.state, '', loc.pathname + (rest ? '?' + rest : '') + loc.hash);
  if (!key) return null;
  write('cn-review-owner', key);
  return key;
}
