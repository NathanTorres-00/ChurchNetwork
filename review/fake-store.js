// An in-memory ReviewStore with the same rules as the Convex backend, for browser tests.
// Loaded only when a test sets window.__reviewStoreFactory = 'fake'; production never imports it.
import { RATE_MAX, RATE_WINDOW_MS, validateMark } from '../convex/limits.js';

const OWNER_KEY = 'test-owner';
const fail = code => Object.assign(new Error(code), { code });

export function createFakeStore() {
  const marks = [];
  const audio = new Map();          // storageId → object URL
  const subscribers = new Set();     // { page, deviceId, onMarks }
  let nextFailure = null, seq = 0, clock = Date.now();
  let hold = null;                   // the promise the next post waits on, while one is held
  let releaseHold = () => {};

  // What a device sees: no device IDs or storage IDs, and `mine` for its own marks
  const view = (page, deviceId) => marks
    .filter(m => m.page === page)
    .map(({ deviceId: owner, clientId, audio: a, ...m }) => ({
      ...m,
      mine: deviceId != null && owner === deviceId,
      ...(a ? { audio: { mime: a.mime, durationMs: a.durationMs }, audioUrl: audio.get(a.storageId) ?? null } : {}),
    }));
  const notify = () => { for (const s of subscribers) s.onMarks(view(s.page, s.deviceId)); };
  const takeFailure = () => { const code = nextFailure; nextFailure = null; if (code) throw fail(code); };
  const now = () => Math.max(Date.now(), ++clock);

  return {
    marks,
    failNext(code) { nextFailure = code; },
    // The next post waits (like Convex while offline) until release() is called
    holdNext() { hold = new Promise(r => { releaseHold = r; }); },
    release() { releaseHold(); },

    subscribe({ page, deviceId }, onMarks) {
      const s = { page, deviceId, onMarks };
      subscribers.add(s);
      onMarks(view(page, deviceId));
      return () => subscribers.delete(s);
    },

    async create(input) {
      if (hold) { const waiting = hold; hold = null; await waiting; }
      takeFailure();
      const mark = { ...input, author: String(input.author ?? '').trim() };
      if (validateMark(mark)) throw fail('INVALID');
      if (mark.clientId) {
        const existing = marks.find(m => m.clientId === mark.clientId);
        if (existing) return existing._id;
      }
      const since = Date.now() - RATE_WINDOW_MS;
      if (marks.filter(m => m.deviceId === mark.deviceId && m._creationTime > since).length >= RATE_MAX) throw fail('RATE_LIMIT');
      if (mark.audio && (!audio.has(mark.audio.storageId) || marks.some(m => m.audio?.storageId === mark.audio.storageId))) throw fail('INVALID');
      const id = `mark-${++seq}`;
      marks.push({ ...mark, _id: id, _creationTime: now(), resolved: false });
      notify();
      return id;
    },

    async uploadAudio(blob) {
      takeFailure();
      const id = `storage-${++seq}`;
      audio.set(id, URL.createObjectURL(blob));
      return id;
    },

    async setResolved(id, resolved, ownerKey) {
      if (ownerKey !== OWNER_KEY) throw fail('NOT_OWNER');
      const mark = marks.find(m => m._id === id);
      if (!mark) throw fail('NOT_FOUND');
      mark.resolved = resolved;
      notify();
    },

    async remove(id, { ownerKey, deviceId } = {}) {
      const i = marks.findIndex(m => m._id === id);
      if (i < 0) throw fail('NOT_FOUND');
      if (ownerKey !== OWNER_KEY && marks[i].deviceId !== deviceId) throw fail('NOT_OWNER');
      const [mark] = marks.splice(i, 1);
      if (mark.audio) audio.delete(mark.audio.storageId);
      notify();
    },

    async isOwner(ownerKey) { return ownerKey === OWNER_KEY; },

    close() { subscribers.clear(); },
  };
}
