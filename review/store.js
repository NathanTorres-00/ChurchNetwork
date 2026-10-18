// The ReviewStore backed by Convex. Loads Convex's browser bundle on first use (pinned, like the page's other
// scripts) and talks to the functions in convex/marks.js.

const BUNDLE = 'https://unpkg.com/convex@1.47.0/dist/browser.bundle.js';
// Convex queues requests while offline and never rejects them, so a post that hears nothing back in this
// long is reported as not posted. Posts carry a clientId, so trying again can't create a second mark.
export const POST_TIMEOUT_MS = 15000;
const UPLOAD_TIMEOUT_MS = 60000;

let bundle = null;
function loadBundle() {
  if (globalThis.convex?.ConvexClient) return Promise.resolve(globalThis.convex);
  bundle ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = BUNDLE;
    s.dataset.reviewUi = '';
    s.onload = () => (globalThis.convex?.ConvexClient ? resolve(globalThis.convex) : reject(new Error('Convex did not load')));
    s.onerror = () => { bundle = null; s.remove(); reject(Object.assign(new Error('NETWORK'), { code: 'NETWORK' })); };
    document.head.appendChild(s);
  });
  return bundle;
}

const failure = (code, cause) => Object.assign(new Error(code), { code, cause });
// ConvexError data becomes .code; anything else is treated as a network problem
const asCode = e => (e?.code ? e : failure(typeof e?.data === 'string' ? e.data : 'NETWORK', e));

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(failure('TIMEOUT')), ms); }),
  ]).finally(() => clearTimeout(timer));
}

export async function createConvexStore(url) {
  const { ConvexClient } = await loadBundle();
  const client = new ConvexClient(url);
  const call = async (kind, name, args) => {
    try { return await withTimeout(client[kind](name, args), POST_TIMEOUT_MS); } catch (e) { throw asCode(e); }
  };

  return {
    subscribe({ page, deviceId }, onMarks, onError) {
      return client.onUpdate('marks:list', { page, deviceId }, onMarks, e => onError?.(asCode(e)));
    },

    create: input => call('mutation', 'marks:create', input),

    async uploadAudio(blob, mime, deviceId) {
      const uploadUrl = await call('mutation', 'marks:generateUploadUrl', { deviceId });
      let res;
      try {
        res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': mime }, body: blob, signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS) });
      } catch (e) { throw failure(e?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK', e); }
      if (!res.ok) throw failure('NETWORK');
      const { storageId } = await res.json();
      return storageId;
    },

    setResolved: (id, resolved, ownerKey) => call('mutation', 'marks:setResolved', { id, resolved, ownerKey }),

    remove: (id, { ownerKey, deviceId }) =>
      call('mutation', 'marks:remove', ownerKey ? { id, deviceId, ownerKey } : { id, deviceId }),

    isOwner: ownerKey => call('query', 'marks:isOwner', { ownerKey: ownerKey ?? null }),

    close() { client.close(); },
  };
}
