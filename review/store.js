// The ReviewStore backed by Convex. Loads Convex's browser bundle on first use (pinned, like the page's other
// scripts) and talks to the functions in convex/marks.js.

const BUNDLE = 'https://unpkg.com/convex@1.47.0/dist/browser.bundle.js';

let bundle = null;
function loadBundle() {
  if (globalThis.convex?.ConvexClient) return Promise.resolve(globalThis.convex);
  bundle ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = BUNDLE;
    s.dataset.reviewUi = '';
    s.onload = () => (globalThis.convex?.ConvexClient ? resolve(globalThis.convex) : reject(new Error('Convex did not load')));
    s.onerror = () => { bundle = null; reject(Object.assign(new Error('NETWORK'), { code: 'NETWORK' })); };
    document.head.appendChild(s);
  });
  return bundle;
}

// ConvexError data becomes .code; anything else is treated as a network problem
function asCode(e) {
  const code = typeof e?.data === 'string' ? e.data : 'NETWORK';
  return Object.assign(new Error(code), { code, cause: e });
}

export async function createConvexStore(url) {
  const { ConvexClient } = await loadBundle();
  const client = new ConvexClient(url);
  const call = async (kind, name, args) => {
    try { return await client[kind](name, args); } catch (e) { throw asCode(e); }
  };

  return {
    subscribe(page, onMarks, onError) {
      return client.onUpdate('marks:list', { page }, onMarks, e => onError?.(asCode(e)));
    },

    create: input => call('mutation', 'marks:create', input),

    async uploadAudio(blob, mime, deviceId) {
      const uploadUrl = await call('mutation', 'marks:generateUploadUrl', { deviceId });
      let res;
      try {
        res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': mime }, body: blob });
      } catch (e) { throw asCode(e); }
      if (!res.ok) throw Object.assign(new Error('NETWORK'), { code: 'NETWORK' });
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
